/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { use, useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function ListingDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = use(params);

  const { data: listing, error, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      const res = await fetch(`/api/listings/${id}`);
      if (res.status === 401) throw new Error('401');
      return res.json();
    }
  });

  const { data: favs } = useQuery({
    queryKey: ['favourites'],
    queryFn: async () => {
      const res = await fetch('/api/favourites');
      return res.json();
    }
  });

  const isFav = favs?.results?.some((f: any) => f.listing_id === id);

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (isFav) {
        await fetch(`/api/favourites/${id}`, { method: 'DELETE' });
      } else {
        await fetch('/api/favourites', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ listing_id: id })
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favourites'] });
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
        <Link href="/listings" className="mb-6 inline-block text-sm font-medium text-indigo-700 hover:underline cursor-pointer">← Back to listings</Link>

        {isLoading ? (
          <div className="py-20 text-center text-ink-soft">Loading…</div>
        ) : listing ? (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="relative h-64 overflow-hidden sm:h-80">
              <img
                src={`https://picsum.photos/seed/${id}/1200/700`}
                alt={listing.apartment_name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
              <button
                onClick={() => toggleFav.mutate()}
                className={
                  isFav
                    ? 'absolute right-6 top-6 cursor-pointer rounded-full border border-rose-200 bg-white/95 px-4 py-2 text-sm font-medium text-rose-600 backdrop-blur'
                    : 'absolute right-6 top-6 cursor-pointer rounded-full border border-white/40 bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/30'
                }
              >
                {isFav ? '♥ Saved' : '♡ Save'}
              </button>
              <div className="absolute bottom-6 left-6 text-white">
                <h1 className="font-display text-3xl font-medium">{listing.apartment_name}</h1>
                <p className="mt-1 text-white/85">{listing.locality} • {listing.city_id === 6 ? 'Gurgaon' : listing.city_id}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 bg-canvas p-1">
              {[1, 2, 3].map((n) => (
                <img
                  key={n}
                  src={`https://picsum.photos/seed/${id}-${n}/500/320`}
                  alt=""
                  loading="lazy"
                  className="h-24 w-full rounded-lg object-cover sm:h-32"
                />
              ))}
            </div>

            <div className="p-8">
              <div className="mb-8 grid grid-cols-2 gap-6 rounded-2xl border border-line bg-canvas p-6 md:grid-cols-4">
                <div>
                  <p className="text-xs text-ink-faint">Price</p>
                  <p className="font-display text-xl font-medium text-indigo-700">₹{(listing.price / 100000).toFixed(2)} L</p>
                </div>
                <div>
                  <p className="text-xs text-ink-faint">Area</p>
                  <p className="font-display text-xl font-medium text-ink">{listing.carpet_area} sqft</p>
                </div>
                <div>
                  <p className="text-xs text-ink-faint">Configuration</p>
                  <p className="font-display text-xl font-medium text-ink">{listing.bedroom}B / {listing.bathroom}B</p>
                </div>
                <div>
                  <p className="text-xs text-ink-faint">Floor</p>
                  <p className="font-display text-xl font-medium text-ink">{listing.floor} / {listing.total_floors}</p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="mb-2 font-display text-lg font-medium text-ink">Description</h3>
                <p className="whitespace-pre-wrap leading-relaxed text-ink-soft">{listing.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-6 border-t border-line pt-6">
                <div>
                  <p className="text-xs text-ink-faint">Posted by</p>
                  <p className="font-medium text-ink">{listing.posted_by_name} ({listing.posted_by})</p>
                  <p className="text-indigo-700">{listing.posted_by_contact}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-faint">Features</p>
                  <p className="capitalize text-ink-soft">{listing.furnishing}</p>
                  <p className="capitalize text-ink-soft">Facing: {listing.facing_direction}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-ink-soft">Listing not found.</p>
        )}
      </div>
    </div>
  );
}
