'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: '대시보드', icon: '📊' },
  { href: '/keywords', label: '키워드 관리', icon: '🔑' },
  { href: '/logs', label: '수집 로그', icon: '📋' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <Link href="/" className="font-bold text-blue-600 dark:text-blue-400 text-sm leading-tight hover:opacity-75 transition-opacity">
          🐰 나라장터<br />
          <span className="text-slate-500 dark:text-slate-400 font-normal text-xs">입찰공고 모니터</span>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname === item.href
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
