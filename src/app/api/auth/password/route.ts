import { requireAdmin, logout } from '@/lib/auth';
import { apiError, HttpError, json, readBody, sameOrigin } from '@/lib/http';
import { newPassword } from '@/lib/password-policy';
import { changePassword } from '@/lib/passwords';
export const runtime = 'nodejs';
export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    const admin = await requireAdmin();
    const data = await readBody(request);
    if (typeof data.currentPassword !== 'string' || !data.currentPassword || data.currentPassword.length > 256) throw new HttpError(400, 'Informe sua senha atual.');
    await changePassword(admin.id, data.currentPassword, newPassword(data.password));
    await logout();
    return json({ message: 'Senha alterada. Entre novamente para continuar.' });
  } catch (error) { return apiError(error); }
}
