/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = process.env.IVY_API_KEY || 'IVY26-EB6678165F29';

export async function proxyRequest(request: NextRequest, endpoint: string) {
  let token = request.cookies.get('auth_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  if (!token) {
    if (!refreshToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const upstreamUrl = `${BASE_URL}${endpoint}?${searchParams.toString()}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-API-Key': API_KEY,
    'Authorization': `Bearer ${token}`
  };

  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  // We need to read body first if we might retry
  const reqBody = (request.method !== 'GET' && request.method !== 'HEAD') ? await request.text() : undefined;

  let res = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    cache: 'no-store',
    ...(reqBody !== undefined && { body: reqBody })
  });

  let newAuthToken = null;
  let newRefreshToken = null;

  // Handle 401 token expiration
  if (res.status === 401 && refreshToken) {
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      newAuthToken = refreshData.access_token;
      newRefreshToken = refreshData.refresh_token;

      // Retry original request with new token
      headers['Authorization'] = `Bearer ${newAuthToken}`;
      res = await fetch(upstreamUrl, {
        method: request.method,
        headers,
        cache: 'no-store',
        ...(reqBody !== undefined && { body: reqBody })
      });
    }
  }

  const data = await res.text();
  let finalRes: NextResponse;
  
  try {
    finalRes = NextResponse.json(JSON.parse(data), { status: res.status });
  } catch (_e) {
    finalRes = new NextResponse(data, { status: res.status, headers: { 'Content-Type': 'text/plain' } });
  }

  // Update cookies on the client if we refreshed
  if (newAuthToken) {
    finalRes.cookies.set({
      name: 'auth_token',
      value: newAuthToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
  }
  if (newRefreshToken) {
    finalRes.cookies.set({
      name: 'refresh_token',
      value: newRefreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
  }

  return finalRes;
}
