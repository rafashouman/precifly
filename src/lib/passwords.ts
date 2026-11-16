import 'server-only';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { ObjectId, type Document } from 'mongodb';
import { getDb } from './mongodb';
import { HttpError } from './http';
import { applicationOrigin, mailConfiguration, sendPasswordEmail } from './mail';

const derive = promisify(scrypt);
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export async function passwordHash(password: string) {
  const salt = randomBytes(24).toString('hex');
  return { salt, passwordHash: (await derive(password, salt, 64) as Buffer).toString('hex') };
}
export async function verifyPassword(password: string, admin: Document) {
  if (typeof admin.passwordHash !== 'string' || typeof admin.salt !== 'string') return false;
  const actual = await derive(password, admin.salt, 64) as Buffer;
  const expected = Buffer.from(admin.passwordHash, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function limit(key: string, max: number, windowMs = 900000) {
  const now = Date.now();
  const bucket = tokenHash(`${key}:${Math.floor(now / windowMs)}`);
  const attempt = await (await getDb()).collection('rateLimits').findOneAndUpdate({ key: bucket }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(now + windowMs * 2) } }, { upsert: true, returnDocument: 'after' });
  if ((attempt?.count ?? 0) > max) throw new HttpError(429, 'Muitas solicitações. Aguarde 15 minutos e tente novamente.');
}

async function sendLink(admin: Document, invitation: boolean) {
  const db = await getDb();
  const token = randomBytes(32).toString('hex');
  const hashed = tokenHash(token);
  await db.collection('admins').updateOne({ _id: admin._id }, { $set: { passwordReset: { tokenHash: hashed, expiresAt: new Date(Date.now() + 30 * 60000) } } });
  try { await sendPasswordEmail(admin.email, token, invitation); }
  catch (error) {
    await db.collection('admins').updateOne({ _id: admin._id, 'passwordReset.tokenHash': hashed }, { $unset: { passwordReset: '' } });
    throw error;
  }
}

export async function requestPasswordReset(email: string) {
  mailConfiguration(); applicationOrigin();
  await limit(`reset:${email}`, 3);
  const admin = await (await getDb()).collection('admins').findOne({ email });
  if (!admin || (!admin.active && !admin.invitedAt)) return;
  try { await sendLink(admin, !admin.active); }
  catch (error) {
    // Keep the same public response for known and unknown accounts.
    console.error('Falha no envio da recuperação:', error instanceof Error ? error.name : 'MailError');
  }
}

export async function inviteAdmin(email: string, inviterId: string) {
  mailConfiguration(); applicationOrigin();
  await limit(`invite:${inviterId}`, 10);
  await limit(`invite-email:${email}`, 3);
  const db = await getDb();
  // Create pending accounts atomically; a concurrent invitation cannot create duplicates.
  await db.collection('admins').updateOne({ email }, { $setOnInsert: { email, active: false, invitedAt: new Date(), invitedBy: new ObjectId(inviterId), createdAt: new Date(), authVersion: 0 } }, { upsert: true });
  const admin = await db.collection('admins').findOne({ email });
  if (!admin || admin.active) throw new HttpError(409, 'Este e-mail já tem acesso. Use a recuperação de senha na tela de entrada.');
  try { await sendLink(admin, true); }
  catch { throw new HttpError(503, 'Não foi possível enviar o convite. Confira o SMTP e tente reenviar.'); }
}

async function revokeOldSessions(admin: Document) {
  const db = await getDb();
  await db.collection('sessions').deleteMany({ adminId: admin._id, authVersion: { $ne: admin.authVersion } });
  const loginKey = tokenHash(`login:${admin.email}:${Math.floor(Date.now() / 900000)}`);
  await db.collection('rateLimits').deleteOne({ key: loginKey });
}

export async function resetPassword(token: string, password: string) {
  const db = await getDb();
  // Hashing precedes the atomic update; the token is consumed together with the new
  // password/version. Concurrent submissions cannot use the same link twice.
  const credentials = await passwordHash(password);
  const admin = await db.collection('admins').findOneAndUpdate({ 'passwordReset.tokenHash': tokenHash(token), 'passwordReset.expiresAt': { $gt: new Date() } }, {
    $set: { ...credentials, active: true, updatedAt: new Date() }, $inc: { authVersion: 1 }, $unset: { passwordReset: '' },
  }, { returnDocument: 'after' });
  if (!admin) throw new HttpError(400, 'Link inválido, expirado ou já utilizado. Solicite um novo e-mail.');
  await revokeOldSessions(admin);
}

export async function changePassword(adminId: string, currentPassword: string, password: string) {
  await limit(`change:${adminId}`, 10);
  const db = await getDb();
  const admin = await db.collection('admins').findOne({ _id: new ObjectId(adminId), active: true });
  if (!admin || !await verifyPassword(currentPassword, admin)) throw new HttpError(400, 'A senha atual está incorreta.');
  const credentials = await passwordHash(password);
  const updated = await db.collection('admins').findOneAndUpdate({ _id: admin._id, passwordHash: admin.passwordHash }, {
    $set: { ...credentials, updatedAt: new Date() }, $inc: { authVersion: 1 }, $unset: { passwordReset: '' },
  }, { returnDocument: 'after' });
  if (!updated) throw new HttpError(409, 'A senha foi alterada em outra sessão. Entre novamente.');
  await revokeOldSessions(updated);
}
