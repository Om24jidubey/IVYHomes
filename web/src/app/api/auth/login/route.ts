/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
import { NextResponse } from 'next/server';

const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = process.env.IVY_API_KEY || 'IVY26-EB6678165F29';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Login failed' }, { status: res.status });
    }

    const data = await res.json();
    
    // Set cookie
    const response = NextResponse.json({ success: true, user: data.user });
    response.cookies.set({
      name: 'auth_token',
      value: data.access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });
    
    response.cookies.set({
      name: 'refresh_token',
      value: data.refresh_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
