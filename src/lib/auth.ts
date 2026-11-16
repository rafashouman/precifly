import 'server-only';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from './mongodb';
import { HttpError } from './http';

const derive = promisify(scrypt);
const cookieName = 'pricefly_session';
const sessionSeconds = 60 * 60 * 12;
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };

export async function requireAdmin() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new HttpError(401, 'Entre no painel para continuar.');
  const db = await getDb();
  const session = await db.collection('sessions').findOne({ tokenHash: hash(token), expiresAt: { $gt: new Date() } });
  if (!session) throw new HttpError(401, 'Sua sessão expirou. Entre novamente.');
  const admin = await db.collection('admins').findOne({ _id: new ObjectId(String(session.adminId)), active: true }, { projection: { email: 1, authVersion: 1 } });
  if (!admin) throw new HttpError(401, 'Acesso não autorizado.');
  if ((admin.authVersion ?? 0) !== (session.authVersion ?? 0)) throw new HttpError(401, 'Sua senha foi alterada. Entre novamente.');
  return { id: admin._id.toString(), email: admin.email as string };
}

export async function login(email: string, password: string) {
  const db = await getDb();
  // Shared database limit also works across processes. A TTL index removes old windows.
  const now = Date.now();
  const bucket = createHash('sha256').update(`login:${email}:${Math.floor(now / 900000)}`).digest('hex');
  const attempt = await db.collection('rateLimits').findOneAndUpdate({ key: bucket }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(now + 1800000) } }, { upsert: true, returnDocument: 'after' });
  if ((attempt?.count ?? 0) > 10) throw new HttpError(429, 'Muitas tentativas. Aguarde 15 minutos para tentar novamente.');
  const admin = await db.collection('admins').findOne({ email, active: true });
  const salt = typeof admin?.salt === 'string' ? admin.salt : 'pricefly-invalid-account';
  const actual = await derive(password, salt, 64) as Buffer;
  const expected = Buffer.from(typeof admin?.passwordHash === 'string' ? admin.passwordHash : '00'.repeat(64), 'hex');
  if (!admin || expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new HttpError(401, 'E-mail ou senha incorretos.');
  const token = randomBytes(32).toString('hex');
  await db.collection('sessions').insertOne({ tokenHash: hash(token), adminId: admin._id, authVersion: admin.authVersion ?? 0, expiresAt: new Date(now + sessionSeconds * 1000) });
  (await cookies()).set(cookieName, token, { ...cookieOptions, maxAge: sessionSeconds });
  return { email };
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) await (await getDb()).collection('sessions').deleteOne({ tokenHash: hash(token) });
  jar.set(cookieName, '', { ...cookieOptions, maxAge: 0 });
}
