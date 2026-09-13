/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function Listings() {
  const router = useRouter();

  const { data, error, isLoading } = useQuery({
    queryKey: ['listings-all'],
    queryFn: async () => {
      // Fetch first page to get total count
      const firstRes = await fetch('/api/listings?offset=0&limit=50');
      if (firstRes.status === 401) throw new Error('401');
      const firstData = await firstRes.json();
      
      const total = firstData.total || 0;
      let allResults = [...(firstData.results || [])];
      
      // Fetch the rest in parallel for speed!
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

  const [localityFilter, setLocalityFilter] = useState('');
  const [bhkFilter, setBhkFilter] = useState('');
  const [furnishingFilter, setFurnishingFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (error?.message === '401') {
      router.push('/login');
    }
  }, [error, router]);

  const allListings = useMemo(() => data?.results || [], [data?.results]);

  const filtered = useMemo(() => {
    const result = allListings.filter((l: any) => {
      if (localityFilter && l.locality.toLowerCase() !== localityFilter.toLowerCase()) return false;
      if (bhkFilter && l.bedroom.toString() !== bhkFilter) return false;
      if (furnishingFilter && l.furnishing !== furnishingFilter) return false;
      
      if (priceFilter === 'under-1') {
        if (l.price >= 10000000) return false;
      } else if (priceFilter === '1-to-3') {
        if (l.price < 10000000 || l.price > 30000000) return false;
      } else if (priceFilter === 'over-3') {
        if (l.price <= 30000000) return false;
      }

      if (l.is_live === false) return false;
      return true;
    });

    if (sortOrder === 'asc') {
      result.sort((a: any, b: any) => a.price - b.price);
    } else if (sortOrder === 'desc') {
      result.sort((a: any, b: any) => b.price - a.price);
    }

    return result;
  }, [allListings, localityFilter, bhkFilter, furnishingFilter, priceFilter, sortOrder]);

  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const formatPrice = (price: number) => {
    if (price < 1000) return `₹${price} L`; // Handle corrupt data
    return `₹${(price / 100000).toFixed(2)} L`;
  };

  if (error?.message === '401') return null;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Navbar />

      <div className="mx-auto max-w-6xl px-8 py-10">
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-dawn-hero p-8">
          <div className="orb -top-12 right-10 h-56 w-56 bg-white/15" />
          <h1 className="relative font-display text-3xl font-medium text-white">Browse listings</h1>
          <p className="relative mt-1 text-sm text-white/85">{filtered.length} live listings match your filters right now.</p>
        </div>

        <div className="mb-6 flex flex-wrap gap-3 rounded-2xl border border-line bg-surface p-4">
          <select className="cursor-pointer h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-indigo-400 focus:outline-none" value={localityFilter} onChange={e => {setLocalityFilter(e.target.value); setPage(1);}}>
            <option value="">All localities</option>
            <option value="dwarka expressway">Dwarka Expressway</option>
            <option value="sector 65">Sector 65</option>
            <option value="sector 82">Sector 82</option>
            <option value="golf course road">Golf Course Road</option>
          </select>

          <select className="cursor-pointer h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-indigo-400 focus:outline-none" value={bhkFilter} onChange={e => {setBhkFilter(e.target.value); setPage(1);}}>
            <option value="">All BHKs</option>
            <option value="1">1 BHK</option>
            <option value="2">2 BHK</option>
            <option value="3">3 BHK</option>
            <option value="4">4 BHK</option>
            <option value="5">5+ BHK</option>
          </select>

          <select className="cursor-pointer h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-indigo-400 focus:outline-none" value={furnishingFilter} onChange={e => {setFurnishingFilter(e.target.value); setPage(1);}}>
            <option value="">All furnishing</option>
            <option value="fully-furnished">Fully furnished</option>
            <option value="semi-furnished">Semi furnished</option>
            <option value="unfurnished">Unfurnished</option>
          </select>

          <select className="cursor-pointer h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-indigo-400 focus:outline-none" value={priceFilter} onChange={e => {setPriceFilter(e.target.value); setPage(1);}}>
            <option value="">All prices</option>
            <option value="under-1">Under ₹1 Cr</option>
            <option value="1-to-3">₹1 Cr - ₹3 Cr</option>
            <option value="over-3">Over ₹3 Cr</option>
          </select>

          <select className="cursor-pointer h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-indigo-400 focus:outline-none" value={sortOrder} onChange={e => {setSortOrder(e.target.value); setPage(1);}}>
            <option value="">Sort by price</option>
            <option value="asc">Price: low to high</option>
            <option value="desc">Price: high to low</option>
          </select>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-ink-soft">Loading {allListings.length > 0 ? allListings.length : '…'} listings…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {paginated.map((listing: any) => (
                <Link href={`/listings/${listing.listing_id}`} key={listing.listing_id}>
                  <div className="group h-full overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-lifted cursor-pointer">
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={`https://picsum.photos/seed/${listing.listing_id}/600/400`}
                        alt={listing.apartment_name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                      <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-ink-soft backdrop-blur">
                        {listing.bedroom} BHK
                      </span>
                      <p className="absolute bottom-3 left-4 font-display text-xl font-medium text-white">
                        {formatPrice(listing.price)}
                      </p>
                    </div>
                    <div className="space-y-1.5 p-5">
                      <h2 className="truncate font-medium text-ink">{listing.apartment_name}</h2>
                      <p className="truncate text-sm text-ink-faint">{listing.locality} • {listing.property_type}</p>
                      <p className="text-sm text-ink-soft">{listing.carpet_area} sqft</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="sticky bottom-4 mt-8 flex items-center justify-between rounded-2xl border border-line bg-surface/95 p-4 shadow-lifted backdrop-blur">
              <button
                disabled={page === 1}
                onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="cursor-pointer rounded-xl bg-dawn-hero px-5 py-2 text-sm font-medium text-white shadow-soft disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="text-sm font-medium text-ink-soft">Page {page} of {Math.ceil(filtered.length / itemsPerPage) || 1} · {filtered.length} total</span>
              <button
                disabled={page >= Math.ceil(filtered.length / itemsPerPage)}
                onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="cursor-pointer rounded-xl bg-dawn-hero px-5 py-2 text-sm font-medium text-white shadow-soft disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
