/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function Saved() {
  const router = useRouter();

  const { data: favs, error, isLoading: favLoading } = useQuery({
    queryKey: ['favourites'],
    queryFn: async () => {
      const res = await fetch('/api/favourites');
      if (res.status === 401) throw new Error('401');
      return res.json();
    }
  });

  const { data: allListingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ['listings-all'],
    queryFn: async () => {
      const firstRes = await fetch('/api/listings?offset=0&limit=50');
      if (firstRes.status === 401) throw new Error('401');
      const firstData = await firstRes.json();
      
      const total = firstData.total || 0;
      let allResults = [...(firstData.results || [])];
      
      const promises = [];
      for (let offset = 50; offset < total; offset += 50) {
        promises.push(
          fetch(`/api/listings?offset=${offset}&limit=50`).then(res => res.json())
        );
      }
      
      const remainingPages = await Promise.all(promises);
      remainingPages.forEach(page => {
        if (page.results) allResults.push(...page.results);
      });
      
      return { results: allResults };
    }
  });

  useEffect(() => {
    if (error?.message === '401') {
      router.push('/login');
    }
  }, [error, router]);

  const savedListings = allListingsData?.results?.filter((l: any) =>
    favs?.results?.some((f: any) => f.listing_id === l.listing_id)
  ) || [];

  if (error?.message === '401') return null;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Navbar />
      <div className="mx-auto max-w-6xl px-8 py-10">
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-dawn-hero p-8">
          <div className="orb -bottom-16 right-10 h-56 w-56 bg-white/15" />
          <h1 className="relative font-display text-3xl font-medium text-white">Saved listings</h1>
          <p className="relative mt-1 text-sm text-white/85">Everything you've favourited, in one place.</p>
        </div>

        {(favLoading || listingsLoading) ? (
          <div className="py-20 text-center text-ink-soft">Loading…</div>
        ) : savedListings.length === 0 ? (
          <p className="text-ink-faint">You haven't saved any listings yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {savedListings.map((listing: any) => (
              <Link href={`/listings/${listing.listing_id}`} key={listing.listing_id}>
                <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-rose-100 bg-surface transition-shadow hover:shadow-lifted cursor-pointer">
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={`https://picsum.photos/seed/${listing.listing_id}/600/360`}
                      alt={listing.apartment_name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
                    <span className="absolute left-3 top-3 rounded-full bg-rose-500/90 px-2.5 py-1 text-xs font-medium text-white">
                      ♥ Saved
                    </span>
                    <p className="absolute bottom-3 left-4 font-display text-lg font-medium text-white">
                      ₹{(listing.price / 100000).toFixed(2)} L
                    </p>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="font-medium text-ink">{listing.apartment_name}</h2>
                    <p className="flex-grow text-sm text-ink-faint">{listing.locality}</p>
                    <p className="mt-3 border-t border-line pt-3 text-sm text-ink-soft">{listing.bedroom} BHK • {listing.carpet_area} sqft</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
