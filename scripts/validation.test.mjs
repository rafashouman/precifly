import assert from 'node:assert/strict';
import { test } from 'node:test';
import { load } from './test-loader.mjs';

const { productInput, leadInput, leadStatus } = load('src/lib/validation.ts');
const { sameOrigin, pagination, readBody } = load('src/lib/http.ts');
const product = { title: 'Produto de teste', category: 'Pet Shop', price: 'R$ 1.299,90', image: 'https://example.com/image.webp', link: 'https://example.com/produto#affiliate=pricefly' };

test('aceita produto válido, mantém link de afiliado e não inventa selo/avaliação', () => {
  const p = productInput(product);
  assert.equal(p.link, product.link); assert.equal(p.badge, ''); assert.equal(p.rating, ''); assert.equal(p.active, true);
});
test('descarta campos e operadores que não estão na lista permitida', () => {
  const p = productInput({ ...product, $set: { active: false }, seedKey: 'injetado', admin: true });
  assert.equal(p.$set, undefined); assert.equal(p.seedKey, undefined); assert.equal(p.admin, undefined);
});
test('rejeita objetos como valores e categorias desconhecidas', () => {
  assert.throws(() => productInput({ ...product, title: { $ne: null } }));
  assert.throws(() => productInput({ ...product, category: 'Categoria inexistente' }));
});
test('aceita preços numéricos e brasileiros, rejeita valores inválidos', () => {
  for (const price of [1299.9, '1299.90', '1.299', '1299,90', '0']) assert.doesNotThrow(() => productInput({ ...product, price }));
  for (const price of [-1, 'NaN', 'Infinity', 'barato', 'R$', '1,2,3', '']) assert.throws(() => productInput({ ...product, price }));
});
test('bloqueia URLs executáveis', () => {
  for (const field of ['image', 'link', 'partnerLogoUrl']) assert.throws(() => productInput({ ...product, [field]: 'javascript:alert(1)' }));
});
test('visibilidade exige booleano e avaliações respeitam escala', () => {
  assert.throws(() => productInput({ ...product, active: 'false' }));
  assert.throws(() => productInput({ ...product, rating: '8' }));
  assert.equal(productInput({ ...product, active: false }).active, false);
});
test('lead normaliza e-mail e ignora status e datas enviados pelo visitante', () => {
  const p = leadInput({ nome: ' Maria ', email: 'MARIA@EXAMPLE.COM', empresa: 'Loja', site: 'example.com', mensagem: 'Olá', status: 'Concluído', dataCriacao: '2000-01-01' });
  assert.equal(p.nome, 'Maria'); assert.equal(p.email, 'maria@example.com'); assert.equal(p.status, undefined); assert.equal(p.dataCriacao, undefined);
});
test('lead rejeita campos vazios, objetos e textos excessivos', () => {
  const lead = { nome: 'Maria', email: 'maria@example.com', empresa: 'Loja', site: 'example.com', mensagem: 'Olá' };
  assert.throws(() => leadInput({ ...lead, nome: '' })); assert.throws(() => leadInput({ ...lead, email: { $ne: null } })); assert.throws(() => leadInput({ ...lead, mensagem: 'a'.repeat(2501) }));
});
test('status aceita somente os valores definidos', () => {
  assert.equal(leadStatus({ status: 'Em contato' }), 'Em contato');
  assert.throws(() => leadStatus({ status: { $ne: null } })); assert.throws(() => leadStatus({ status: 'Administrador' }));
});
test('escritas verificam origem e recusam origem ausente ou externa', () => {
  assert.doesNotThrow(() => sameOrigin(new Request('https://pricefly.test/api/leads', { headers: { origin: 'https://pricefly.test' } })));
  assert.throws(() => sameOrigin(new Request('https://pricefly.test/api/leads', { headers: { origin: 'https://outro.test' } })));
  assert.throws(() => sameOrigin(new Request('https://pricefly.test/api/leads')));
});
test('paginação limita consultas e rejeita parâmetros fora de faixa', () => {
  assert.deepEqual(pagination(new Request('http://localhost/api?page=2&limit=20')), { page: 2, limit: 20, skip: 20 });
  for (const query of ['page=0', 'page=-1', 'limit=1000', 'page=NaN', 'page=1.5']) assert.throws(() => pagination(new Request('http://localhost/api?' + query)));
});
test('JSON exige objeto, tipo de conteúdo e limite de tamanho', async () => {
  const request = body => new Request('http://localhost/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
  assert.deepEqual(await readBody(request('{"nome":"Maria"}')), { nome: 'Maria' });
  for (const body of ['[]', 'null', '{', JSON.stringify({ x: 'a'.repeat(20001) })]) await assert.rejects(() => readBody(request(body)));
  await assert.rejects(() => readBody(new Request('http://localhost/api', { method: 'POST', body: '{}' })));
});
