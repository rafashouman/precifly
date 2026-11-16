'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';

type Admin = { id: string; email: string; active: boolean };
export default function AdminAccess({ onSignedOut }: { onSignedOut: (message: string) => void }) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const response = await fetch(`/api/admins?page=${page}`, { cache: 'no-store' });
    const result = await response.json();
    if (response.status === 401) window.dispatchEvent(new Event('pricefly-session-expired'));
    if (!response.ok) throw new Error(result.error || 'Não foi possível carregar os acessos.');
    return result as { admins: Admin[]; pages: number };
  }, [page]);
  useEffect(() => {
    let alive = true;
    load().then(result => { if (alive) { setAdmins(result.admins); setPages(result.pages); } })
      .catch(e => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [load]);

  async function invite(value: string) {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/admins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: value }) });
      const result = await response.json();
      if (response.status === 401) window.dispatchEvent(new Event('pricefly-session-expired'));
      if (!response.ok) throw new Error(result.error || 'Não foi possível enviar o convite.');
      setMessage(result.message); setEmail('');
      const updated = await load(); setAdmins(updated.admins); setPages(updated.pages);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function change(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    if (password !== confirm) { setError('As novas senhas precisam ser iguais.'); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/auth/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, password }) });
      const result = await response.json();
      if (response.status === 401) window.dispatchEvent(new Event('pricefly-session-expired'));
      if (!response.ok) throw new Error(result.error || 'Não foi possível alterar sua senha.');
      setCurrentPassword(''); setPassword(''); setConfirm(''); onSignedOut(result.message);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="pf-admin-access">
    {error && <div className="pf-form-error" role="alert">{error}</div>}
    {message && <div className="pf-admin-notice" role="status">{message}</div>}
    <section className="pf-contact-card"><h2>Convidar administrador</h2><p>O convite dá acesso à gestão de produtos, leads e acessos. A pessoa recebe um e-mail para criar a própria senha.</p>
      <form className="pf-lead-form" onSubmit={event => { event.preventDefault(); void invite(email); }}>
        <label className="pf-field">E-mail do novo administrador<input type="email" autoComplete="off" required maxLength={180} value={email} onChange={e => setEmail(e.target.value)}/></label>
        <button className="pf-btn pf-btn-dark" disabled={busy}>{busy ? 'Enviando...' : 'Enviar convite'}</button>
      </form>
    </section>
    <section className="pf-admin-list"><h2>Acessos ao painel</h2>{loading ? <p role="status">Carregando acessos...</p> : admins.map(admin => <article className="pf-admin-product" key={admin.id}><div><h3>{admin.email}</h3><p>{admin.active ? 'Acesso ativo' : 'Aguardando criação da senha'}</p></div>{!admin.active && <button className="pf-btn pf-btn-dark" disabled={busy} onClick={() => invite(admin.email)}>Reenviar convite</button>}</article>)}</section>
    {pages > 1 && <nav className="pf-admin-pagination" aria-label="Paginação dos acessos"><button className="pf-btn" disabled={busy || loading || page === 1} onClick={() => { setLoading(true); setPage(page - 1); }}>Anterior</button><span>Página {page} de {pages}</span><button className="pf-btn" disabled={busy || loading || page >= pages} onClick={() => { setLoading(true); setPage(page + 1); }}>Próxima</button></nav>}
    <section className="pf-contact-card"><h2>Alterar minha senha</h2><p>Após salvar, suas sessões serão encerradas. Use a nova senha para entrar novamente.</p>
      <form className="pf-lead-form" onSubmit={change}>
        <label className="pf-field">Senha atual<input type="password" autoComplete="current-password" required maxLength={256} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}/></label>
        <label className="pf-field">Nova senha<input type="password" autoComplete="new-password" required minLength={12} maxLength={256} value={password} onChange={e => setPassword(e.target.value)}/></label>
        <label className="pf-field">Confirme a nova senha<input type="password" autoComplete="new-password" required minLength={12} maxLength={256} value={confirm} onChange={e => setConfirm(e.target.value)}/></label>
        <button className="pf-btn pf-btn-dark" disabled={busy}>{busy ? 'Salvando...' : 'Alterar senha'}</button>
      </form>
    </section>
  </div>;
}
