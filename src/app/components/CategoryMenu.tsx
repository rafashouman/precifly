'use client';

import { useRef } from 'react';

export const categories = [
  'Todas', 'Casa, Móveis e Decoração', 'Eletrodomésticos',
  'Esportes e Fitness', 'Pet Shop', 'Saúde',
] as const;

type Props = { activeCategory: string; setActiveCategory: (value: string) => void; counts?: Record<string, number> };

export default function CategoryMenu({ activeCategory, setActiveCategory, counts }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  return (
    <div className="pf-categories-wrap">
      <div className="pf-categories" ref={menuRef} role="group" aria-label="Filtrar ofertas por categoria">
        {categories.map(category => (
          <button
            type="button"
            key={category}
            aria-pressed={activeCategory === category}
            className={`pf-category ${activeCategory === category ? 'is-selected' : ''}`}
            onClick={() => setActiveCategory(category)}
          >
            {category === 'Todas' ? 'Todas as ofertas' : category}
            {counts && (counts[category] ?? 0) > 0 && <span className="pf-category-count">{counts[category]}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
