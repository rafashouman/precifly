'use client';

import { useState, useSyncExternalStore, type FormEvent } from 'react';
import Link from 'next/link';
import { Brand } from '@/app/components/SiteHeader';
import './admin.css';

const subscribe = (notify: () => void) => { window.addEventListener('hashchange', notify); return () => window.removeEventListener('hashchange', notify); };
const snapshot = () => new URLSearchParams(window.location.hash.slice(1)).get('token') || '';

export default function PasswordRecovery({ reset = false }: { reset?: boolean }) {
  const token = useSyncExternalStore(subscribe, snapshot, () => '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    if (reset && password !== confirm) { setError('As senhas precisam ser iguais.'); return; }
    if (reset && !/^[a-f0-9]{64}$/.test(token)) { setError('Link inválido ou expirado. Solicite um novo e-mail.'); return; }
    setBusy(true);
    try {
      const response = await fetch(reset ? '/api/auth/reset-password' : '/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reset ? { token, password } : { email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a solicitação.');
      setMessage(result.message); setPassword(''); setConfirm('');
      if (reset) window.history.replaceState(null, '', window.location.pathname);
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível conectar. Tente novamente.'); }
    finally { setBusy(false); }
  }

  return <div className="pf-site pf-admin">
    <header className="pf-admin-header"><Brand/><Link href="/admin">Voltar ao login</Link></header>
    <main className="pf-admin-login"><section className="pf-contact-card">
      <span className="pf-eyebrow">ACESSO À PRICEFLY</span>
      <h1>{reset ? 'Defina sua senha.' : 'Recupere seu acesso.'}</h1>
      <p>{reset ? 'Crie uma senha com pelo menos 12 caracteres para entrar no painel.' : 'Informe o e-mail do seu acesso. Enviaremos as instruções para criar uma nova senha.'}</p>
      {error && <div className="pf-form-error" role="alert">{error}</div>}
      {message ? <div role="status" className="pf-admin-notice"><p>{message}</p><Link href="/admin" className="pf-btn pf-btn-dark">Ir para o login</Link></div> : <form onSubmit={submit} className="pf-lead-form">
        {reset ? <>
          <label className="pf-field">Nova senha<input type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={password} onChange={e => setPassword(e.target.value)}/></label>
          <label className="pf-field">Confirme a nova senha<input type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={confirm} onChange={e => setConfirm(e.target.value)}/></label>
          <button disabled={busy} className="pf-btn pf-btn-dark">{busy ? 'Salvando...' : 'Salvar nova senha'}</button>
          <Link href="/admin/recuperar-senha" className="pf-admin-text-link">Preciso de um novo link</Link>
        </> : <>
          <label className="pf-field">E-mail de acesso<input type="email" autoComplete="email" maxLength={180} required value={email} onChange={e => setEmail(e.target.value)}/></label>
          <button disabled={busy} className="pf-btn pf-btn-dark">{busy ? 'Solicitando...' : 'Enviar link de recuperação'}</button>
        </>}
      </form>}
    </section></main>
  </div>;
}
