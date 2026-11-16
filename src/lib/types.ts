export const productCategories = ['Casa, Móveis e Decoração', 'Eletrodomésticos', 'Esportes e Fitness', 'Pet Shop', 'Saúde'] as const;
export const leadStatuses = ['Novo', 'Em contato', 'Concluído', 'Arquivado'] as const;

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
  seller?: string;
  partnerName?: string;
  partnerLogoUrl?: string;
  customCTA?: string;
  isHighlighted?: boolean;
  active?: boolean;
};
export type Lead = {
  id: string;
  nome: string;
  email: string;
  empresa: string;
  site: string;
  mensagem: string;
  dataCriacao: string;
  status: typeof leadStatuses[number];
};
