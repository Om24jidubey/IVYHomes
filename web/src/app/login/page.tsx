/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1600&q=80&auto=format&fit=crop';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) throw new Error('Login failed');
      router.push('/listings');
    } catch (_err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12"
        style={{
          backgroundImage: `linear-gradient(120deg, rgba(67,56,202,0.92) 0%, rgba(99,102,241,0.85) 45%, rgba(251,113,133,0.82) 120%), url('${HERO_IMAGE}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <p className="font-display text-2xl font-medium text-white/90">Ivy Homes</p>
        <div className="max-w-md text-white">
          <p className="font-display text-4xl font-medium leading-tight">
            Every listing, checked against reality — not just the docs.
          </p>
          <p className="mt-4 text-white/85">
            Browse verified sale listings, rentals and builder projects across Gurgaon.
          </p>
        </div>
        <div />
      </div>

      <div className="relative flex flex-col items-center justify-center overflow-hidden bg-mesh p-8">
        <div className="orb -top-20 -left-20 h-72 w-72 bg-indigo-400/25" />
        <div className="orb -bottom-24 -right-10 h-72 w-72 bg-rose-400/25" />

        <form onSubmit={handleLogin} className="relative z-10 w-full max-w-sm rounded-2xl border border-line bg-surface/90 p-8 shadow-lifted backdrop-blur">
          <h1 className="mb-1 font-display text-2xl font-medium text-ink">Welcome back</h1>
          <p className="mb-6 text-sm text-ink-soft">Sign in to browse listings and manage your saved homes.</p>
          
          <div className="mb-6 rounded-lg bg-indigo-50/80 p-4 border border-indigo-100 text-sm">
             <p className="font-medium text-indigo-800 mb-1">Demo Account Access</p>
             <p className="text-indigo-700">Email: <span className="font-mono">demo1@ivy.homes</span></p>
             <p className="text-indigo-700">Password: <span className="font-mono">fe9bed489c</span></p>
          </div>

          {error && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</div>}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-ink-soft">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="demo1@ivy.homes"
              className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-indigo-400 focus:outline-none"
              required
            />
          </div>
          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-ink-soft">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="fe9bed489c"
              className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-indigo-400 focus:outline-none"
              required
            />
          </div>
          <button type="submit" className="h-11 w-full cursor-pointer rounded-xl bg-dawn-hero text-sm font-medium text-white shadow-soft transition-opacity hover:opacity-90">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
