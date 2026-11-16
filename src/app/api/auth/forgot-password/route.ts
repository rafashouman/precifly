import { apiError, json, readBody, sameOrigin } from '@/lib/http';
import { adminEmail } from '@/lib/password-policy';
import { requestPasswordReset } from '@/lib/passwords';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const data = await readBody(request);
    await requestPasswordReset(adminEmail(data.email));
    return json({ message: 'Se este e-mail tiver acesso à Pricefly, você receberá um link para definir uma nova senha.' });
  } catch (error) { return apiError(error); }
}
