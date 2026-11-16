import 'server-only';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function apiError(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  // Do not log request bodies, credentials, URIs, or personal data.
  console.error('Pricefly API:', error instanceof Error ? error.name : 'UnknownError');
  return json({ error: 'Não foi possível concluir a operação. Tente novamente em instantes.' }, 503);
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expectedOrigin = new URL(process.env.APP_ORIGIN || request.url).origin;
  if (!origin || origin !== expectedOrigin) throw new HttpError(403, 'Origem da solicitação inválida.');
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'Envie dados em JSON.');
  const text = await request.text();
  if (Buffer.byteLength(text) > 20000) throw new HttpError(413, 'Solicitação muito grande.');
  try {
    const data = JSON.parse(text);
    if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error();
    return data;
  } catch { throw new HttpError(400, 'Dados inválidos.'); }
}

export function pagination(request: Request, defaultLimit = 20) {
  const params = new URL(request.url).searchParams;
  const page = Number(params.get('page') || 1);
  const limit = Number(params.get('limit') || defaultLimit);
  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new HttpError(400, 'Paginação inválida.');
  return { page, limit, skip: (page - 1) * limit };
}
