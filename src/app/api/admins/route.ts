import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { apiError, json, pagination, readBody, sameOrigin } from '@/lib/http';
import { adminEmail } from '@/lib/password-policy';
import { inviteAdmin } from '@/lib/passwords';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { page, limit, skip } = pagination(request);
    const collection = (await getDb()).collection('admins');
    const [admins, total] = await Promise.all([
      collection.find({}, { projection: { email: 1, active: 1, invitedAt: 1 } }).sort({ email: 1 }).skip(skip).limit(limit).toArray(), collection.countDocuments(),
    ]);
    return json({ admins: admins.map(a => ({ id: a._id.toString(), email: a.email, active: Boolean(a.active) })), total, page, pages: Math.ceil(total / limit) });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const admin = await requireAdmin();
    const data = await readBody(request);
    await inviteAdmin(adminEmail(data.email), admin.id);
    return json({ message: 'Convite enviado. A pessoa receberá um link para criar sua própria senha.' }, 201);
  } catch (error) { return apiError(error); }
}
