'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

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

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900">Algo Studio</h1>
        <button onClick={() => setOpen(!open)} className="p-2 text-gray-600 hover:text-gray-900">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setOpen(false)}>
          <nav className="absolute top-14 left-0 right-0 bg-white border-b border-gray-200 shadow-lg p-3"
            onClick={e => e.stopPropagation()}>
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
