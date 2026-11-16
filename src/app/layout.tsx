import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: { default: 'Pricefly | Transformamos promoções em ofertas irresistíveis', template: '%s | Pricefly' },
  description: 'Descubra as melhores oportunidades dos nossos parceiros ou leve as ofertas da sua empresa mais longe com a consultoria Pricefly.',
  applicationName: 'Pricefly',
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="pt-BR" className={geist.variable}><body>{children}</body></html>;
}
