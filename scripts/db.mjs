import { MongoClient } from 'mongodb';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());

export async function connect() {
  if (!process.env.MONGODB_URI) throw new Error('Configure MONGODB_URI em .env.local.');
  const client = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 2, serverSelectionTimeoutMS: 5000 });
  await client.connect();
  return { client, db: client.db() };
}
export async function indexes(db) {
  await db.collection('products').createIndex({ seedKey: 1 }, { unique: true, partialFilterExpression: { seedKey: { $type: 'string' } } });
  await db.collection('products').createIndex({ active: 1, isHighlighted: -1, createdAt: -1, _id: 1 });
  await db.collection('products').createIndex({ isHighlighted: -1, createdAt: -1, _id: 1 });
  await db.collection('leads').createIndex({ dataCriacao: -1, _id: -1 });
  await db.collection('admins').createIndex({ email: 1 }, { unique: true });
  await db.collection('admins').createIndex({ 'passwordReset.tokenHash': 1 }, { unique: true, sparse: true });
  await db.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true });
  await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection('rateLimits').createIndex({ key: 1 }, { unique: true });
  await db.collection('rateLimits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
