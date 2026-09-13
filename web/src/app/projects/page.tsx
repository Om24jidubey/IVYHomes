/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function Projects() {
  const router = useRouter();

  const { data, error, isLoading } = useQuery({
    queryKey: ['projects-all'],
    queryFn: async () => {
      let offset = 0;
      const allResults = [];
      while (true) {
        const res = await fetch(`/api/projects?offset=${offset}&limit=50`);
        if (res.status === 401) throw new Error('401');
        const d = await res.json();
        if (!d.results || d.results.length === 0) break;
        allResults.push(...d.results);
        offset += d.results.length;
      }
      return allResults;
    }
  });

  const { data: listingsData } = useQuery({
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

  const projects = data || [];
  const allListings = listingsData?.results || [];

  const listingCounts = allListings.reduce((acc: any, curr: any) => {
    if (curr.is_live !== false) {
      acc[curr.project_id] = (acc[curr.project_id] || 0) + 1;
    }
    return acc;
  }, {});

  if (error?.message === '401') return null;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Navbar />
      <div className="mx-auto max-w-6xl px-8 py-10">
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-dawn-hero p-8">
          <div className="orb -top-14 right-16 h-56 w-56 bg-white/15" />
          <h1 className="relative font-display text-3xl font-medium text-white">Projects</h1>
          <p className="relative mt-1 text-sm text-white/85">Builder projects, cross-checked against actual live listing counts.</p>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-ink-soft">Loading projects…</div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {projects.map((project: any) => {
              const actualCount = listingCounts[project.project_id] || 0;
              const hasDiscrepancy = actualCount !== project.total_listings;
              
              const posYear = project.possession_date ? project.possession_date.split('-')[0] : 'Unknown';

              return (
                <div key={project.project_id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={`https://picsum.photos/seed/${project.project_id}/600/360`}
                      alt={project.apartment_name || project.project_id}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
                    <p className="absolute bottom-3 left-4 font-display text-lg font-medium text-white">{project.apartment_name}</p>
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <p className="mb-4 text-sm text-ink-faint">{project.developer_name} • Possession {posYear}</p>

                    <div className="mb-4 grid flex-grow grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-ink-faint">Min price</p>
                        <p className="font-display text-lg font-medium text-ink">₹{((project.price_min * 10000000) / 100000).toFixed(2)} L</p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-faint">Max price</p>
                        <p className="font-display text-lg font-medium text-ink">₹{((project.price_max * 10000000) / 100000).toFixed(2)} L</p>
                      </div>
                    </div>

                    <div className={
                      hasDiscrepancy
                        ? 'rounded-xl border border-amber-500/30 bg-amber-50 p-3 text-sm text-amber-700'
                        : 'rounded-xl border border-emerald-500/30 bg-emerald-50 p-3 text-sm text-emerald-700'
                    }>
                      <p className="font-medium">Listings available</p>
                      <p>Documented: {project.total_listings}</p>
                      <p>Actual computed: {actualCount}</p>
                      {hasDiscrepancy && <p className="mt-1 text-xs">⚠ The API's documented count doesn't match reality here.</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
