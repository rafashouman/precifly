import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';
import { apiError, json, pagination, readBody, sameOrigin } from '@/lib/http';
import { productInput } from '@/lib/validation';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const admin = new URL(request.url).searchParams.get('admin') === '1';
    if (admin) await requireAdmin();
    const { page, limit, skip } = pagination(request, 100);
    const collection = (await getDb()).collection('products');
    const filter = admin ? {} : { active: true };
    const projection = { title: 1, category: 1, price: 1, installments: 1, image: 1, link: 1, rating: 1, numbersRating: 1, badge: 1, partnerName: 1, partnerLogoUrl: 1, customCTA: 1, isHighlighted: 1, active: 1 };
    const [items, total] = await Promise.all([
      collection.find(filter, { projection }).sort({ isHighlighted: -1, createdAt: -1, _id: 1 }).skip(skip).limit(limit).toArray(), collection.countDocuments(filter),
    ]);
    return json({ products: items.map(({ _id, ...item }) => ({ ...item, id: _id.toString() })), total, page, pages: Math.ceil(total / limit) });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request); await requireAdmin();
    const product = productInput(await readBody(request));
    const result = await (await getDb()).collection('products').insertOne({ ...product, createdAt: new Date(), updatedAt: new Date() });
    return json({ id: result.insertedId.toString() }, 201);
  } catch (error) { return apiError(error); }
}
