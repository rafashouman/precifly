import 'server-only';
import nodemailer from 'nodemailer';
import { HttpError } from './http';

export function mailConfiguration() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  const port = Number(process.env.SMTP_PORT || 587);
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) throw new HttpError(503, 'O envio de e-mails ainda não foi configurado. Entre em contato com o administrador.');
  if (![465, 587].includes(port) || /[\r\n]/.test(SMTP_FROM)) throw new HttpError(503, 'Configuração de envio de e-mails inválida.');
  return {
    host: SMTP_HOST, port, secure: port === 465, requireTLS: true,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    tls: { minVersion: 'TLSv1.2' as const },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    disableFileAccess: true, disableUrlAccess: true,
  };
}

export function applicationOrigin() {
  const value = process.env.APP_ORIGIN || (process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : '');
  let url: URL;
  try { url = new URL(value); } catch { throw new HttpError(503, 'Configure APP_ORIGIN com o endereço público do site.'); }
  if (url.username || url.password || !['http:', 'https:'].includes(url.protocol) || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) throw new HttpError(503, 'Configure APP_ORIGIN com um endereço HTTPS válido.');
  return url.origin;
}

export async function sendPasswordEmail(email: string, token: string, invitation: boolean) {
  const transport = nodemailer.createTransport(mailConfiguration());
  // Use a configured origin, never the untrusted Host header. The token stays in the
  // fragment until the user submits the form, so it is absent from HTTP URL logs.
  const url = `${applicationOrigin()}/admin/redefinir-senha#token=${token}`;
  const title = invitation ? 'Crie sua senha de acesso à Pricefly' : 'Redefina sua senha da Pricefly';
  const intro = invitation ? 'Você recebeu um convite para administrar a Pricefly.' : 'Recebemos uma solicitação para redefinir sua senha de acesso à Pricefly.';
  const result = await transport.sendMail({
    from: process.env.SMTP_FROM, to: email, subject: title,
    text: `${intro}\n\n${title}:\n${url}\n\nEste link é pessoal, pode ser usado uma única vez e expira em 30 minutos.\nSe você não esperava este e-mail, ignore esta mensagem. Sua senha permanece a mesma.`,
    html: `<div style="font-family:Arial,sans-serif;color:#06284f;max-width:560px;margin:auto;padding:32px"><h1 style="font-size:26px">${title}</h1><p>${intro}</p><p style="margin:32px 0"><a href="${url}" style="display:inline-block;background:#06284f;color:#fff;padding:15px 22px;border-radius:8px;text-decoration:none">${invitation ? 'Criar minha senha' : 'Redefinir minha senha'}</a></p><p>O link é pessoal, de uso único e expira em <strong>30 minutos</strong>.</p><p>Se você não esperava este e-mail, ignore esta mensagem. Sua senha permanece a mesma.</p><small>Pricefly · Administração</small></div>`,
  });
  if (!result.accepted?.length) throw new Error('EmailNotAccepted');
}
