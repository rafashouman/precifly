import type { ReactNode, SVGProps } from 'react';

type Name = 'arrow-right' | 'arrow-up-right' | 'search' | 'sparkles' | 'target' | 'pen' | 'megaphone' | 'check' | 'chevron-down' | 'sort' | 'store' | 'shield' | 'star' | 'tag' | 'menu' | 'close' | 'refresh' | 'external' | 'mail' | 'chart' | 'heart';
type Props = SVGProps<SVGSVGElement> & { name: Name; size?: number };

export default function Icon({ name, size = 20, ...props }: Props) {
  let drawing: ReactNode;
  switch (name) {
    case 'arrow-right': drawing = <><path d="M4 12h16"/><path d="m13 5 7 7-7 7"/></>; break;
    case 'arrow-up-right': drawing = <><path d="M7 17 17 7"/><path d="M7 7h10v10"/></>; break;
    case 'search': drawing = <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></>; break;
    case 'sparkles': drawing = <><path d="m12 3 1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9L12 3Z"/><path d="m19 18 .7 1.3L21 20l-1.3.7L19 22l-.7-1.3L17 20l1.3-.7L19 18Z"/></>; break;
    case 'target': drawing = <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></>; break;
    case 'pen': drawing = <><path d="M12 20h9"/><path d="m16.6 4.4 3 3a2 2 0 0 1 0 2.8L9.2 20.6l-5.2 1 1-5.2L15.4 6a2 2 0 0 1 2.8 0Z" transform="translate(-1 -2)"/></>; break;
    case 'megaphone': drawing = <><path d="M3 11v2a3 3 0 0 0 3 3h2l2 5h3l-2-5 10 4V4L8 8H6a3 3 0 0 0-3 3Z"/></>; break;
    case 'check': drawing = <path d="m5 12 4 4L19 6"/>; break;
    case 'chevron-down': drawing = <path d="m6 9 6 6 6-6"/>; break;
    case 'sort': drawing = <><path d="M4 7h16M7 12h10M10 17h4"/></>; break;
    case 'store': drawing = <><path d="M3 10h18l-2-6H5l-2 6Z"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>; break;
    case 'shield': drawing = <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></>; break;
    case 'star': drawing = <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.9l-6.2 3.2L7 14.2 2 9.3l6.9-1L12 2Z"/>; break;
    case 'tag': drawing = <><path d="M20.5 13 13 20.5 3 10.5V3h7.5l10 10Z"/><circle cx="7.5" cy="7.5" r="1"/></>; break;
    case 'menu': drawing = <><path d="M4 7h16M4 12h16M4 17h16"/></>; break;
    case 'close': drawing = <><path d="M5 5 19 19M19 5 5 19"/></>; break;
    case 'refresh': drawing = <><path d="M20 11a8 8 0 0 0-14-5L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14 5l2-2"/><path d="M15 16h5v5"/></>; break;
    case 'external': drawing = <><path d="M13 5h6v6M19 5l-9 9"/><path d="M19 13v6H5V5h6"/></>; break;
    case 'mail': drawing = <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/></>; break;
    case 'chart': drawing = <><path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/></>; break;
    case 'heart': drawing = <path d="M20.3 5.7a5 5 0 0 0-7.1 0L12 6.9l-1.2-1.2a5 5 0 0 0-7.1 7.1L12 21l8.3-8.2a5 5 0 0 0 0-7.1Z"/>; break;
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>{drawing}</svg>;
}
