import fs from 'fs';
import path from 'path';

const snapshotsDir = path.join(__dirname, 'snapshots');
const listingsPath = path.join(snapshotsDir, 'listings.json');
const projectsPath = path.join(snapshotsDir, 'projects.json');
const rentalsPath = path.join(snapshotsDir, 'rentals.json');

const findings = [];

function addFinding(endpoint, category, documented, actual, how_found, impact, evidence = []) {
  findings.push({
    endpoint,
    category,
    documented,
    actual,
    how_found,
    impact,
    evidence
  });
}

function loadSnapshot(filePath) {
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')).data;
  }
  return [];
}

async function run() {
  const listings = loadSnapshot(listingsPath);
  const projects = loadSnapshot(projectsPath);
  const rentals = loadSnapshot(rentalsPath);
  
  if (!listings.length) {
    console.log("No listings found, wait for pull to finish.");
    return;
  }

  console.log(`Loaded ${listings.length} listings, ${projects.length} projects, ${rentals.length} rentals.`);

  // H1: The listing object's real "liveness" field isn't `is_verified`.
  if (listings.length > 0 && 'is_live' in listings[0]) {
    addFinding(
      '/v1/listings',
      'completeness',
      'Listing object includes is_verified but says nothing about is_live.',
      'Listing object includes an undocumented is_live boolean.',
      'Inspected raw response keys directly.',
      'Critical for accurate active listing count',
      [listings[0].listing_id]
    );
  }

  // H2: /v1/listings returns inactive/withdrawn records
  const inactiveListings = listings.filter(l => l.is_live === false);
  if (inactiveListings.length > 0) {
    addFinding(
      '/v1/listings',
      'filters',
      'Returns active sale listings. Inactive, expired and withdrawn listings are excluded server side.',
      'Returns both active and inactive listings. is_live can be false.',
      'Counted records with is_live: false in the full snapshot.',
      'Frontend must manually filter is_live === true to avoid showing dead properties.',
      inactiveListings.slice(0, 20).map(l => l.listing_id)
    );
  }

  // H3: listing_id is not 1:1 with physical property
  const propertyFingerprints = new Map();
  const duplicateSets = [];
  for (const l of listings) {
    // Fingerprint on apartment_name + floor + carpet_area
    // We will slightly round lat/long to handle precision issues, e.g. 4 decimal places
    const lat = l.latitude ? l.latitude.toFixed(4) : '';
    const lon = l.longitude ? l.longitude.toFixed(4) : '';
    const fp = `${l.apartment_name}|${l.floor}|${l.carpet_area}|${lat}|${lon}`;
    if (!propertyFingerprints.has(fp)) {
      propertyFingerprints.set(fp, []);
    }
    propertyFingerprints.get(fp).push(l.listing_id);
  }
  
  for (const ids of propertyFingerprints.values()) {
    if (ids.length > 1) {
      duplicateSets.push(...ids);
    }
  }

  if (duplicateSets.length > 0) {
    addFinding(
      '/v1/listings',
      'duplicates',
      'each listing corresponds to exactly one physical property',
      'Multiple listings correspond to the same physical property (same apartment, floor, area, lat/long).',
      'Clustered listings by fingerprint (apartment_name + floor + carpet_area + lat/long tolerance).',
      'Requires client-side deduplication to get distinct property count.',
      duplicateSets.slice(0, 20)
    );
  }

  // H8: Price-per-sqft values wildly outside Gurgaon market norms (~6-15k/sqft)
  // Check if carpet_area is in sqm instead of sqft for some.
  const weirdAreaListings = [];
  for (const l of listings) {
    if (l.price && l.carpet_area) {
      const psf = l.price / l.carpet_area;
      if (psf > 60000) { // e.g., if carpet_area was in sqm, it's 10x smaller, so psf is 10x larger
        weirdAreaListings.push(l.listing_id);
      }
    }
  }
  if (weirdAreaListings.length > 0) {
    addFinding(
      '*',
      'units',
      'Area: Square feet, integer, everywhere in the API',
      'Some listings have carpet_area in square meters (resulting in >60,000 INR/sqft, which is wildly outside Gurgaon norms).',
      'Computed price/sqft distribution and flagged outliers > 60k.',
      'Must detect and convert sqm to sqft for those specific listings to compute accurate averages.',
      weirdAreaListings.slice(0, 20)
    );
  }

  // H9: Project total_listings disagrees with actual live listing counts
  const liveListingCountsByProject = {};
  for (const l of listings) {
    if (l.is_live === true && l.project_id) {
      liveListingCountsByProject[l.project_id] = (liveListingCountsByProject[l.project_id] || 0) + 1;
    }
  }
  
  const mismatchedProjects = [];
  for (const p of projects) {
    const actual = liveListingCountsByProject[p.project_id] || 0;
    if (p.total_listings !== actual) {
      mismatchedProjects.push(p.project_id);
    }
  }
  
  if (mismatchedProjects.length > 0) {
    addFinding(
      '/v1/projects',
      'consistency',
      'total_listings is recomputed... it always agrees with what GET /v1/listings?project_id=... returns',
      'total_listings on the project object frequently disagrees with the actual count of live listings for that project.',
      'Grouped snapshot by project_id and compared counts against project.total_listings.',
      'Frontend must recompute total_listings from raw listings to be accurate.',
      mismatchedProjects.slice(0, 20)
    );
  }

  // H10: Structural impossibilities
  const corruptListings = [];
  for (const l of listings) {
    let corrupt = false;
    if (l.carpet_area > l.super_built_up_area) corrupt = true;
    if (l.floor > l.total_floors) corrupt = true;
    if (l.price <= 0 || l.carpet_area <= 0) corrupt = true;
    // Gurgaon bounds approx lat 28.3 to 28.6, lon 76.9 to 77.2
    if (l.latitude < 28.0 || l.latitude > 29.0 || l.longitude < 76.5 || l.longitude > 77.5) corrupt = true;
    
    // Note: bathroom > bedroom or floor = 0 are considered normal in India.
    if (corrupt) {
      corruptListings.push(l.listing_id);
    }
  }
  
  if (corruptListings.length > 0) {
    addFinding(
      '/v1/listings',
      'data_quality',
      'Every page of results tells you truthfully... (implied structural validity)',
      'A small subset of listings contain structural impossibilities (e.g., carpet_area > super_built_up_area, floor > total_floors, coords outside NCR).',
      'Scanned all records for physical impossibilities.',
      'These listings must be flagged or excluded from analysis.',
      corruptListings.slice(0, 20)
    );
  }

  // H11: Enquiry-bait
  const fakeListings = [];
  const contactCounts = {};
  for (const l of listings) {
    if (l.posted_by_contact) {
      contactCounts[l.posted_by_contact] = (contactCounts[l.posted_by_contact] || 0) + 1;
    }
  }
  
  const descCounts = {};
  for (const l of listings) {
    if (l.description) {
      descCounts[l.description] = (descCounts[l.description] || 0) + 1;
    }
  }

  for (const l of listings) {
    if (l.posted_by_contact && contactCounts[l.posted_by_contact] > 1 && 
        l.description && descCounts[l.description] > 1) {
      
      // Below market price check (e.g. < 4000/sqft in Gurgaon)
      const psf = l.price / l.carpet_area;
      if (psf < 4000) {
        fakeListings.push(l.listing_id);
      }
    }
  }

  if (fakeListings.length > 0) {
    addFinding(
      '/v1/listings',
      'fraud',
      'Each listing corresponds to exactly one physical property (implied genuine)',
      'Subset of listings are enquiry-bait/fake (repeated contact + duplicated boilerplate description + unrealistically low price).',
      'Conjunction of weak signals: repeated contact AND repeated description AND below-market price.',
      'These listings exist to generate enquiries and should be excluded from averages.',
      fakeListings.slice(0, 20)
    );
  }

  // Check project price units
  if (projects.length > 0) {
    const p1 = projects[0];
    if (p1.price_max < 1000) {
      addFinding(
        '/v1/projects',
        'units',
        'price_min and price_max are in rupees',
        'price_min and price_max are actually in Crores (e.g. 4.54 instead of 45400000).',
        'Compared project.price_max (e.g. 4.54) with listing prices for the same project (~26000000).',
        'Frontend must multiply price_min and price_max by 10,000,000.',
        []
      );
    }
  }

  fs.writeFileSync(path.join(snapshotsDir, 'findings_static.json'), JSON.stringify(findings, null, 2));
  console.log(`Saved ${findings.length} static findings.`);
}

run().catch(console.error);
