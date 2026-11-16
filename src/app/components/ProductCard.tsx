'use client';

import { useState } from 'react';
import Icon from './Icon';

export type Product = {
  id: string;
  title: string;
  category: string;
  price: string | number;
  installments?: string;
  image: string;
  link: string;
  rating?: string;
  numbersRating?: string;
  badge?: string;
  badgeBg?: string;
  badgeColor?: string;
  partnerName?: string;
  partnerLogoUrl?: string;
  customCTA?: string;
  isHighlighted?: boolean;
};

export function formattedPrice(price: string | number) {
  if (typeof price === 'number') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  const label = (price ?? '').trim();
  if (!label) return 'Sob consulta';
  return /^R\$/i.test(label) ? label : `R$ ${label}`;
}

export function validOfferUrl(link: string | undefined): string | null {
  if (!link) return null;
  try {
    const url = new URL(link);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch { return null; }
}

export default function ProductCard({ product }: { product: Product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const url = validOfferUrl(product.link);
  const rating = Number.parseFloat(String(product.rating ?? '').replace(',', '.'));
  const hasRating = Number.isFinite(rating) && rating > 0;

  return (
    <article className={`pf-product-card ${product.isHighlighted ? 'pf-product-card--featured' : ''}`}>
      <div className="pf-product-media">
        {product.image && !imageFailed
          ? <img src={product.image} alt={product.title} loading="lazy" onError={() => setImageFailed(true)} />
          : <div className="pf-product-fallback"><Icon name="tag" size={38}/><span>Pricefly</span></div>
        }
        {product.badge && <span className="pf-product-badge">{product.badge}</span>}
        {product.isHighlighted && <span className="pf-featured-badge"><Icon name="sparkles" size={13}/> Em destaque</span>}
      </div>
      <div className="pf-product-content">
        <div className="pf-product-eyebrow">
          <span>{product.partnerName?.trim() || product.category}</span>
          {hasRating && <span className="pf-product-rating"><Icon name="star" size={13} fill="currentColor"/>{rating.toFixed(1).replace('.', ',')}</span>}
        </div>
        <h3 className="pf-product-title">{product.title}</h3>
        <div className="pf-product-bottom">
          <div className="pf-product-pricing">
            <strong>{formattedPrice(product.price)}</strong>
            <span>{product.installments || 'Confira as condições na loja'}</span>
          </div>
          {url ? (
            <a href={url} className="pf-product-button" target="_blank" rel="noopener noreferrer" aria-label={`${product.customCTA || 'Ver oferta'}: ${product.title}`}>
              <span>{product.customCTA?.trim() || 'Ver oferta'}</span><Icon name="arrow-up-right" size={17} />
            </a>
          ) : <span className="pf-product-button pf-product-button--disabled">Oferta indisponível</span>}
        </div>
      </div>
    </article>
  );
}
