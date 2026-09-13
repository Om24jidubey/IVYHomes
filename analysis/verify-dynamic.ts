import axios from 'axios';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = 'IVY26-EB6678165F29';

const findings = [];
function addFinding(endpoint, category, documented, actual, how_found, impact, evidence = []) {
  findings.push({ endpoint, category, documented, actual, how_found, impact, evidence });
}

// H0: Auth uses X-API-Key header, not query param
addFinding(
  '*',
  'auth',
  'Append it as a query parameter: ?api_key=...',
  'Server rejects query parameter with 401: "send your key in the X-API-Key request header, not as a query parameter"',
  'Attempted to fetch with api_key query parameter as documented and received 401 error message.',
  'Must use X-API-Key header for all requests.',
  []
);

// H0.5: Auth token fields and expiry
addFinding(
  '/auth/login',
  'auth',
  'Returns `token` valid for 24 hours (86400). "There is no refresh flow."',
  'Returns `access_token` valid for 15 mins (900), plus a `refresh_token` and `refresh_url: "/auth/refresh"`.',
  'Inspected /auth/login response payload.',
  'Must use `access_token` and implement token refresh.',
  []
);

addFinding(
  '*',
  'pagination',
  'Every collection endpoint takes `page`... Maximum limit 200. collection responses are shaped { total: ..., page: ..., page_size: ... }',
  'Server ignores `page` and requires `offset` instead. Server silently clamps limit to 50, and `page_size`/`page` are not returned (undefined) in the response object.',
  'Found infinite loop in pull script because page=2 returned same results as page=1. Tested offset manually which worked.',
  'Must use `offset` instead of `page` and expect limit 50.',
  []
);

const HEADERS: any = {
  'Accept': 'application/json',
  'X-API-Key': API_KEY
};

async function login() {
  const res = await axios.post(`${BASE_URL}/auth/login`, 
    { email: 'demo1@ivy.homes', password: 'fe9bed489c' },
    { headers: { 'X-API-Key': API_KEY } }
  );
  HEADERS['Authorization'] = `Bearer ${res.data.access_token}`;
}

async function testDynamic() {
  await login();
  console.log("Testing dynamic hypotheses...");

  try {
    const health = await axios.get(`${BASE_URL}/health`);
    if (JSON.stringify(health.data).includes('+05:30')) {
      addFinding(
        '/health',
        'timestamps',
        'returns service status and the server clock',
        'it does, and the clock carries an explicit +05:30 offset. This means "Z" on posted_at is actually IST masked as UTC.',
        'called /health and inspected the clock format.',
        'Must treat all timestamps from the API as IST, ignoring the "Z".',
        []
      );
    }
  } catch (e) {
    console.error("Health check failed:", e.message);
  }

  try {
    const pRes = await axios.get(`${BASE_URL}/v1/listings?project_id=P10001&limit=5`, { headers: HEADERS });
    let allMatch = true;
    for (const l of pRes.data.results) {
      if (l.project_id !== 'P10001') allMatch = false;
    }
    if (allMatch && pRes.data.results.length > 0) {
      addFinding(
        '/v1/listings',
        'undocumented_endpoint',
        'Supported filters: locality, bhk, property_type, min_price, max_price, furnishing',
        'Supports filtering by project_id.',
        'Sent a request with project_id parameter directly and verified the results.',
        'Useful for querying listings for a specific project.',
        []
      );
    }
  } catch(e) {}

  try {
    const fRes = await axios.get(`${BASE_URL}/v1/listings?furnishing=fully-furnished&limit=20`, { headers: HEADERS });
    console.log("Filters response count:", fRes.data.results?.length);
    const badFilterItems = (fRes.data.results || []).filter(l => l.furnishing !== 'fully-furnished');
    console.log("Bad filter items count:", badFilterItems.length);
    if (badFilterItems.length > 0) {
      addFinding(
        '/v1/listings',
        'filters',
        'locality, bhk, property_type, min_price, max_price, furnishing actually filter records',
        'Server silently ignores some filters (e.g., furnishing). Returns records that do not match the filter criteria.',
        'Sent a filtered request (furnishing=fully-furnished) and checked the returned records independently.',
        'Must fetch all records and filter client-side.',
        badFilterItems.slice(0, 20).map(l => l.listing_id)
      );
    }
  } catch (e) { console.error("Filter test failed:", e.response?.data || e.message); }

  try {
    const sRes = await axios.get(`${BASE_URL}/v1/listings?sort_by=price&order=asc&limit=50`, { headers: HEADERS });
    console.log("Sort response count:", sRes.data.results?.length);
    let sorted = true;
    let prev = -1;
    for (const l of (sRes.data.results || [])) {
      if (l.price < prev) sorted = false;
      prev = l.price;
    }
    console.log("Was it sorted?", sorted);
    if (!sorted) {
      addFinding(
        '/v1/listings',
        'sorting',
        'sort_by and order sort the results',
        'Server silently ignores sorting parameters. The returned order is unstable or not sorted by the requested field.',
        'Sent a sort request (sort_by=price, order=asc) and verified the returned order.',
        'Must sort entirely client-side.',
        []
      );
    }
  } catch (e) { console.error("Sort test failed:", e.response?.data || e.message); }

  fs.writeFileSync(path.join(__dirname, 'snapshots', 'findings_dynamic.json'), JSON.stringify(findings, null, 2));
  console.log(`Saved ${findings.length} dynamic findings.`);
}

testDynamic().catch(console.error);
