'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import CategoryMenu from '@/app/components/CategoryMenu';
import ProductCard, { type Product, formattedPrice, validOfferUrl } from '@/app/components/ProductCard';
import Footer from '@/app/components/Footer';
import SiteHeader from '@/app/components/SiteHeader';
import Icon from '@/app/components/Icon';

type SortOrder = 'featured' | 'lowest' | 'highest';

function numericPrice(value: string | number | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const clean = String(value ?? '').replace(/[^\d,.]/g, '');
  if (!clean) return 0;
  if (clean.includes(',')) return Number(clean.replace(/\./g, '').replace(',', '.')) || 0;
  // Aceita tanto "1299" e "1299.90" quanto "1.299".
  if (/^\d{1,3}(\.\d{3})+$/.test(clean)) return Number(clean.replace(/\./g, '')) || 0;
  return Number(clean) || 0;
}

function normalize(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('featured');
  const offersRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let mounted = true;
    async function loadProducts() {
      try {
        const snapshot = await getDocs(collection(db, 'products'));
        if (mounted) setProducts(snapshot.docs.map(item => ({ ...item.data(), id: item.id })) as Product[]);
      } catch (error) {
        console.error('Não foi possível carregar as ofertas:', error);
        if (mounted) setLoadError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadProducts();
    return () => { mounted = false; };
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = { Todas: products.length };
    products.forEach(product => { map[product.category] = (map[product.category] ?? 0) + 1; });
    return map;
  }, [products]);

  const displayedProducts = useMemo(() => {
    const q = normalize(search.trim());
    const filtered = products.filter(product => {
      const matchCategory = activeCategory === 'Todas' || product.category === activeCategory;
      const matchSearch = !q || normalize(`${product.title} ${product.category} ${product.partnerName || ''}`).includes(q);
      return matchCategory && matchSearch;
    });
    return filtered.sort((a, b) => {
      if (sortOrder === 'lowest') return numericPrice(a.price) - numericPrice(b.price);
      if (sortOrder === 'highest') return numericPrice(b.price) - numericPrice(a.price);
      return Number(Boolean(b.isHighlighted)) - Number(Boolean(a.isHighlighted));
    });
  }, [products, activeCategory, search, sortOrder]);

  const heroProduct = products.find(p => p.isHighlighted) || products[0];
  const heroUrl = validOfferUrl(heroProduct?.link);
  const clearFilters = () => { setSearch(''); setActiveCategory('Todas'); setSortOrder('featured'); };

  return (
    <div className="pf-site">
      <SiteHeader active="home" />

      <main>
        <section className="pf-hero">
          <div className="pf-hero-pattern" aria-hidden="true" />
          <div className="pf-shell pf-hero-grid">
            <div className="pf-hero-copy">
              <div className="pf-eyebrow pf-eyebrow-light"><span className="pf-pulse" /> SUA PRÓXIMA BOA DESCOBERTA</div>
              <h1>Boas ofertas.<br /><em>Grandes</em><br />descobertas<span className="pf-hero-period">.</span></h1>
              <p>Encontrar uma ótima oportunidade pode ser simples. Explore ofertas de lojas parceiras e descubra escolhas que combinam com você.</p>
              <div className="pf-hero-actions">
                <button className="pf-btn pf-btn-accent pf-btn-lg" onClick={() => offersRef.current?.scrollIntoView({ behavior: 'smooth' })}>
                  Explorar ofertas <Icon name="arrow-up-right" size={19}/>
                </button>
                <Link className="pf-hero-secondary" href="/para-empresas">Tenho uma empresa <Icon name="arrow-right" size={17}/></Link>
              </div>
              <div className="pf-hero-bottomline"><Icon name="sparkles" size={17}/> Uma vitrine feita para facilitar sua escolha.</div>
            </div>

            <div className="pf-hero-art" aria-label="Destaque da vitrine Pricefly">
              <div className="pf-art-orbit pf-art-orbit-a" aria-hidden="true" />
              <div className="pf-art-orbit pf-art-orbit-b" aria-hidden="true" />
              <div className="pf-art-sticker pf-art-sticker-top"><Icon name="sparkles" size={16}/> DESCUBRA MAIS</div>
              <div className="pf-showcase-card">
                <div className="pf-showcase-top"><span>PRICEFLY / ESCOLHAS</span><Icon name="arrow-up-right" size={19}/></div>
                <div className="pf-showcase-picture">
                  {heroProduct?.image ? <img src={heroProduct.image} alt={heroProduct.title} /> : (
                    <div className="pf-showcase-placeholder" aria-hidden="true">
                      <span className="pf-showcase-ring pf-showcase-ring-a"/><span className="pf-showcase-ring pf-showcase-ring-b"/>
                      <span className="pf-showcase-initial">P<span>✳</span></span>
                    </div>
                  )}
                </div>
                <div className="pf-showcase-footer">
                  <div><small>{heroProduct?.partnerName || (heroProduct ? 'OFERTA EM DESTAQUE' : 'BEM-VINDO À PRICEFLY')}</small><strong>{heroProduct?.title || 'O próximo achado está por aqui.'}</strong></div>
                  {heroProduct && <div className="pf-showcase-price">{formattedPrice(heroProduct.price)}</div>}
                </div>
                {heroUrl && <a href={heroUrl} target="_blank" rel="noopener noreferrer" className="pf-showcase-cover-link" aria-label={`Abrir oferta: ${heroProduct.title}`}/>} 
              </div>
              <div className="pf-art-sticker pf-art-sticker-bottom"><span className="pf-sticker-icon"><Icon name="tag" size={18}/></span><span>ESPAÇO PARA<br/><b>BOAS OPORTUNIDADES</b></span></div>
            </div>
          </div>
          <div className="pf-hero-footer-bar"><div className="pf-shell pf-hero-footer-inner">
            <span><Icon name="check" size={16}/> Ofertas de lojas parceiras</span>
            <span><Icon name="search" size={16}/> Descobertas em diversas categorias</span>
            <span><Icon name="store" size={16}/> Um espaço para sua marca</span>
          </div></div>
        </section>

        <section className="pf-offers pf-section" id="ofertas" ref={offersRef} aria-labelledby="offers-title">
          <div className="pf-shell">
            <div className="pf-section-heading">
              <div><span className="pf-eyebrow"><span className="pf-eyebrow-line"/> EXPLORAR A VITRINE</span><h2 id="offers-title">Encontre seu <span>próximo achado.</span></h2></div>
              <p>Explore por categoria ou pesquise algo específico. As ofertas levam você diretamente à loja parceira.</p>
            </div>

            <CategoryMenu activeCategory={activeCategory} setActiveCategory={setActiveCategory} counts={counts} />
            <div className="pf-toolbar">
              <label className="pf-searchbox" htmlFor="search-offers"><Icon name="search" size={20}/><input id="search-offers" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar produtos ou marcas..." type="search" autoComplete="off" /></label>
              <div className="pf-toolbar-right">
                <span className="pf-results-count" aria-live="polite">{loading ? 'Carregando ofertas...' : `${displayedProducts.length} ${displayedProducts.length === 1 ? 'oferta encontrada' : 'ofertas encontradas'}`}</span>
                <label className="pf-sortbox"><Icon name="sort" size={17}/><span className="pf-sr-only">Ordenar ofertas</span>
                  <select aria-label="Ordenar ofertas" value={sortOrder} onChange={e => setSortOrder(e.target.value as SortOrder)}>
                    <option value="featured">Destaques primeiro</option>
                    <option value="lowest">Menor preço</option>
                    <option value="highest">Maior preço</option>
                  </select><Icon name="chevron-down" size={15}/>
                </label>
              </div>
            </div>

            {loading ? <div className="pf-products-grid" aria-label="Carregando produtos">{Array.from({ length: 8 }, (_, i) => <div key={i} className="pf-skeleton-card"><div className="pf-skeleton-image"/><div className="pf-skeleton-line"/><div className="pf-skeleton-line pf-skeleton-line-short"/><div className="pf-skeleton-line pf-skeleton-line-tiny"/></div>)}</div>
              : loadError ? <div className="pf-empty-state" role="alert"><span className="pf-empty-icon"><Icon name="refresh" size={27}/></span><h3>Não conseguimos carregar as ofertas.</h3><p>Houve um problema na conexão com a vitrine. Atualize a página para tentar novamente.</p><button type="button" className="pf-btn pf-btn-dark" onClick={() => window.location.reload()}>Tentar novamente <Icon name="refresh" size={17}/></button></div>
              : displayedProducts.length ? <div className="pf-products-grid">{displayedProducts.map(product => <ProductCard key={product.id} product={product}/>)}</div>
              : <div className="pf-empty-state"><span className="pf-empty-icon"><Icon name="search" size={27}/></span><h3>Nenhuma oferta por aqui, ainda.</h3><p>{products.length === 0 ? 'Novas ofertas poderão aparecer em breve. Volte para conferir.' : 'Experimente outra palavra ou categoria para encontrar mais opções.'}</p>{products.length > 0 && <button className="pf-btn pf-btn-dark" type="button" onClick={clearFilters}>Limpar filtros <Icon name="arrow-right" size={17}/></button>}</div>
            }
          </div>
        </section>

        <section className="pf-business pf-section" aria-labelledby="business-title">
          <div className="pf-shell">
            <div className="pf-business-head">
              <div><span className="pf-eyebrow"><span className="pf-eyebrow-line"/> PARA QUEM VENDE</span><h2 id="business-title">Sua oferta merece<br/><span>ser percebida.</span></h2></div>
              <p>Não basta ter um bom produto. É preciso comunicar o valor certo, para as pessoas certas. A Pricefly ajuda a sua marca a fazer isso.</p>
            </div>
            <div className="pf-services-grid">
              <div className="pf-service-card"><span className="pf-service-number">01 / ESTRATÉGIA</span><div className="pf-service-icon"><Icon name="target" size={26}/></div><h3>Posicionamento que conecta.</h3><p>Destacamos o que torna sua oferta relevante para que o consumidor enxergue mais valor.</p><span className="pf-service-line"/></div>
              <div className="pf-service-card"><span className="pf-service-number">02 / COMUNICAÇÃO</span><div className="pf-service-icon"><Icon name="pen" size={26}/></div><h3>Mensagens que convencem.</h3><p>Refinamos títulos, textos e argumentos para deixar seus diferenciais claros e atrativos.</p><span className="pf-service-line"/></div>
              <div className="pf-service-card"><span className="pf-service-number">03 / VISIBILIDADE</span><div className="pf-service-icon"><Icon name="megaphone" size={26}/></div><h3>Mais espaço para aparecer.</h3><p>Apresentamos suas oportunidades na vitrine da Pricefly e aproximamos sua marca de novos públicos.</p><span className="pf-service-line"/></div>
            </div>
            <div className="pf-cta-banner"><div><span className="pf-eyebrow pf-eyebrow-light">SUA MARCA PODE IR MAIS LONGE</span><h2>Vamos fazer sua próxima<br/>oferta acontecer?</h2><p>Conte sobre o seu negócio. Vamos conversar sobre como destacar o que você vende.</p></div><Link href="/para-empresas#contato" className="pf-btn pf-btn-accent pf-btn-lg">Quero destacar minha empresa <Icon name="arrow-up-right" size={19}/></Link><div className="pf-banner-circle" aria-hidden="true"/></div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
