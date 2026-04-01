import './globals.css';
import type { Metadata } from 'next';
import MobileNav from '@/components/MobileNav';
import NavLink from '@/components/NavLink';
import Providers from '@/components/Providers';
import { LayoutDashboard, ArrowLeftRight, FileText, BookOpen, Percent, Users, Settings } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cijferwerk',
  description: 'Cijferwerk voor ZZP\'ers',
};

const navItems = [
  { href: '/', label: 'Overzicht', icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: '/transactions', label: 'Transacties', icon: <ArrowLeftRight className="w-5 h-5" /> },
  { href: '/invoices', label: 'Facturen', icon: <FileText className="w-5 h-5" /> },
  { href: '/kasboek', label: 'Kasboek', icon: <BookOpen className="w-5 h-5" /> },
  { href: '/btw', label: 'BTW', icon: <Percent className="w-5 h-5" /> },
  { href: '/relaties', label: 'Klanten', icon: <Users className="w-5 h-5" /> },
  { href: '/settings', label: 'Instellingen', icon: <Settings className="w-5 h-5" /> },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Cijferwerk" />
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
          <aside className="hidden lg:flex w-56 bg-[#fbfbf9] border-r border-gray-100 flex-col">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <h1 className="text-lg font-bold text-gray-900 tracking-tight">Cijferwerk</h1>
              </div>
            </div>
            <nav className="flex-1 p-3 space-y-0.5">
              {navItems.map(item => (
                <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
              ))}
            </nav>
          </aside>

          {/* Mobile nav */}
          <MobileNav />

          <main className="flex-1 p-4 pt-16 lg:p-8 lg:pt-8 overflow-auto">
            {children}
          </main>
        </div>
        </Providers>
      </body>
    </html>
  );
}
