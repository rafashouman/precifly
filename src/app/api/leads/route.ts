import { createHash } from 'node:crypto';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import { apiError, HttpError, json, pagination, readBody, sameOrigin } from '@/lib/http';
import { leadInput } from '@/lib/validation';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { page, limit, skip } = pagination(request);
    const collection = (await getDb()).collection('leads');
    const [items, total] = await Promise.all([
      collection.find({}, { projection: { nome: 1, email: 1, empresa: 1, site: 1, mensagem: 1, dataCriacao: 1, status: 1 } }).sort({ dataCriacao: -1, _id: -1 }).skip(skip).limit(limit).toArray(), collection.countDocuments(),
    ]);
    return json({ leads: items.map(({ _id, ...item }) => ({ ...item, id: _id.toString() })), total, page, pages: Math.ceil(total / limit) });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const data = await readBody(request);
    if (data.website) return json({ ok: true }, 201); // Honeypot field.
    const lead = leadInput(data);
    const db = await getDb();
    const now = Date.now();
    const key = createHash('sha256').update(`lead:${lead.email}:${Math.floor(now / 3600000)}`).digest('hex');
    const attempt = await db.collection('rateLimits').findOneAndUpdate({ key }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(now + 7200000) } }, { upsert: true, returnDocument: 'after' });
    if ((attempt?.count ?? 0) > 5) throw new HttpError(429, 'Já recebemos suas solicitações. Tente novamente mais tarde.');
    await db.collection('leads').insertOne({ ...lead, dataCriacao: new Date().toISOString(), status: 'Novo', updatedAt: new Date() });
    return json({ ok: true }, 201);
  } catch (error) { return apiError(error); }
}
