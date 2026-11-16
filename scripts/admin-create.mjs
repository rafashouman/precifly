import { createHash, randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { readFileSync, writeFileSync } from 'node:fs';
import { connect, indexes } from './db.mjs';
import { parseAdminCredentials } from './admin-credentials.mjs';

// Explicit opt-in: credentials are never read by the web application or on startup.
const fromFile = process.argv.includes('--from-file');
const saved = fromFile ? parseAdminCredentials(readFileSync('.admin-credentials.local', 'utf8')) : null;
const { client, db } = await connect();
try {
  await indexes(db);
  const email = (saved?.email || process.env.ADMIN_EMAIL || 'admin@pricefly.local').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('ADMIN_EMAIL inválido.');
  const exists = await db.collection('admins').findOne({ email });
  if (exists && !process.argv.includes('--reset-password')) throw new Error('Administrador já existe. Use --reset-password somente para redefinir a senha.');
  const password = saved?.password || process.env.ADMIN_PASSWORD || randomBytes(24).toString('base64url');
  if (password.length < 12 || password.length > 256) throw new Error('ADMIN_PASSWORD deve ter entre 12 e 256 caracteres.');
  // Record generated credentials before making changes, so a write failure cannot lose access.
  if (!saved && !process.env.ADMIN_PASSWORD) writeFileSync('.admin-credentials.local', `E-mail: ${email}\nSenha: ${password}\nAcesso: /admin\n`, { mode: 0o600 });
  const salt = randomBytes(24).toString('hex');
  const passwordHash = (await promisify(scrypt)(password, salt, 64)).toString('hex');
  await db.collection('admins').updateOne({ email }, { $set: { email, salt, passwordHash, active: true, updatedAt: new Date() }, $inc: { authVersion: 1 }, $unset: { passwordReset: '' }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  if (exists) await db.collection('sessions').deleteMany({ adminId: exists._id });
  const bucket = createHash('sha256').update(`login:${email}:${Math.floor(Date.now() / 900000)}`).digest('hex');
  await db.collection('rateLimits').deleteOne({ key: bucket });
  console.log(`Administrador configurado. ${saved ? 'Dados do arquivo sincronizados com o MongoDB. Use o e-mail e a senha que você definiu.' : process.env.ADMIN_PASSWORD ? 'Use as credenciais fornecidas no ambiente.' : 'Credenciais salvas em .admin-credentials.local (arquivo ignorado pelo Git).'}`);
} finally { await client.close(); }
