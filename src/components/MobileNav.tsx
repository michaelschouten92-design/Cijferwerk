'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LayoutDashboard, ArrowLeftRight, FileText, BookOpen, Percent, Users, Settings } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Overzicht', icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/transactions', label: 'Transacties', icon: <ArrowLeftRight className="w-4 h-4" /> },
  { href: '/invoices', label: 'Facturen', icon: <FileText className="w-4 h-4" /> },
  { href: '/kasboek', label: 'Kasboek', icon: <BookOpen className="w-4 h-4" /> },
  { href: '/btw', label: 'BTW', icon: <Percent className="w-4 h-4" /> },
  { href: '/relaties', label: 'Klanten', icon: <Users className="w-4 h-4" /> },
  { href: '/settings', label: 'Instellingen', icon: <Settings className="w-4 h-4" /> },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">C</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">Cijferwerk</h1>
        </div>
        <button onClick={() => setOpen(!open)} className="p-2 text-gray-600 hover:text-gray-900">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <nav className="absolute top-14 left-0 right-0 bg-white border-b border-gray-100 shadow-lg p-3 animate-fade-in-up"
            onClick={e => e.stopPropagation()}>
            {navItems.map(item => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}>
                  <span className={active ? 'text-brand-600' : 'text-gray-400'}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
