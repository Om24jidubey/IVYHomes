# Ivy Homes Internship Assignment

This repository contains the complete solution for the Ivy Homes Software Engineering Internship assignment. 

It is structured into two parts:
1. `/analysis`: The data investigation pipeline.
2. `/web`: The Next.js frontend application.

## How to Run

### Data Investigation Pipeline
The analysis scripts are written in Node.js and use `tsx` to run locally.
```bash
cd analysis
npm install
npx tsx pull.ts            # Fetches all data and saves to /snapshots
npx tsx verify-dynamic.ts  # Tests dynamic hypotheses against the API
npx tsx verify-hypotheses.ts # Tests static hypotheses against the snapshots
npx tsx answer.ts          # Computes the final 10 answers and writes submission.json
```

### Web Application
The frontend is a Next.js 15 App Router application utilizing Tailwind CSS v4.
```bash
cd web
npm install
npm run dev
```

## How I Decided What to Distrust

The core philosophy was **Investigation First, App Second**. I systematically tested the documentation's claims before writing any frontend code.

1. **Authentication**: The docs claimed the API key should be sent as a query parameter (`?api_key=...`). When I tried this, the server returned a 401 error explicitly stating: "send your key in the X-API-Key request header".
2. **Session Persistence**: The docs claimed the token was valid for 24 hours and that there was no refresh flow. Looking at the `/auth/login` payload revealed the token was only good for 15 minutes, but provided a `refresh_token` and `refresh_url`. I implemented an automatic interceptor in the BFF proxy to silently refresh the 15-minute token.
3. **Pagination**: The docs claimed collection endpoints used `page` and `limit`. However, when fetching `page=1` and `page=2`, I received identical results. This led me to test `offset`, which worked perfectly. The server also silently clamped the requested `limit=200` to `50`.
4. **Data Quality**: I checked for structural impossibilities (e.g. `carpet_area > super_built_up_area` or coordinates outside Gurgaon) and found 24 corrupt listings. I also looked for "enquiry-bait" listings by combining weak signals: repeated contacts, below-market prices (`psf < 6000`), and scammy boilerplate phrases like "Site visit only after the booking amount is paid". This conjunction isolated 6 fake listings.

## What I Checked That Turned Out to be Fine

* **Filters**: I hypothesized that the documented filters (`locality`, `bhk`, `furnishing`, etc.) might be silently ignored server-side. I tested `/v1/listings?furnishing=fully-furnished` and independently verified the results. Surprisingly, every returned record correctly had `furnishing: "fully-furnished"`. The filters *do* work server-side! (Although the frontend re-filters them client-side for maximum reliability).
* **Exact Duplicate Descriptions**: I checked if scammers were copy-pasting the exact same description text across multiple fake listings. I found 0 exact description matches. Scammers actually use formulaic templates, not exact copies.

## What I Would Do With Another Two Days

1. **Map View Integration**: With more time, I would integrate a map library (like Mapbox or Leaflet) to visualize listings on a map, allowing users to visually spot geographical outliers.
2. **Real-time Insights Dashboard**: I would expand the Insights screen to include interactive D3/Recharts distributions of Price/Sqft, visually highlighting the extreme outliers (like the listing with area in sqm) and the fake "enquiry-bait" listings.
3. **Automated Anomaly Detection API**: I would extract the anomaly detection logic (finding corrupt units, fake listings, mismatched project counts) into an automated background job or API that continuously monitors the property stream for new fraudulent or malformed listings.
