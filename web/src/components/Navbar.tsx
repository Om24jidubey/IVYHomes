/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/listings', label: 'Browse' },
  { href: '/rentals', label: 'Rentals' },
  { href: '/projects', label: 'Projects' },
  { href: '/saved', label: 'Saved' },
  { href: '/insights', label: 'Insights' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-4">
        <Link href="/listings" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-dawn-hero font-display text-sm font-semibold text-white">
            I
          </span>
          <span className="font-display text-xl font-medium text-ink">
            Ivy <span className="text-gradient">Homes</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? 'rounded-full bg-dawn-hero px-4 py-2 text-sm font-medium text-white shadow-soft'
                    : 'rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-indigo-50/60 hover:text-indigo-700'
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => {
            fetch('/api/auth/logout', { method: 'POST' }).then(() => router.push('/login'));
          }}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-rose-400 hover:text-rose-600 cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
