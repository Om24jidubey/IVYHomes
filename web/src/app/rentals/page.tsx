/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function Rentals() {
  const router = useRouter();

  const { data, error, isLoading } = useQuery({
    queryKey: ['rentals-all'],
    queryFn: async () => {
      let offset = 0;
      const allResults = [];
      while (true) {
        const res = await fetch(`/api/rentals?offset=${offset}&limit=50`);
        if (res.status === 401) throw new Error('401');
        const d = await res.json();
        if (!d.results || d.results.length === 0) break;
        allResults.push(...d.results);
        offset += d.results.length;
      }
      return allResults;
    }
  });

  useEffect(() => {
    if (error?.message === '401') {
      router.push('/login');
    }
  }, [error, router]);

  const rentals = data || [];

  if (error?.message === '401') return null;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Navbar />
      <div className="mx-auto max-w-6xl px-8 py-10">
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-dawn-hero p-8">
          <div className="orb -bottom-16 left-10 h-56 w-56 bg-white/15" />
          <h1 className="relative font-display text-3xl font-medium text-white">Rentals</h1>
          <p className="relative mt-1 text-sm text-white/85">{rentals.length} rental listings currently retrievable.</p>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-ink-soft">Loading rentals…</div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {rentals.map((rental: any) => (
              <div key={rental.listing_id} className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface cursor-pointer hover:shadow-lifted transition-shadow">
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={`https://picsum.photos/seed/${rental.listing_id}/600/360`}
                    alt={rental.apartment_name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
                  <p className="absolute bottom-3 left-4 font-display text-lg font-medium text-white">
                    ₹{rental.price?.toLocaleString()}/mo
                  </p>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-medium text-ink">{rental.apartment_name}</h2>
                  <p className="mt-1 flex-grow text-sm text-ink-faint">{rental.locality} • {rental.property_type}</p>
                  <p className="mt-3 border-t border-line pt-3 text-sm text-ink-soft">{rental.bedroom} BHK • {rental.carpet_area} sqft</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
