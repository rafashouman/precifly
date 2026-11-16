import { apiError, json, readBody, sameOrigin } from '@/lib/http';
import { newPassword, resetToken } from '@/lib/password-policy';
import { resetPassword } from '@/lib/passwords';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const data = await readBody(request);
    await resetPassword(resetToken(data.token), newPassword(data.password));
    return json({ message: 'Senha definida com sucesso. Entre com sua nova senha.' });
  } catch (error) { return apiError(error); }
}
