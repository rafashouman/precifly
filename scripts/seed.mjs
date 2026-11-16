import { createHash } from 'node:crypto';
import { productsData } from '../data/products.js';
import { connect, indexes } from './db.mjs';

const { client, db } = await connect();
try {
  await indexes(db);
  const records = productsData.flat(Infinity);
  let inserted = 0;
  for (const [position, product] of records.entries()) {
    const url = new URL(product.link);
    if (!['https:', 'http:'].includes(url.protocol) || !product.title || !product.image) throw new Error(`Produto inválido na posição ${position}.`);
    // Identity ignores tracking fragments; the saved affiliate link remains intact.
    const seedKey = createHash('sha256').update(url.origin + url.pathname).digest('hex');
    const result = await db.collection('products').updateOne({ seedKey }, {
      $setOnInsert: { ...product, category: product.category === '...' ? 'Pet Shop' : product.category, seedKey, active: true, isHighlighted: false, createdAt: new Date(), updatedAt: new Date() },
    }, { upsert: true });
    inserted += result.upsertedCount;
  }
  console.log(`Cadastro inicial: ${records.length} produtos processados, ${inserted} novos, ${records.length - inserted} já existentes. Dados anteriores preservados.`);
} finally { await client.close(); }
