import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { load } from './test-loader.mjs';
import { parseAdminCredentials } from './admin-credentials.mjs';
const { newPassword, resetToken, adminEmail } = load('src/lib/password-policy.ts');
const hash = token => createHash('sha256').update(token).digest('hex');
const copy = doc => doc ? { ...doc, ...(doc.passwordReset ? { passwordReset: { ...doc.passwordReset } } : {}) } : null;

function database(initial = {}) {
  const data = { admins: [], sessions: [], rateLimits: [], ...initial };
  function match(doc, filter) {
    return Object.entries(filter).every(([key, value]) => {
      const actual = key.split('.').reduce((o, k) => o?.[k], doc);
      if (value && typeof value === 'object' && !(value instanceof ObjectId) && !(value instanceof Date)) {
        if ('$gt' in value) return actual > value.$gt;
        if ('$ne' in value) return String(actual) !== String(value.$ne);
      }
      return String(actual) === String(value);
    });
  }
  function apply(doc, changes, inserted = false) {
    if (inserted) Object.assign(doc, changes.$setOnInsert || {});
    Object.assign(doc, changes.$set || {});
    for (const [key, value] of Object.entries(changes.$inc || {})) doc[key] = (doc[key] || 0) + value;
    for (const key of Object.keys(changes.$unset || {})) delete doc[key];
  }
  return { data, collection(name) {
    const list = data[name];
    return {
      async findOne(filter) { return copy(list.find(item => match(item, filter))); },
      async updateOne(filter, changes, options) {
        let doc = list.find(item => match(item, filter));
        if (!doc && options?.upsert) { doc = { _id: new ObjectId(), ...filter }; list.push(doc); apply(doc, changes, true); }
        else if (doc) apply(doc, changes);
        return { matchedCount: doc ? 1 : 0 };
      },
      async findOneAndUpdate(filter, changes, options) {
        let doc = list.find(item => match(item, filter));
        if (!doc && options?.upsert) { doc = { _id: new ObjectId(), ...filter }; list.push(doc); apply(doc, changes, true); }
        else if (doc) apply(doc, changes);
        return copy(doc);
      },
      async deleteOne(filter) { const i = list.findIndex(item => match(item, filter)); if (i >= 0) list.splice(i, 1); },
      async deleteMany(filter) { for (let i = list.length - 1; i >= 0; i--) if (match(list[i], filter)) list.splice(i, 1); },
    };
  } };
}
function harness(db, send = async () => {}) {
  const mail = { mailConfiguration() {}, applicationOrigin: () => 'https://pricefly.test', sendPasswordEmail: send };
  return load('src/lib/passwords.ts', { [resolve('src/lib/mongodb.ts')]: { getDb: async () => db }, [resolve('src/lib/mail.ts')]: mail });
}
function admin() { return { _id: new ObjectId(), email: 'admin@example.com', active: true, authVersion: 0 }; }

test('política rejeita e-mails, senhas e tokens inválidos', () => {
  assert.equal(adminEmail(' ADMIN@EXAMPLE.COM '), 'admin@example.com');
  assert.throws(() => adminEmail({ $ne: null }));
  assert.throws(() => newPassword('curta')); assert.throws(() => newPassword(' '.repeat(15)));
  assert.throws(() => resetToken('abc')); assert.throws(() => resetToken({ $ne: null }));
  assert.equal(resetToken('a'.repeat(64)), 'a'.repeat(64));
});
test('o arquivo de credenciais é interpretado sem alterar a senha nem depender de ADMIN_EMAIL', () => {
  assert.deepEqual(parseAdminCredentials('E-mail: USER@example.com\r\nSenha: MinhaSenha:123456!\r\nAcesso: /admin'), { email: 'user@example.com', password: 'MinhaSenha:123456!' });
  assert.throws(() => parseAdminCredentials('E-mail: a@example.com\nSenha: 123'));
  assert.throws(() => parseAdminCredentials('E-mail: a@example.com\nE-mail: b@example.com\nSenha: 123456789012'));
});
test('solicitação guarda apenas hash do token e não troca a senha', async () => {
  const account = admin(); account.passwordHash = 'original';
  const db = database({ admins: [account] }); let delivered;
  const service = harness(db, async (...args) => { delivered = args; });
  await service.requestPasswordReset(account.email);
  assert.equal(delivered[0], account.email); assert.equal(delivered[1].length, 64);
  assert.equal(account.passwordReset.tokenHash, hash(delivered[1])); assert.equal(account.passwordHash, 'original');
  assert.equal(JSON.stringify(account).includes(delivered[1]), false);
});
test('e-mail desconhecido não cria usuário nem envia mensagem', async () => {
  const db = database(); let sent = 0; const service = harness(db, async () => { sent++; });
  await service.requestPasswordReset('desconhecido@example.com'); assert.equal(sent, 0); assert.equal(db.data.admins.length, 0);
});
test('reset é de uso único, inclusive em duas requisições concorrentes', async () => {
  const account = admin(); const token = 'b'.repeat(64);
  account.passwordReset = { tokenHash: hash(token), expiresAt: new Date(Date.now() + 60000) };
  const db = database({ admins: [account], sessions: [{ adminId: account._id, authVersion: 0 }] }); const service = harness(db);
  const results = await Promise.allSettled([service.resetPassword(token, 'SenhaNovaSegura123'), service.resetPassword(token, 'OutraSenhaSegura456')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(account.passwordReset, undefined);
  assert.equal(account.authVersion, 1); assert.equal(db.data.sessions.length, 0);
  assert.equal(await service.verifyPassword('SenhaNovaSegura123', account) || await service.verifyPassword('OutraSenhaSegura456', account), true);
});
test('link expirado não altera o administrador', async () => {
  const account = admin(); const token = 'c'.repeat(64); account.passwordHash = 'original';
  account.passwordReset = { tokenHash: hash(token), expiresAt: new Date(Date.now() - 60000) };
  const service = harness(database({ admins: [account] }));
  await assert.rejects(() => service.resetPassword(token, 'SenhaNovaSegura123')); assert.equal(account.passwordHash, 'original'); assert.equal(account.authVersion, 0);
});
test('falha de envio invalida o token recém-criado', async () => {
  const account = admin(); const db = database({ admins: [account] });
  const service = harness(db, async () => { throw new Error('SMTP indisponível'); });
  await service.requestPasswordReset(account.email); assert.equal(account.passwordReset, undefined);
});
test('convite cria conta pendente e só ativa após definir a senha', async () => {
  const db = database(); let token; const service = harness(db, async (_email, value) => { token = value; });
  await service.inviteAdmin('nova@example.com', new ObjectId().toString());
  const account = db.data.admins[0]; assert.equal(account.active, false); assert.equal(account.passwordHash, undefined);
  await service.resetPassword(token, 'SenhaNovaSegura123'); assert.equal(account.active, true); assert.equal(await service.verifyPassword('SenhaNovaSegura123', account), true);
});
test('alterar senha exige a senha atual e revoga as sessões anteriores', async () => {
  const account = admin(); const db = database({ admins: [account], sessions: [{ adminId: account._id, authVersion: 0 }] }); const service = harness(db);
  Object.assign(account, await service.passwordHash('SenhaAtualSegura123'));
  await assert.rejects(() => service.changePassword(account._id.toString(), 'senha-errada', 'NovaSenhaSegura456'));
  assert.equal(account.authVersion, 0);
  await service.changePassword(account._id.toString(), 'SenhaAtualSegura123', 'NovaSenhaSegura456');
  assert.equal(account.authVersion, 1); assert.equal(db.data.sessions.length, 0); assert.equal(await service.verifyPassword('NovaSenhaSegura456', account), true);
});
test('sessão com versão antiga é recusada mesmo antes da limpeza do banco', async () => {
  const account = { ...admin(), authVersion: 1 }; const token = 'd'.repeat(64);
  const db = database({ admins: [account], sessions: [{ tokenHash: hash(token), adminId: account._id, authVersion: 0, expiresAt: new Date(Date.now() + 60000) }] });
  const service = load('src/lib/auth.ts', { [resolve('src/lib/mongodb.ts')]: { getDb: async () => db }, 'next/headers': { cookies: async () => ({ get: () => ({ value: token }) }) } });
  await assert.rejects(() => service.requireAdmin(), error => error.status === 401);
});
test('Hostinger em 587 usa STARTTLS obrigatório, em 465 usa TLS implícito', () => {
  const keys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM', 'APP_ORIGIN'];
  const old = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  try {
    Object.assign(process.env, { SMTP_HOST: 'smtp.hostinger.com', SMTP_PORT: '587', SMTP_USER: 'smtp@example.com', SMTP_PASSWORD: 'smtp-test-password', SMTP_FROM: 'Pricefly <smtp@example.com>', APP_ORIGIN: 'https://pricefly.test' });
    const mail = load('src/lib/mail.ts'); const settings = mail.mailConfiguration();
    assert.equal(settings.secure, false); assert.equal(settings.requireTLS, true); assert.equal(settings.tls.minVersion, 'TLSv1.2');
    process.env.SMTP_PORT = '465'; assert.equal(mail.mailConfiguration().secure, true);
    delete process.env.SMTP_PASSWORD; assert.throws(() => mail.mailConfiguration());
  } finally { for (const [key, value] of Object.entries(old)) if (value === undefined) delete process.env[key]; else process.env[key] = value; }
});
test('criar e listar administradores exige sessão, inclusive pela API', async () => {
  const http = load('src/lib/http.ts');
  const routes = load('src/app/api/admins/route.ts', {
    '@/lib/auth': { requireAdmin: async () => { throw new http.HttpError(401, 'Entre no painel.'); } },
    '@/lib/http': http,
    '@/lib/mongodb': { getDb: async () => { throw new Error('Não deve acessar o banco sem autenticação'); } },
    '@/lib/password-policy': { adminEmail },
    '@/lib/passwords': { inviteAdmin: async () => { throw new Error('Não deve enviar e-mail sem autenticação'); } },
  });
  assert.equal((await routes.GET(new Request('https://pricefly.test/api/admins'))).status, 401);
  const request = new Request('https://pricefly.test/api/admins', { method: 'POST', headers: { origin: 'https://pricefly.test', 'content-type': 'application/json' }, body: JSON.stringify({ email: 'nova@example.com' }) });
  assert.equal((await routes.POST(request)).status, 401);
});
test('e-mail usa origem configurada e mantém token fora da query HTTP', async () => {
  const keys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM', 'APP_ORIGIN'];
  const old = Object.fromEntries(keys.map(k => [k, process.env[k]])); let sent;
  try {
    Object.assign(process.env, { SMTP_HOST: 'smtp.hostinger.com', SMTP_PORT: '587', SMTP_USER: 'smtp@example.com', SMTP_PASSWORD: 'smtp-test-password', SMTP_FROM: 'Pricefly <smtp@example.com>', APP_ORIGIN: 'https://pricefly.test' });
    const mail = load('src/lib/mail.ts', { nodemailer: { createTransport: () => ({ sendMail: async value => { sent = value; return { accepted: ['admin@example.com'] }; } }) } });
    const token = 'e'.repeat(64); await mail.sendPasswordEmail('admin@example.com', token, false);
    assert.equal(sent.to, 'admin@example.com'); assert.ok(sent.text.includes('https://pricefly.test/admin/redefinir-senha#token=' + token));
    assert.equal(sent.text.includes('?token='), false);
  } finally { for (const [key, value] of Object.entries(old)) if (value === undefined) delete process.env[key]; else process.env[key] = value; }
});
