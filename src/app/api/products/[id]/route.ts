import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import { apiError, HttpError, json, readBody, sameOrigin } from '@/lib/http';
import { productInput } from '@/lib/validation';
export const runtime = 'nodejs';
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request); await requireAdmin();
    const { id } = await context.params;
    if (!/^[a-f0-9]{24}$/i.test(id)) throw new HttpError(400, 'Produto inválido.');
    const product = productInput(await readBody(request));
    const result = await (await getDb()).collection('products').updateOne({ _id: new ObjectId(id) }, { $set: { ...product, updatedAt: new Date() } });
    if (!result.matchedCount) throw new HttpError(404, 'Produto não encontrado.');
    return json({ ok: true });
  } catch (error) { return apiError(error); }
}
