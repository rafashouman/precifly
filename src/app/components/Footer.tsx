import Link from 'next/link';
import Icon from './Icon';
import { Brand } from './SiteHeader';

export default function Footer() {
  return (
    <footer className="pf-footer">
      <div className="pf-shell">
        <div className="pf-footer-main">
          <div className="pf-footer-about">
            <Brand inverted />
            <p>Ofertas que fazem sentido para você. Estratégias que fazem a diferença para sua empresa.</p>
          </div>
          <div className="pf-footer-group">
            <strong>Explore</strong>
            <Link href="/">Página inicial</Link>
            <Link href="/#ofertas">Todas as ofertas</Link>
          </div>
          <div className="pf-footer-group">
            <strong>Para negócios</strong>
            <Link href="/para-empresas">Soluções para empresas</Link>
            <Link href="/para-empresas#contato">Solicitar contato <Icon name="arrow-up-right" size={14}/></Link>
          </div>
        </div>
        <div className="pf-footer-bottom">
          <span>© {new Date().getFullYear()} Pricefly. Todos os direitos reservados.</span>
          <span>Descubra mais. Escolha melhor.</span>
        </div>
      </div>
    </footer>
  );
}
