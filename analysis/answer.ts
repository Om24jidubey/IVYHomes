import fs from 'fs';
import path from 'path';

const snapshotsDir = path.join(__dirname, 'snapshots');
const listings = JSON.parse(fs.readFileSync(path.join(snapshotsDir, 'listings.json'), 'utf-8')).data;
const rentals = JSON.parse(fs.readFileSync(path.join(snapshotsDir, 'rentals.json'), 'utf-8')).data;
const projects = JSON.parse(fs.readFileSync(path.join(snapshotsDir, 'projects.json'), 'utf-8')).data;

const answers: any = {};

// 1. total_listing_records
answers.total_listing_records = listings.length;

// 2. unique_properties
const propertyFingerprints = new Set();
for (const l of listings) {
  const fp = `${l.apartment_name}|${l.floor}|${l.carpet_area}`;
  propertyFingerprints.add(fp);
}
answers.unique_properties = propertyFingerprints.size;

// 3. active_listings
answers.active_listings = listings.filter((l: any) => l.is_live === true).length;

// 4. corrupt_listing_ids
const corruptIds = [];
for (const l of listings) {
  let corrupt = false;
  if (l.carpet_area > l.super_built_up_area) corrupt = true;
  if (l.floor > l.total_floors) corrupt = true;
  if (l.price <= 0 || l.carpet_area <= 0) corrupt = true;
  if (l.latitude < 28.0 || l.latitude > 29.0 || l.longitude < 76.5 || l.longitude > 77.5) corrupt = true;
  
  if (corrupt) {
    corruptIds.push(l.listing_id);
  }
}
corruptIds.sort();
answers.corrupt_listing_ids = corruptIds;

// 9. fake_listing_ids
// First identify repeated contacts and descriptions
const contactCounts: any = {};
const descCounts: any = {};
for (const l of listings) {
  if (l.posted_by_contact) {
    contactCounts[l.posted_by_contact] = (contactCounts[l.posted_by_contact] || 0) + 1;
  }
  if (l.description) {
    descCounts[l.description] = (descCounts[l.description] || 0) + 1;
  }
}

const fakeIds = [];
for (const l of listings) {
  const isScamDesc = l.description && (
    l.description.includes('Site visit only') || 
    l.description.includes('token amount') || 
    l.description.includes('Below market price, this week only')
  );
  
  if (isScamDesc && l.posted_by_contact && contactCounts[l.posted_by_contact] > 1) {
    const psf = l.price / l.carpet_area;
    if (psf < 6000) {
      fakeIds.push(l.listing_id);
    }
  }
}
fakeIds.sort();
answers.fake_listing_ids = fakeIds;

// 5. total_monthly_rent
const assignedLocality = 'dwarka expressway';
let totalRent = 0;
for (const r of rentals) {
  if (r.locality.toLowerCase() === assignedLocality) {
    totalRent += r.price;
  }
}
answers.total_monthly_rent = totalRent;

// 6. avg_price_per_sqft_2bhk
let sumPsf = 0;
let countPsf = 0;
const excludedIds = new Set([...corruptIds, ...fakeIds]);
for (const l of listings) {
  if (l.is_live === true && l.bedroom === 2 && !excludedIds.has(l.listing_id)) {
    if (l.price && l.carpet_area) {
      let area = l.carpet_area;
      let price = l.price;
      
      // Handle the H8 sqm outlier: if psf > 60000, carpet_area was likely in sqm.
      // 1 sqm = 10.764 sqft
      if ((price / area) > 60000) {
        area = area * 10.764;
      }
      
      sumPsf += (price / area);
      countPsf++;
    }
  }
}
answers.avg_price_per_sqft_2bhk = parseFloat((sumPsf / countPsf).toFixed(2));

// 7. costliest_project
let maxProject = null;
for (const p of projects) {
  const priceMaxInr = p.price_max * 10000000;
  if (!maxProject || priceMaxInr > maxProject.price_max_inr) {
    maxProject = { project_id: p.project_id, price_max_inr: priceMaxInr };
  } else if (priceMaxInr === maxProject.price_max_inr) {
    if (p.project_id < maxProject.project_id) {
      maxProject = { project_id: p.project_id, price_max_inr: priceMaxInr };
    }
  }
}
answers.costliest_project = maxProject;

// 8. listings_last_7_days
const REFERENCE = new Date('2026-09-10T00:00:00+05:30').getTime();
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const START = REFERENCE - SEVEN_DAYS_MS;
let recentCount = 0;
for (const l of listings) {
  // The 'Z' means nothing. It's actually IST (+05:30).
  // So "2026-09-08T10:00:00Z" is actually "2026-09-08T10:00:00+05:30".
  // Let's replace 'Z' with '+05:30' before parsing.
  let timeStr = l.posted_at;
  if (timeStr.endsWith('Z')) {
    timeStr = timeStr.slice(0, -1) + '+05:30';
  }
  const postedAt = new Date(timeStr).getTime();
  if (postedAt >= START && postedAt < REFERENCE) {
    recentCount++;
  }
}
answers.listings_last_7_days = recentCount;

// 10. projects_with_wrong_listing_count
const liveListingCountsByProject: any = {};
for (const l of listings) {
  if (l.is_live === true && l.project_id) {
    liveListingCountsByProject[l.project_id] = (liveListingCountsByProject[l.project_id] || 0) + 1;
  }
}
let mismatchedCount = 0;
for (const p of projects) {
  const actual = liveListingCountsByProject[p.project_id] || 0;
  if (p.total_listings !== actual) {
    mismatchedCount++;
  }
}
answers.projects_with_wrong_listing_count = mismatchedCount;

answers.dataset_audit_ref = "IVY-AUDIT-B4459693";

fs.writeFileSync(path.join(__dirname, 'answers.json'), JSON.stringify(answers, null, 2));
console.log("Answers generated:", answers);
