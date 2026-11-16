import { HttpError } from './http';

export function adminEmail(value: unknown) {
  if (typeof value !== 'string' || value.length > 180 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) throw new HttpError(400, 'Informe um e-mail válido.');
  return value.trim().toLowerCase();
}
export function newPassword(value: unknown) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 256 || !value.trim()) throw new HttpError(400, 'A senha deve ter entre 12 e 256 caracteres.');
  return value;
}
export function resetToken(value: unknown) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new HttpError(400, 'Link inválido ou expirado. Solicite um novo e-mail.');
  return value;
}
