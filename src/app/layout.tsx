import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import MobileNav from '@/components/MobileNav';
import NavLink from '@/components/NavLink';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Algo Studio — Financieel overzicht',
  description: 'Financieel overzicht voor Algo Studio',
};

const navItems = [
  { href: '/', label: 'Overzicht' },
  { href: '/transactions', label: 'Transacties' },
  { href: '/invoices', label: 'Facturen' },
  { href: '/btw', label: 'BTW' },
  { href: '/relaties', label: 'Klanten' },
  { href: '/settings', label: 'Instellingen' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Boekhouding" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
          }
        `}} />
        <Providers>
        <div className="min-h-screen flex">
          {/* Desktop sidebar */}
          <aside className="hidden lg:flex w-56 bg-white border-r border-gray-200 flex-col">
            <div className="p-5 border-b border-gray-100">
              <h1 className="text-lg font-bold text-gray-900">Algo Studio</h1>
              <p className="text-xs text-gray-400 mt-0.5">KVK 96041420</p>
            </div>
            <nav className="flex-1 p-3 space-y-0.5">
              {navItems.map(item => (
                <NavLink key={item.href} href={item.href} label={item.label} />
              ))}
            </nav>
          </aside>

          {/* Mobile nav */}
          <MobileNav />

          <main className="flex-1 p-4 pt-16 lg:p-8 lg:pt-8 overflow-auto bg-gray-50">
            {children}
          </main>
        </div>
        </Providers>
      </body>
    </html>
  );
}
