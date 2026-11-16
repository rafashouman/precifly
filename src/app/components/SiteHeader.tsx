'use client';

import { useState } from 'react';
import Link from 'next/link';
import Icon from './Icon';

export function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" className={`pf-brand ${inverted ? 'pf-brand--light' : ''}`} aria-label="Pricefly, página inicial">
      <span className="pf-brand-mark" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M5 21.5V6.5h8.5c5.2 0 8 2.7 8 6.4 0 3.8-2.9 6.3-8 6.3H10" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m16 5 7 3-6 4" fill="currentColor" />
        </svg>
      </span>
      <span className="pf-brand-word">price<span>fly</span><span className="pf-brand-dot">.</span></span>
    </Link>
  );
}

export default function SiteHeader({ active = 'home' }: { active?: 'home' | 'business' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="pf-header">
      <div className="pf-shell pf-header-inner">
        <Brand />
        <nav aria-label="Navegação principal" className={`pf-nav ${menuOpen ? 'is-open' : ''}`}>
          <Link href="/" className={active === 'home' ? 'is-active' : ''} onClick={() => setMenuOpen(false)}>Início</Link>
          <Link href="/#ofertas" onClick={() => setMenuOpen(false)}>Explorar ofertas</Link>
          <Link href="/para-empresas" className={active === 'business' ? 'is-active' : ''} onClick={() => setMenuOpen(false)}>Para empresas</Link>
          <Link href="/para-empresas" className="pf-nav-mobile-cta" onClick={() => setMenuOpen(false)}>Anuncie na Pricefly <Icon name="arrow-up-right" size={16}/></Link>
        </nav>
        <Link href="/para-empresas" className="pf-btn pf-btn-dark pf-header-cta">Sou empresa <Icon name="arrow-up-right" size={17}/></Link>
        <button type="button" className="pf-menu-toggle" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          <Icon name={menuOpen ? 'close' : 'menu'} size={24} />
        </button>
      </div>
    </header>
  );
}
