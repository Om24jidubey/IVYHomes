import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = 'IVY26-EB6678165F29';
const HEADERS: any = {
  'Accept': 'application/json',
  'X-API-Key': API_KEY
};

async function login() {
  console.log("Logging in...");
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify({ email: 'demo1@ivy.homes', password: 'fe9bed489c' })
  });
  if (!res.ok) throw new Error("Login failed: " + await res.text());
  const data = await res.json();
  HEADERS['Authorization'] = `Bearer ${data.access_token}`;
  console.log("Logged in successfully.");
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string) {
  while (true) {
    try {
      const response = await fetch(url, { headers: HEADERS });
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
        console.log(`429 Rate limited. Waiting ${waitMs}ms...`);
        await sleep(waitMs);
        continue;
      }
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status} on ${url}: ${text}`);
      }
      return await response.json();
    } catch (e) {
      console.log(`Fetch failed: ${e.message}, retrying in 2 seconds...`);
      await sleep(2000);
    }
  }
}

async function pullEndpoint(endpoint: string, idKey: string) {
  console.log(`Pulling ${endpoint}...`);
  let offset = 0;
  const limit = 200; // max limit documented, server clamps to 50
  const allResults = [];
  let initialTotal = null;

  while (true) {
    const url = `${BASE_URL}${endpoint}?offset=${offset}&limit=${limit}`;
    const data = await fetchWithRetry(url);
    
    if (initialTotal === null) {
      initialTotal = data.total;
    }

    const results = data.results || [];
    if (results.length === 0) {
      console.log(`Offset ${offset} returned empty results. Done pulling ${endpoint}.`);
      break;
    }

    console.log(`Offset ${offset}: got ${results.length} records. (Server page_size: ${data.page_size}, Server total: ${data.total})`);
    allResults.push(...results);
    offset += results.length;
  }

  // Deduplicate
  const seen = new Set();
  const deduped = [];
  for (const item of allResults) {
    const id = item[idKey];
    if (!seen.has(id)) {
      seen.add(id);
      deduped.push(item);
    }
  }

  console.log(`Endpoint ${endpoint}: Initial total reported was ${initialTotal}. Actual collected (deduped): ${deduped.length}. Total raw: ${allResults.length}`);
  return {
    meta: {
      initial_total: initialTotal,
      raw_count: allResults.length,
      deduped_count: deduped.length
    },
    data: deduped
  };
}

async function main() {
  await login();
  const snapshotsDir = path.join(__dirname, 'snapshots');
  if (!fs.existsSync(snapshotsDir)) {
    fs.mkdirSync(snapshotsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const listings = await pullEndpoint('/v1/listings', 'listing_id');
  fs.writeFileSync(path.join(snapshotsDir, `listings.json`), JSON.stringify(listings, null, 2));
  
  const rentals = await pullEndpoint('/v1/rentals', 'listing_id');
  fs.writeFileSync(path.join(snapshotsDir, `rentals.json`), JSON.stringify(rentals, null, 2));
  
  const projects = await pullEndpoint('/v1/projects', 'project_id');
  fs.writeFileSync(path.join(snapshotsDir, `projects.json`), JSON.stringify(projects, null, 2));

  console.log(`Saved snapshots to ${snapshotsDir}`);
}

main().catch(console.error);
