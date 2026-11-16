import { login, logout, requireAdmin } from '@/lib/auth';
import { apiError, HttpError, json, readBody, sameOrigin } from '@/lib/http';
export const runtime = 'nodejs';
export async function GET() {
  try { return json({ user: await requireAdmin() }); } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const data = await readBody(request);
    if (typeof data.email !== 'string' || typeof data.password !== 'string' || data.email.length > 180 || data.password.length > 256) throw new HttpError(400, 'Credenciais inválidas.');
    return json({ user: await login(data.email.trim().toLowerCase(), data.password) });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request) {
  try { sameOrigin(request); await logout(); return json({ ok: true }); } catch (error) { return apiError(error); }
}
