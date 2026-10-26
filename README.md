# The Apple Index

Compare the same Apple configuration across 39 regional stores. Built with React, TanStack Start/Router, TanStack Query, TypeScript, and Bun. Vercel hosts the web application; a separate collector publishes current Apple results to private Vercel Blob storage.

## Local development

Use **Bun 1.4.4** (pinned in `package.json` and GitHub Actions).

```sh
bun install --frozen-lockfile
bun run dev                  # http://localhost:5173
```

Copy `.env.example` to `.env` to connect a private Blob store, or leave the token unset to use `.cache/` for local development. A new installation has no collected prices and says so; the UI never starts a crawl just because a visitor opens a page.

Run collection explicitly in another terminal:

```sh
bun run collect                         # all configured product families
bun run collect --family=macbook-pro     # one family
bun run data:publish                     # publish existing collected cache, no Apple requests
```

Without a Blob token these commands use the local development cache. With the token they read/write the shared Blob store. `data:publish` reads the selected storage backend; it does not upload a local cache into a different backend.

For a local production server:

```sh
bun run build
bun run start                  # Bun server; PORT defaults to 3000
```

## Deploy to Vercel

1. Import `yc-codes/the-apple-index` into Vercel. Use the **TanStack Start** framework preset and the repository root. `vercel.json` supplies `bun install --frozen-lockfile` and `bun run build`; Nitro generates the Vercel Build Output API files. Do not override the output directory with `dist`.
2. Create a **private Vercel Blob store**, connect it to the project, and ensure `BLOB_READ_WRITE_TOKEN` is present in the intended deployment environments. Never prefix this token with `VITE_` or expose it to the browser.
3. Add the same token to the GitHub repository's **Actions secret** named `BLOB_READ_WRITE_TOKEN`.
4. Deploy the application, then manually run **Refresh Apple prices** from the repository's Actions tab for the initial collection. The workflow subsequently runs at minute 17 every six hours. Only one collection job runs at a time. Automatic scheduled workflows operate on the repository's default branch.
5. Check the workflow result and `/api/products` for coverage. Families become ready as each is published. Without the token the production API returns an explicit temporary-unavailability response, rather than trying to write to a Vercel filesystem. Without a first collection the catalog shows pending families.

The web application's Vercel adapter uses **Node.js Functions**, while Bun handles dependency installation, builds, tests, the standalone local server, and the collection worker. No persistent process or local disk is required on Vercel. The generated adapter configuration can be checked locally with `bun run build:vercel`.

The hours-long collection must not run in a Vercel Function or a `setInterval` inside the web app. GitHub Actions provides the separate scheduled worker. Workflow minutes, Blob operations, Vercel usage, and upstream rate limits depend on the connected accounts; this repository does not provision those services or credentials automatically. Avoid running a local collector against the same Blob store while the workflow is active.

## Data flow

```text
Apple regional stores + ExchangeRate-API
                    ↓
         Scheduled Bun collector (GitHub Actions)
                    ↓
             Private Vercel Blob
                    ↓
     TanStack Start server routes on Vercel
                    ↓
         React UI + TanStack Query
```

- `server/catalog.ts` discovers standard Apple configurations from embedded product-selection data and Mac configuration-page metadata. No six-variant cap or competitor snapshot is used. The configured family list is in `server/families.ts`; actual coverage depends on successful collection and Apple's current markup.
- `server/prices.ts` queries Apple's regional product-price endpoint and matches regional part numbers by specifications. This is an undocumented upstream interface, not a guaranteed public API.
- `server/service.ts` caches successful configuration pages, catalogs and per-store prices, then publishes product snapshots and a listing. A partially failed Mac discovery does not replace a complete catalog. Successful store work is checkpointed, and failed stores retain their last good rows and timestamps.
- `server/storage.ts` uses private Vercel Blob in production and atomic local writes only for development. Durable writes are awaited; errors are not swallowed.
- `server/data.ts` is read-only. It serves `/api/meta`, `/api/products`, and `/api/products/:id`, with a short in-memory/CDN cache. The browser never receives Blob credentials. Missing data is distinguished from unknown products.
- Prices target a six-hour lifetime; configurations and their individual page metadata target 24 hours. Failed price sets are eligible for retry after 30 minutes, **on the next collector run**. The default workflow runs every six hours, so this is not a promise of 30-minute retries.
- Apple requests are serialized and spaced by eight seconds by default. HTTP 403/429/541 pauses collection; the worker records the cooldown and stops, retaining published data. The next scheduled or manually started run resumes after that cooldown. A complete initial crawl can take hours or several runs if Apple blocks requests.
- `server/stores.ts` contains reference VAT/GST and estimated tourist-refund rules; these are not live tax feeds. `src/pricing.ts` keeps shelf prices, conversion, added sales tax, and optional refunds separate. Eligibility and final checkout amounts must be verified with the store.

## UI behavior

- One country/currency dropdown persists preferences and preserves the configuration URL.
- First visits use timezone/browser-locale defaults followed by an approximate IP-country lookup. Explicit URLs and saved preferences take priority; a delayed lookup cannot overwrite a manual selection. The prior `mac-index-preferences` key is read once for migration compatibility.
- Color options preserve **every** hardware specification; unavailable combinations are disabled. Hardware changes can choose another valid configuration and disclose any additional changes.
- Unknown configuration URLs show a not-found message instead of substituting another machine.
- Product images, prices, refund estimates, collection timestamps, and original-store links are shown per configuration.

## Verification

```sh
bun run test                 # parser, selection, pricing, storage, cache regression tests
bun run build
bun run typecheck
bun run format:check
bunx playwright install chromium   # one-time browser installation
bun run test:browser         # starts the built Bun server with isolated synthetic test data
bun run build:vercel         # generates .vercel/output for deployment verification
```

Browser tests exercise the real TanStack server routes, React hydration, region detection, color/configuration selection, history, reloads, refunds, filtering, missing-data states, and responsive overflow. They do not crawl Apple or require credentials. Synthetic fixtures are confined to `tests/` and an ignored test-cache directory; production imports none of them.

All application modules, collector code, worker scripts, and tests are TypeScript. `bun run typecheck` checks them under strict mode; JavaScript fallback is disabled. Shared product contracts live in `src/types.ts`, and collector/storage contracts live in `server/types.ts`.

`bun run format` applies the checked-in Biome formatting rules. The generated `src/routeTree.gen.ts` is tracked and excluded from manual formatting.
