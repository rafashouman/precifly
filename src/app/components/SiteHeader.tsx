'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Icon from './Icon';

export function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" className={`pf-brand ${inverted ? 'pf-brand--light' : ''}`} aria-label="Pricefly, página inicial">
      <Image className="pf-brand-logo" src="/images/logo-big.png" alt="PriceFly" width={1550} height={310} sizes="(max-width: 560px) 175px, 220px" priority={!inverted} />
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
