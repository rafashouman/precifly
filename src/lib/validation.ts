import { HttpError } from './http';
import { leadStatuses, productCategories } from './types';

function text(data: Record<string, unknown>, key: string, max: number, required = false) {
  const value = data[key] ?? '';
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new HttpError(400, `Campo inválido: ${key}.`);
  return value.trim();
}
function url(value: string, key: string, required = false) {
  if (!value && !required) return '';
  try {
    const parsed = new URL(value);
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error();
    return parsed.toString();
  } catch { throw new HttpError(400, `Informe um endereço http ou https válido em ${key}.`); }
}
export function productInput(data: Record<string, unknown>) {
  const category = text(data, 'category', 100, true);
  if (!productCategories.some(item => item === category)) throw new HttpError(400, 'Categoria inválida.');
  const price = typeof data.price === 'number' ? String(data.price) : text(data, 'price', 40, true);
  const numeric = price.replace(/^R\$\s*/, '').trim();
  if (!/^(?:\d+(?:[.,]\d{1,2})?|\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)$/.test(numeric)) throw new HttpError(400, 'Informe um preço válido.');
  for (const key of ['isHighlighted', 'active']) if (data[key] !== undefined && typeof data[key] !== 'boolean') throw new HttpError(400, `Campo inválido: ${key}.`);
  const rating = text(data, 'rating', 10);
  if (rating && (!/^\d(?:[.,]\d{1,2})?$/.test(rating) || Number(rating.replace(',', '.')) > 5)) throw new HttpError(400, 'Avaliação deve estar entre 0 e 5.');
  return {
    title: text(data, 'title', 250, true), category, price,
    installments: text(data, 'installments', 250),
    image: url(text(data, 'image', 2000, true), 'imagem', true),
    link: url(text(data, 'link', 5000, true), 'link de compra', true),
    partnerName: text(data, 'partnerName', 140),
    partnerLogoUrl: url(text(data, 'partnerLogoUrl', 2000), 'logo do parceiro'),
    customCTA: text(data, 'customCTA', 80), badge: text(data, 'badge', 80),
    rating, numbersRating: text(data, 'numbersRating', 40),
    isHighlighted: data.isHighlighted === true, active: data.active !== false,
  };
}
export function leadInput(data: Record<string, unknown>) {
  const email = text(data, 'email', 180, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Informe um e-mail válido.');
  return {
    nome: text(data, 'nome', 100, true), email, empresa: text(data, 'empresa', 140, true),
    site: text(data, 'site', 500, true), mensagem: text(data, 'mensagem', 2500, true),
  };
}
export function leadStatus(data: Record<string, unknown>) {
  const status = data.status;
  if (!leadStatuses.some(item => item === status)) throw new HttpError(400, 'Status inválido.');
  return status as typeof leadStatuses[number];
}
