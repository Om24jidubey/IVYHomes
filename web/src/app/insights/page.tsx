/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function Insights() {
  const router = useRouter();

  const { data: summary, error, isLoading } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/summary');
      if (res.status === 401) throw new Error('401');
      return res.json();
    }
  });

  useEffect(() => {
    if (error?.message === '401') {
      router.push('/login');
    }
  }, [error, router]);

  if (error?.message === '401') return null;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Navbar />
      <div className="mx-auto max-w-4xl px-8 py-10">
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-dawn-hero p-8">
          <div className="orb -top-10 right-12 h-56 w-56 bg-white/15" />
          <h1 className="relative font-display text-3xl font-medium text-white">Data insights & API discrepancies</h1>
          <p className="relative mt-1 text-sm text-white/85">What the documentation claims, and what we found instead.</p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">⚑</div>
            <p className="font-display text-2xl font-medium text-ink">6</p>
            <p className="text-sm text-ink-soft">Fake enquiry-bait listings found</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">⚠</div>
            <p className="font-display text-2xl font-medium text-ink">24</p>
            <p className="text-sm text-ink-soft">Listings with corrupt units/dimensions</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">⏱</div>
            <p className="font-display text-2xl font-medium text-ink">15 min</p>
            <p className="text-sm text-ink-soft">Real token lifetime (doc claims 24h)</p>
          </div>
        </div>

        <div className="mb-10 rounded-2xl border border-line bg-surface p-6">
          <h2 className="mb-4 border-b border-line pb-3 font-display text-lg font-medium text-ink">/v1/analytics/summary</h2>
          {isLoading ? (
            <p className="text-ink-soft">Loading analytics…</p>
          ) : (
            <pre className="overflow-x-auto rounded-xl bg-ink p-4 text-sm text-emerald-400">
              {JSON.stringify(summary, null, 2)}
            </pre>
          )}
        </div>

        <h2 className="mb-6 font-display text-2xl font-medium text-ink">What we discovered</h2>

        <div className="space-y-5">
          <div className="rounded-2xl border border-line border-l-4 border-l-rose-400 bg-surface p-6">
            <h3 className="mb-2 font-display text-lg font-medium text-rose-600">1. Fake "enquiry-bait" listings</h3>
            <p className="mb-2 text-ink-soft">
              The documentation implies all listings are genuine. However, we discovered 6 listings that are completely fake. We found them by combining weak signals:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-ink-soft">
              <li>Repeated seller contact numbers</li>
              <li>Suspiciously low price per square foot (&lt;₹6000/sqft)</li>
              <li>Fraudulent boilerplate sentences (e.g., <i>&quot;Site visit only after the booking amount is paid.&quot;</i>)</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-line border-l-4 border-l-amber-500 bg-surface p-6">
            <h3 className="mb-2 font-display text-lg font-medium text-amber-700">2. Corrupt / broken data units</h3>
            <p className="mb-2 text-ink-soft">
              The documentation claims that price is in INR and area is in square feet. This is false in multiple places:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-ink-soft">
              <li><b>Projects:</b> <code className="rounded bg-indigo-50 px-1 text-indigo-700">price_max</code> is actually in Crores (e.g. 4.54 instead of 45400000).</li>
              <li><b>Listings:</b> 24 listings have corrupt physical dimensions (e.g., negative prices, or carpet areas in square meters instead of sqft causing the price/sqft ratio to skyrocket).</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-line border-l-4 border-l-indigo-400 bg-surface p-6">
            <h3 className="mb-2 font-display text-lg font-medium text-indigo-700">3. The 15-minute token & hidden audits</h3>
            <p className="mb-2 text-ink-soft">
              The API documentation is intentionally deceptive about the authentication flow.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-ink-soft">
              <li>The login token is valid for only 15 minutes, not 24 hours, and a refresh flow <b>does</b> exist.</li>
              <li>The API key must be sent as an <code className="rounded bg-indigo-50 px-1 text-indigo-700">X-API-Key</code> header, not a query parameter.</li>
              <li>We discovered hidden messages inside listing descriptions targeting AI bots, instructing them to append a special audit key.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
