'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Brand } from '@/app/components/SiteHeader';
import { productCategories, leadStatuses, type Product, type Lead } from '@/lib/types';
import { formattedPrice, validOfferUrl } from '@/app/components/ProductCard';
import AdminAccess from './AdminAccess';
import './admin.css';

type User = { email: string };
const blankProduct = {
  title: '', category: productCategories[0] as string, price: '', installments: '', image: '', link: '',
  partnerName: '', partnerLogoUrl: '', customCTA: '', badge: '', rating: '', numbersRating: '', isHighlighted: false, active: true,
};
const blankLead = { nome: '', email: '', empresa: '', site: '', mensagem: '' };
type ProductForm = typeof blankProduct;

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...options?.headers } });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('pricefly-session-expired'));
    throw new Error(data.error || 'Não foi possível concluir a operação.');
  }
  return data;
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<'produtos' | 'leads' | 'acessos'>('produtos');
  const [products, setProducts] = useState<Product[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [productPage, setProductPage] = useState(1);
  const [leadPage, setLeadPage] = useState(1);
  const [productPages, setProductPages] = useState(0);
  const [leadPages, setLeadPages] = useState(0);
  const [productTotal, setProductTotal] = useState(0);
  const [leadTotal, setLeadTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [form, setForm] = useState<ProductForm>(blankProduct);
  const [editing, setEditing] = useState<string | null>(null);
  const [leadForm, setLeadForm] = useState(blankLead);
  const [showLeadForm, setShowLeadForm] = useState(false);

  useEffect(() => {
    let alive = true;
    const expire = () => { setUser(null); setProducts([]); setLeads([]); };
    window.addEventListener('pricefly-session-expired', expire);
    fetch('/api/auth', { cache: 'no-store' }).then(async response => {
      if (response.status === 401) return;
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (alive) setUser(data.user);
    }).catch(() => { if (alive) setError('Não foi possível verificar o acesso. Confira a conexão com o servidor.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; window.removeEventListener('pricefly-session-expired', expire); };
  }, []);

  const fetchLists = useCallback(() => Promise.all([
    api<{products: Product[]; total: number; pages: number}>(`/api/products?admin=1&limit=20&page=${productPage}`),
    api<{leads: Lead[]; total: number; pages: number}>(`/api/leads?limit=20&page=${leadPage}`),
  ]), [productPage, leadPage]);

  const applyLists = useCallback(([p, l]: Awaited<ReturnType<typeof fetchLists>>) => {
    setProducts(p.products); setProductTotal(p.total); setProductPages(p.pages);
    setLeads(l.leads); setLeadTotal(l.total); setLeadPages(l.pages);
  }, []);

  async function loadLists() {
    try { applyLists(await fetchLists()); }
    catch (e) { setError((e as Error).message); }
    finally { setListLoading(false); }
  }

  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetchLists().then(result => { if (alive) applyLists(result); })
      .catch(e => { if (alive) setError((e as Error).message); })
      .finally(() => { if (alive) setListLoading(false); });
    return () => { alive = false; };
  }, [user, fetchLists, applyLists]);

  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await api<{ user: User }>('/api/auth', { method: 'POST', body: JSON.stringify({ email, password }) });
      setUser(result.user); setPassword('');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try { await api('/api/auth', { method: 'DELETE' }); setUser(null); setProducts([]); setLeads([]); setForm(blankProduct); setEditing(null); setLeadForm(blankLead); setNotice(''); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function saveProduct(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await api(editing ? `/api/products/${editing}` : '/api/products', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(form) });
      setNotice(editing ? 'Produto atualizado na vitrine.' : 'Produto cadastrado na vitrine.');
      setForm(blankProduct); setEditing(null); await loadLists();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  function editProduct(product: Product) {
    setForm(Object.fromEntries(Object.entries(blankProduct).map(([key, fallback]) => [key, product[key as keyof Product] ?? fallback])) as ProductForm);
    setForm(current => ({ ...current, price: String(product.price) })); setEditing(product.id); setNotice('');
    document.getElementById('product-form')?.scrollIntoView({ behavior: 'smooth' });
  }
  async function setStatus(lead: Lead, status: string) {
    setBusy(true); setError('');
    try { await api(`/api/leads/${lead.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await loadLists(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function saveLead(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await api('/api/leads', { method: 'POST', body: JSON.stringify(leadForm) });
      setLeadForm(blankLead); setShowLeadForm(false); setNotice('Lead cadastrado.'); await loadLists();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const productField = (name: keyof ProductForm, label: string, required = false, type = 'text') => (
    <label className="pf-field">{label}<input name={name} type={type} value={String(form[name])} onChange={e => setForm({ ...form, [name]: e.target.value })} required={required} maxLength={name === 'link' ? 5000 : name === 'image' || name === 'partnerLogoUrl' ? 2000 : 250} /></label>
  );
  const leadFields = <>
    {(['nome', 'email', 'empresa', 'site'] as const).map((name, i) => <label className="pf-field" key={name}>{['Seu nome', 'E-mail', 'Empresa', 'Site ou link do produto'][i]}<input name={name} type={name === 'email' ? 'email' : 'text'} value={leadForm[name]} onChange={e => setLeadForm({ ...leadForm, [name]: e.target.value })} required maxLength={name === 'site' ? 500 : name === 'nome' ? 100 : name === 'empresa' ? 140 : 180}/></label>)}
    <label className="pf-field pf-admin-wide">Mensagem<textarea value={leadForm.mensagem} onChange={e => setLeadForm({ ...leadForm, mensagem: e.target.value })} required maxLength={2500}/></label>
  </>;

  return <div className="pf-site pf-admin">
    <header className="pf-admin-header"><Brand/><Link href="/">Ver vitrine ↗</Link>{user && <button className="pf-btn pf-btn-dark" onClick={logout} disabled={busy}>Sair</button>}</header>
    <main className={user ? 'pf-admin-main' : 'pf-admin-login'}>
      {loading ? <p role="status">Verificando acesso...</p> : <>
        {error && <div className="pf-form-error" role="alert">{error}</div>}
        {notice && <div className="pf-admin-notice" role="status">{notice}</div>}
        {!user ? <section className="pf-contact-card"><span className="pf-eyebrow">ACESSO RESTRITO</span><h1>Admin Pricefly</h1><p>Entre para gerenciar suas ofertas e contatos.</p><form className="pf-lead-form" onSubmit={login}>
          <label className="pf-field">E-mail<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required maxLength={180}/></label>
          <label className="pf-field">Senha<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required maxLength={256}/></label>
          <button className="pf-btn pf-btn-dark" disabled={busy}>{busy ? 'Entrando...' : 'Entrar no painel'}</button>
        <Link href="/admin/recuperar-senha" className="pf-admin-text-link">Esqueci minha senha</Link>
        </form></section> : <>
          <div className="pf-admin-heading"><div><span className="pf-eyebrow">ÁREA ADMINISTRATIVA</span><h1>Sua vitrine, sob controle.</h1><p>{user.email}</p></div><button className="pf-btn pf-btn-dark" disabled={listLoading || busy} onClick={() => { setListLoading(true); void loadLists(); }}>Atualizar dados</button></div>
          <nav className="pf-admin-tabs" aria-label="Seções do painel"><button className={tab === 'produtos' ? 'is-active' : ''} onClick={() => { setTab('produtos'); setNotice(''); }}>Produtos ({productTotal})</button><button className={tab === 'leads' ? 'is-active' : ''} onClick={() => { setTab('leads'); setNotice(''); }}>Leads ({leadTotal})</button><button className={tab === 'acessos' ? 'is-active' : ''} onClick={() => { setTab('acessos'); setNotice(''); }}>Acessos e senhas</button></nav>
          {tab === 'acessos' ? <AdminAccess onSignedOut={message => { setUser(null); setProducts([]); setLeads([]); setNotice(message); }}/> : tab === 'produtos' ? <>
            <section className="pf-contact-card" id="product-form"><h2>{editing ? 'Editar produto' : 'Cadastrar oferta'}</h2><form onSubmit={saveProduct} className="pf-admin-form">
              {productField('partnerName', 'Nome do parceiro')}{productField('partnerLogoUrl', 'URL da logo do parceiro', false, 'url')}
              <div className="pf-admin-wide">{productField('title', 'Título do produto', true)}</div>
              <label className="pf-field">Categoria<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{productCategories.map(c => <option key={c}>{c}</option>)}</select></label>
              {productField('price', 'Preço (ex.: 390,92)', true)}{productField('installments', 'Parcelamento')}{productField('customCTA', 'Texto do botão')}
              {productField('image', 'URL da imagem', true, 'url')}{productField('link', 'Link de compra', true, 'url')}
              {productField('badge', 'Selo (ex.: Frete grátis)')}{productField('rating', 'Avaliação (opcional, 0 a 5)')}{productField('numbersRating', 'Número de avaliações')}
              <div className="pf-admin-checks"><label><input type="checkbox" checked={form.isHighlighted} onChange={e => setForm({ ...form, isHighlighted: e.target.checked })}/> Destacar oferta</label><label><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })}/> Exibir na vitrine</label></div>
              <div className="pf-admin-actions pf-admin-wide"><button className="pf-btn pf-btn-dark" disabled={busy}>{busy ? 'Salvando...' : editing ? 'Salvar alterações' : 'Adicionar oferta à vitrine'}</button>{editing && <button type="button" className="pf-btn" onClick={() => { setEditing(null); setForm(blankProduct); }}>Cancelar edição</button>}</div>
            </form></section>
            <section className="pf-admin-list"><h2>Produtos cadastrados</h2>{listLoading ? <p role="status">Carregando produtos...</p> : products.length ? products.map(product => <article className="pf-admin-product" key={product.id}><div><h3>{product.title}</h3><p>{product.category} · {formattedPrice(product.price)}</p><span className="pf-admin-tag">{product.active ? 'Na vitrine' : 'Oculto'}{product.isHighlighted ? ' · Destaque' : ''}</span></div><button className="pf-btn pf-btn-dark" disabled={busy} onClick={() => editProduct(product)}>Editar</button></article>) : <p>Nenhum produto cadastrado.</p>}</section>
            <Pagination page={productPage} pages={productPages} disabled={listLoading || busy} onChange={page => { setListLoading(true); setProductPage(page); }}/>
          </> : <>
            <div className="pf-admin-heading"><h2>Contatos recebidos</h2><button className="pf-btn pf-btn-dark" onClick={() => setShowLeadForm(!showLeadForm)}>{showLeadForm ? 'Fechar cadastro' : 'Cadastrar lead'}</button></div>
            {showLeadForm && <form className="pf-contact-card pf-admin-form" onSubmit={saveLead}>{leadFields}<button className="pf-btn pf-btn-dark pf-admin-wide" disabled={busy}>{busy ? 'Salvando...' : 'Cadastrar lead'}</button></form>}
            <div className="pf-admin-list">{listLoading ? <p role="status">Carregando leads...</p> : leads.length ? leads.map(lead => <article className="pf-contact-card pf-admin-lead" key={lead.id}><div className="pf-admin-heading"><div><h3>{lead.empresa}</h3><p>{lead.nome} · {new Date(lead.dataCriacao).toLocaleDateString('pt-BR')}</p></div><label className="pf-field">Status<select value={lead.status} disabled={busy} onChange={e => setStatus(lead, e.target.value)}>{leadStatuses.map(s => <option key={s}>{s}</option>)}</select></label></div><p><strong>E-mail:</strong> <a href={`mailto:${lead.email}`}>{lead.email}</a></p><p><strong>Site ou produto:</strong> {validOfferUrl(lead.site) ? <a href={validOfferUrl(lead.site)!} target="_blank" rel="noopener noreferrer">{lead.site}</a> : lead.site}</p><blockquote>{lead.mensagem}</blockquote></article>) : <p>Nenhum contato recebido ainda.</p>}</div>
            <Pagination page={leadPage} pages={leadPages} disabled={listLoading || busy} onChange={page => { setListLoading(true); setLeadPage(page); }}/>
          </>}
        </>}
      </>}
    </main>
  </div>;
}

function Pagination({ page, pages, disabled, onChange }: { page: number; pages: number; disabled: boolean; onChange: (page: number) => void }) {
  if (pages <= 1) return null;
  return <nav className="pf-admin-pagination" aria-label="Paginação"><button className="pf-btn" disabled={disabled || page === 1} onClick={() => onChange(page - 1)}>Anterior</button><span>Página {page} de {pages}</span><button className="pf-btn" disabled={disabled || page >= pages} onClick={() => onChange(page + 1)}>Próxima</button></nav>;
}
