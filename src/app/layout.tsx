import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: { default: 'Pricefly | Ofertas que valem a descoberta', template: '%s | Pricefly' },
  description: 'Descubra ofertas de lojas parceiras e conheça as soluções da Pricefly para destacar os produtos da sua empresa.',
  applicationName: 'Pricefly',
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="pt-BR" className={geist.variable}><body>{children}</body></html>;
}
