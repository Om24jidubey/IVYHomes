import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = process.env.IVY_API_KEY || 'IVY26-EB6678165F29';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let offset = 0;
  const limit = 50; // API clamps to 50
  const allResults = [];

  while (true) {
    const url = `${BASE_URL}/v1/listings?offset=${offset}&limit=${limit}`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-API-Key': API_KEY,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      if (res.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      break;
    }

    const data = await res.json();
    const results = data.results || [];
    if (results.length === 0) break;
    
    allResults.push(...results);
    offset += results.length;
  }

  return NextResponse.json({ results: allResults });
}
