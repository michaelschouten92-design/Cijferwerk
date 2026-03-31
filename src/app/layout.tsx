import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import MobileNav from '@/components/MobileNav';

export const metadata: Metadata = {
  title: 'Algo Studio — Financieel overzicht',
  description: 'Financieel overzicht voor Algo Studio',
};

const navItems = [
  { href: '/', label: 'Overzicht' },
  { href: '/transactions', label: 'Transacties' },
  { href: '/invoices', label: 'Facturen' },
  { href: '/btw', label: 'BTW' },
  { href: '/activa', label: 'Bezittingen' },
  { href: '/relaties', label: 'Klanten' },
  { href: '/categorieen', label: 'Categorieën' },
  { href: '/settings', label: 'Instellingen' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <div className="min-h-screen flex">
          {/* Desktop sidebar */}
          <aside className="hidden lg:flex w-56 bg-white border-r border-gray-200 flex-col">
            <div className="p-5 border-b border-gray-100">
              <h1 className="text-lg font-bold text-gray-900">Algo Studio</h1>
              <p className="text-xs text-gray-400 mt-0.5">KVK 96041420</p>
            </div>
            <nav className="flex-1 p-3 space-y-0.5">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Mobile nav */}
          <MobileNav />

          <main className="flex-1 p-4 pt-16 lg:p-8 lg:pt-8 overflow-auto bg-gray-50">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
