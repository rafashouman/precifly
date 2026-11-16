// This file contains parsing only; importing it does not read credentials or connect.
export function parseAdminCredentials(content) {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/);
  const emailLine = lines.filter(line => /^\s*(?:E-mail|Email)\s*:/i.test(line));
  const passwordLine = lines.filter(line => /^\s*(?:Senha|Password)\s*:/i.test(line));
  if (emailLine.length !== 1 || passwordLine.length !== 1) throw new Error('O arquivo deve conter uma linha E-mail: e uma linha Senha:.');
  const email = emailLine[0].replace(/^\s*(?:E-mail|Email)\s*:\s*/i, '').trim().toLowerCase();
  const password = passwordLine[0].replace(/^\s*(?:Senha|Password)\s*:[ \t]*/i, '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) throw new Error('O e-mail no arquivo de credenciais é inválido.');
  if (password.length < 12 || password.length > 256 || !password.trim()) throw new Error('A senha no arquivo deve ter entre 12 e 256 caracteres.');
  return { email, password };
}
