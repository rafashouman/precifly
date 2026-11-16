import 'server-only';
import { MongoClient } from 'mongodb';

const globalMongo = globalThis as typeof globalThis & { priceflyMongo?: Promise<MongoClient> };

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Configure MONGODB_URI no ambiente do servidor.');
  if (!globalMongo.priceflyMongo) {
    const client = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 });
    globalMongo.priceflyMongo = client.connect().catch(error => {
      globalMongo.priceflyMongo = undefined;
      throw error;
    });
  }
  return (await globalMongo.priceflyMongo).db();
}
