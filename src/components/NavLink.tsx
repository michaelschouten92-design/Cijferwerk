'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export default function NavLink({ href, label, icon }: { href: string; label: string; icon?: ReactNode }) {
  const pathname = usePathname();
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
        active
          ? 'bg-brand-50 text-brand-700 border-l-[3px] border-brand-500 -ml-[3px]'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}>
      {icon && <span className={`w-5 h-5 shrink-0 ${active ? 'text-brand-600' : 'text-gray-400'}`}>{icon}</span>}
      {label}
    </Link>
  );
}
