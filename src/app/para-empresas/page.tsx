'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import SiteHeader from '@/app/components/SiteHeader';
import Footer from '@/app/components/Footer';
import Icon from '@/app/components/Icon';

type FormData = { nome: string; email: string; empresa: string; site: string; mensagem: string };
const initialForm: FormData = { nome: '', email: '', empresa: '', site: '', mensagem: '' };

export default function ParaEmpresas() {
  const [formData, setFormData] = useState<FormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFormData(current => ({ ...current, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    setSubmitError(false);
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'leads'), {
        ...formData,
        dataCriacao: new Date().toISOString(),
        status: 'Novo',
      });
      setSuccess(true);
      setFormData(initialForm);
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      setSubmitError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="pf-site">
      <SiteHeader active="business" />
      <main>
        <section className="pf-b2b-hero">
          <div className="pf-shell pf-b2b-hero-inner">
            <div className="pf-eyebrow pf-eyebrow-light"><span className="pf-pulse"/> ESTRATÉGIA PARA O SEU NEGÓCIO</div>
            <h1>Seu produto tem valor.<br/><em>Vamos mostrar isso</em><span className="pf-hero-period">.</span></h1>
            <p>Transformamos a maneira como sua marca apresenta suas ofertas. Mais clareza, posicionamento e visibilidade para aquilo que você já faz bem.</p>
            <a href="#contato" className="pf-btn pf-btn-accent pf-btn-lg">Vamos conversar <Icon name="arrow-up-right" size={19}/></a>
            <div className="pf-b2b-hero-decoration" aria-hidden="true"><div/><div/><span>↗</span></div>
          </div>
        </section>

        <section className="pf-b2b-section pf-section" id="contato">
          <div className="pf-shell pf-b2b-grid">
            <div className="pf-b2b-info">
              <span className="pf-eyebrow"><span className="pf-eyebrow-line"/> COMO FUNCIONA</span>
              <h2>Uma boa oferta<br/>não acontece <span>por acaso.</span></h2>
              <p className="pf-b2b-intro">Ajudamos sua empresa a comunicar melhor o que oferece, com um processo claro e focado no cliente.</p>
              <div className="pf-steps">
                <div className="pf-step"><span>01</span><div><h3>Diagnóstico e estratégia</h3><p>Entendemos seu negócio e identificamos oportunidades para valorizar seus produtos.</p></div></div>
                <div className="pf-step"><span>02</span><div><h3>Comunicação mais forte</h3><p>Trabalhamos títulos, argumentos e diferenciais para tornar sua oferta mais atraente.</p></div></div>
                <div className="pf-step"><span>03</span><div><h3>Visibilidade na vitrine</h3><p>Suas ofertas podem ganhar espaço na Pricefly, aproximando sua marca de novos consumidores.</p></div></div>
              </div>
              <div className="pf-b2b-note"><Icon name="shield" size={23}/><p>Converse com a gente para entender as possibilidades para sua marca, sem compromisso.</p></div>
            </div>
            <div className="pf-contact-card">
              <div className="pf-contact-card-top"><span className="pf-contact-icon"><Icon name="mail" size={22}/></span><span>CONTATO COMERCIAL</span></div>
              <h2>Vamos falar do seu negócio?</h2>
              <p>Conte um pouco sobre sua empresa e o que você quer melhorar. Entraremos em contato.</p>
              {success ? (
                <div className="pf-form-success" role="status"><span className="pf-success-icon"><Icon name="check" size={32}/></span><h3>Mensagem enviada!</h3><p>Recebemos suas informações. Nossa equipe entrará em contato em breve.</p><button type="button" className="pf-btn pf-btn-dark" onClick={() => setSuccess(false)}>Enviar outra mensagem <Icon name="arrow-right" size={17}/></button></div>
              ) : (
                <form className="pf-lead-form" onSubmit={handleSubmit}>
                  <div className="pf-field-row">
                    <label className="pf-field">Seu nome <input autoComplete="name" name="nome" value={formData.nome} onChange={handleChange} placeholder="Como podemos chamar você?" maxLength={100} required/></label>
                    <label className="pf-field">Seu e-mail <input type="email" autoComplete="email" name="email" value={formData.email} onChange={handleChange} placeholder="voce@empresa.com" maxLength={180} required/></label>
                  </div>
                  <label className="pf-field">Nome da empresa <input autoComplete="organization" name="empresa" value={formData.empresa} onChange={handleChange} placeholder="Nome do seu negócio" maxLength={140} required/></label>
                  <label className="pf-field">Site ou link do produto <input name="site" value={formData.site} onChange={handleChange} placeholder="https://seusite.com.br" maxLength={500} required/></label>
                  <label className="pf-field">Como podemos ajudar? <textarea name="mensagem" value={formData.mensagem} onChange={handleChange} rows={5} placeholder="Conte um pouco sobre suas ofertas e objetivos..." maxLength={2500} required/></label>
                  {submitError && <div className="pf-form-error" role="alert">Não foi possível enviar sua mensagem. Verifique sua conexão e tente novamente.</div>}
                  <button type="submit" disabled={isSubmitting} className="pf-btn pf-btn-dark pf-btn-lg pf-submit-btn">{isSubmitting ? 'Enviando sua mensagem...' : 'Solicitar contato'}{!isSubmitting && <Icon name="arrow-up-right" size={18}/>}</button>
                  <p className="pf-form-disclaimer">Seus dados serão utilizados para responder à sua solicitação de contato.</p>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
