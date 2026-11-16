'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '@/firebase/config';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';

type Lead = {
  id: string;
  nome: string;
  email: string;
  empresa: string;
  site: string;
  mensagem: string;
  dataCriacao: string;
  status: string;
};

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'produtos' | 'leads'>('produtos');

  // Login States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Produto States
  const [formData, setFormData] = useState({
    title: '', category: 'Casa, Móveis e Decoração', price: '', installments: '',
    image: '', link: '', partnerName: '', partnerLogoUrl: '', customCTA: '', isHighlighted: false
  });

  // Leads States
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) fetchLeads(); // Busca os leads assim que logar
    });
    return () => unsubscribe();
  }, []);

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const q = query(collection(db, "leads"), orderBy("dataCriacao", "desc"));
      const querySnapshot = await getDocs(q);
      const leadsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lead[];
      setLeads(leadsData);
    } catch (error) {
      console.error("Erro ao buscar leads:", error);
    } finally {
      setLoadingLeads(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert('Erro ao fazer login. Verifique as credenciais.');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'products'), {
        ...formData,
        rating: '5.0', numbersRating: '(1)', badge: 'Frete Grátis', badgeBg: '#6a994e', badgeColor: '#fff',
      });
      alert('Produto parceiro cadastrado com sucesso!');
      setFormData({
        title: '', category: 'Casa, Móveis e Decoração', price: '', installments: '',
        image: '', link: '', partnerName: '', partnerLogoUrl: '', customCTA: '', isHighlighted: false
      });
    } catch (error) {
      alert('Erro ao cadastrar produto: ' + (error as Error).message);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setFormData({ ...formData, [target.name]: value });
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Carregando...</div>;

  // TELA DE LOGIN
  if (!user) {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: '30px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Admin Pricefly</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
          <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
          <button type="submit" style={buttonStyle}>Entrar no Painel</button>
        </form>
      </div>
    );
  }

  // TELA DO PAINEL ADMIN
  return (
    <div style={{ maxWidth: '900px', margin: '60px auto', padding: '20px', background: '#fff', borderRadius: '12px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2>Painel Pricefly</h2>
        <button onClick={() => signOut(auth)} style={{ ...buttonStyle, background: '#ef4444', padding: '8px 16px' }}>Sair</button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '2px solid #f3f4f6' }}>
        <button onClick={() => setActiveTab('produtos')} style={{ ...tabStyle, borderBottom: activeTab === 'produtos' ? '3px solid #386641' : 'none', fontWeight: activeTab === 'produtos' ? 'bold' : 'normal' }}>Cadastrar Ofertas</button>
        <button onClick={() => { setActiveTab('leads'); fetchLeads(); }} style={{ ...tabStyle, borderBottom: activeTab === 'leads' ? '3px solid #386641' : 'none', fontWeight: activeTab === 'leads' ? 'bold' : 'normal' }}>Leads B2B ({leads.length})</button>
      </div>

      {activeTab === 'produtos' && (
        <form onSubmit={handleAddProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ gridColumn: '1 / -1' }}><h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Dados do Parceiro</h3></div>
          <input name="partnerName" placeholder="Nome da Empresa (Ex: Loja do João)" value={formData.partnerName} onChange={handleChange} style={inputStyle} />
          <input name="partnerLogoUrl" placeholder="URL do Logotipo da Empresa" value={formData.partnerLogoUrl} onChange={handleChange} style={inputStyle} />
          <input name="customCTA" placeholder="Texto do Botão (Ex: Comprar na Loja)" value={formData.customCTA} onChange={handleChange} style={inputStyle} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input type="checkbox" name="isHighlighted" checked={formData.isHighlighted} onChange={handleChange} style={{ width: '20px', height: '20px' }} />
            Destacar oferta com borda verde?
          </label>

          <div style={{ gridColumn: '1 / -1', marginTop: '20px' }}><h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Dados do Produto</h3></div>
          <input name="title" placeholder="Título do Produto" value={formData.title} onChange={handleChange} required style={{ ...inputStyle, gridColumn: '1 / -1' }} />
          <select name="category" value={formData.category} onChange={handleChange} style={inputStyle}>
            <option value="Casa, Móveis e Decoração">Casa, Móveis e Decoração</option>
            <option value="Eletrodomésticos">Eletrodomésticos</option>
            <option value="Esportes e Fitness">Esportes e Fitness</option>
            <option value="Pet Shop">Pet Shop</option>
            <option value="Saúde">Saúde</option>
          </select>
          <input name="price" placeholder="Preço (ex: R$ 390,92)" value={formData.price} onChange={handleChange} required style={inputStyle} />
          <input name="installments" placeholder="Parcelamento (ex: 12x R$38,24)" value={formData.installments} onChange={handleChange} style={inputStyle} />
          <input name="image" placeholder="URL da Imagem do Produto" value={formData.image} onChange={handleChange} required style={inputStyle} />
          <input name="link" placeholder="Link Seguro de Compra" value={formData.link} onChange={handleChange} required style={{ ...inputStyle, gridColumn: '1 / -1' }} />

          <button type="submit" style={{ ...buttonStyle, gridColumn: '1 / -1', padding: '15px' }}>Adicionar Oferta à Vitrine</button>
        </form>
      )}

      {activeTab === 'leads' && (
        <div>
          {loadingLeads ? <p>Carregando leads...</p> : leads.length === 0 ? <p>Nenhum contato recebido ainda.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {leads.map(lead => (
                <div key={lead.id} style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#f9fafb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>{lead.empresa} - {lead.nome}</h4>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{new Date(lead.dataCriacao).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>E-mail:</strong> {lead.email}</p>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Site:</strong> <a href={lead.site} target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>{lead.site}</a></p>
                  <p style={{ marginTop: '15px', fontStyle: 'italic', color: '#4b5563', backgroundColor: '#fff', padding: '10px', borderLeft: '3px solid #386641' }}>"{lead.mensagem}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', width: '100%', boxSizing: 'border-box' as const };
const buttonStyle = { borderRadius: '8px', border: 'none', background: '#386641', color: '#fff', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' };
const tabStyle = { padding: '10px 20px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', outline: 'none' };