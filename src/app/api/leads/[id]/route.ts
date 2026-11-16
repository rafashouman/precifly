import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import { apiError, HttpError, json, readBody, sameOrigin } from '@/lib/http';
import { leadStatus } from '@/lib/validation';
export const runtime = 'nodejs';
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request); await requireAdmin();
    const { id } = await context.params;
    if (!/^[a-f0-9]{24}$/i.test(id)) throw new HttpError(400, 'Lead inválido.');
    const status = leadStatus(await readBody(request));
    const result = await (await getDb()).collection('leads').updateOne({ _id: new ObjectId(id) }, { $set: { status, updatedAt: new Date() } });
    if (!result.matchedCount) throw new HttpError(404, 'Lead não encontrado.');
    return json({ ok: true });
  } catch (error) { return apiError(error); }
}
