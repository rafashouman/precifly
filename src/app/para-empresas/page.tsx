'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import SiteHeader from '@/app/components/SiteHeader';
import Footer from '@/app/components/Footer';
import Icon from '@/app/components/Icon';

type FormData = { nome: string; email: string; empresa: string; site: string; mensagem: string };
const initialForm: FormData = { nome: '', email: '', empresa: '', site: '', mensagem: '' };

export default function ParaEmpresas() {
  const [formData, setFormData] = useState<FormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFormData(current => ({ ...current, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    setSubmitError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Não foi possível enviar sua mensagem.');
      setSuccess(true);
      setFormData(initialForm);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível enviar sua mensagem. Tente novamente.');
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
            <h1>Transforme o que você já vende<br/>em uma <em>oferta irresistível</em><span className="pf-hero-period">.</span></h1>
            <p>Não basta apenas reduzir o preço. A Pricefly ajuda a sua empresa a aumentar o valor percebido dos seus produtos, destacando diferenciais e conectando as suas ofertas a novos consumidores.</p>
            <a href="#contato" className="pf-btn pf-btn-accent pf-btn-lg">Vamos conversar <Icon name="arrow-up-right" size={19}/></a>
            <div className="pf-b2b-hero-decoration" aria-hidden="true"><div/><div/><span>↗</span></div>
          </div>
        </section>

        <section className="pf-b2b-section pf-section" id="contato">
          <div className="pf-shell pf-b2b-grid">
            <div className="pf-b2b-info">
              <span className="pf-eyebrow"><span className="pf-eyebrow-line"/> COMO FUNCIONA</span>
              <h2>Como a consultoria<br/><span>funciona?</span></h2>
              <p className="pf-b2b-intro">Ajudamos sua empresa a comunicar melhor o que oferece, com um processo claro e focado no cliente.</p>
              <div className="pf-steps">
                <div className="pf-step"><span>01</span><div><h3>Diagnóstico e Estratégia</h3><p>Analisamos os seus produtos e reestruturamos a oferta para focar no que o cliente realmente valoriza.</p></div></div>
                <div className="pf-step"><span>02</span><div><h3>Refinamento de Comunicação</h3><p>Ajustamos os textos, títulos e apelos visuais para gerar mais atenção, interesse e desejo.</p></div></div>
                <div className="pf-step"><span>03</span><div><h3>Visibilidade na Vitrine Pricefly</h3><p>Suas ofertas otimizadas ganham destaque no nosso site, alcançando a nossa base de consumidores.</p></div></div>
              </div>
              <div className="pf-b2b-note"><Icon name="shield" size={23}/><p>Converse com a gente para entender as possibilidades para sua marca, sem compromisso.</p></div>
            </div>
            <div className="pf-contact-card">
              <div className="pf-contact-card-top"><span className="pf-contact-icon"><Icon name="mail" size={22}/></span><span>CONTATO COMERCIAL</span></div>
              <h2>Fale com um consultor</h2>
              <p>Preencha os dados abaixo e entraremos em contato para entender as suas necessidades.</p>
              {success ? (
                <div className="pf-form-success" role="status"><span className="pf-success-icon"><Icon name="check" size={32}/></span><h3>Mensagem enviada com sucesso!</h3><p>Nossa equipe entrará em contato em breve.</p><button type="button" className="pf-btn pf-btn-dark" onClick={() => setSuccess(false)}>Enviar nova mensagem <Icon name="arrow-right" size={17}/></button></div>
              ) : (
                <form className="pf-lead-form" onSubmit={handleSubmit}>
                  <div className="pf-field-row">
                    <label className="pf-field">Seu nome <input autoComplete="name" name="nome" value={formData.nome} onChange={handleChange} placeholder="Seu Nome" maxLength={100} required/></label>
                    <label className="pf-field">Seu e-mail <input type="email" autoComplete="email" name="email" value={formData.email} onChange={handleChange} placeholder="E-mail de Trabalho" maxLength={180} required/></label>
                  </div>
                  <label className="pf-field">Nome da empresa <input autoComplete="organization" name="empresa" value={formData.empresa} onChange={handleChange} placeholder="Nome da Empresa" maxLength={140} required/></label>
                  <label className="pf-field">Site ou link do produto <input name="site" value={formData.site} onChange={handleChange} placeholder="Site ou Link do Produto" maxLength={500} required/></label>
                  <label className="pf-field">Como podemos ajudar? <textarea name="mensagem" value={formData.mensagem} onChange={handleChange} rows={5} placeholder="Como podemos ajudar as suas ofertas?" maxLength={2500} required/></label>
                  {submitError && <div className="pf-form-error" role="alert">{submitError}</div>}
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
