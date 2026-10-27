# The Apple Index

Compare the same Apple configuration across 39 regional stores. Built with React, TanStack Start/Router, TypeScript, and Bun. Vercel serves prerendered pages with bundled prices; visitors make no `/api/` requests.

## Local development

Use **Bun 1.4.4** (pinned in `package.json` and GitHub Actions).

```sh
bun install --frozen-lockfile
bun run data:fetch
bun run dev                  # http://localhost:5173
bun run collect --family=homepod-mini
bun run collect              # all product families
bun run data:publish         # publish cached results without Apple requests
bun run data:local           # migrate published files from the old .cache layout
bun run build
bun run start                # Bun server; PORT defaults to 3000
```

The collector writes working checkpoints to `.cache/` and published snapshots to `data/`. Both directories are ignored. Builds and local development bundle `data/`; rebuild after collecting. `.env.example` documents directory overrides and Apple request spacing. A custom `DATA_PUBLISH_DIR` must be copied into `./data` before building.

`data:fetch` keeps existing local data outside Vercel. Otherwise it shallow-clones the public `yc-codes/the-apple-index` data branch, using Vercel repository metadata when available. A missing branch produces a pending catalog; other fetch failures fail the build. `DATA_SOURCE=local` explicitly keeps local snapshots, including for deployment-output tests.

## Deploy to Vercel

1. Import `yc-codes/the-apple-index` with the **TanStack Start** framework preset and repository root. `vercel.json` supplies the build commands; Nitro generates `.vercel/output`. Do not override the output directory with `dist`.
2. In **Project → Settings → Git → Deploy Hooks**, create a hook for `main`. Save its URL as the GitHub Actions secret `VERCEL_DEPLOY_HOOK_URL`.
3. Remove the legacy Blob read/write token from Vercel and GitHub Actions, then disconnect/delete the old Blob store. No storage service is required.
4. Allow Actions write permissions (the collector declares `contents: write`). Manually run **Refresh Apple prices** once. It creates the `data` branch on its first run.
5. The collector runs at minute 17 every six hours. A changed data commit triggers the Deploy Hook. Missing hooks produce a warning. Pushes to `data` do not trigger CI or Vercel Git deployments.

Before the first collection, the site shows pending families. Collected data appears after the next successful deployment. Known product pages and every collected configuration are prerendered; unknown URLs use an SSR fallback that reads only bundled data.

## Data flow

The GitHub Actions collector restores `.cache/`, collects Apple prices and exchange rates, then saves checkpoints even after partial failure. Only `index.json`, `product-*.json`, `rates.json`, and `collector-status.json` are committed to the `data` branch. Cooldown and attempt order survive between runs. A changed commit calls the Deploy Hook, which fetches that branch and prerenders the website. HTML and product JavaScript chunks are served from the CDN.

- `server/storage.ts` uses atomic disk writes, routing published keys into `data/` and checkpoints into `.cache/`. Published JSON is formatted for readable diffs.
- `server/catalog.ts` discovers Apple configurations. `server/prices.ts` matches regional part numbers through Apple's undocumented price endpoint.
- `server/service.ts` retains successful store rows and timestamps when some stores fail. Prices target six hours, configurations 24 hours; failed price sets become eligible after 30 minutes on the next collector run.
- Apple requests are serialized, eight seconds apart by default. HTTP 403/429/541 records a cooldown and stops collection. A first crawl can take hours or several runs. Partial failures remain visible in Actions after saving and publishing progress.
- `src/data.ts` bundles the listing and optional exchange rates eagerly, and products as lazy JavaScript chunks. Route loaders use those snapshots directly.
- `server/stores.ts` contains reference tax and tourist-refund rules. Eligibility and checkout amounts must be verified with Apple.

## UI behavior

- One country/currency dropdown persists preferences and preserves the configuration URL.
- First visits use timezone/browser-locale defaults followed by an approximate IP-country lookup. Explicit URLs and saved preferences take priority; a delayed lookup cannot overwrite a manual selection. The prior `mac-index-preferences` key is read once for migration compatibility.
- Color options preserve **every** hardware specification; unavailable combinations are disabled. Hardware changes can choose another valid configuration and disclose any additional changes.
- Unknown configuration URLs show a not-found message instead of substituting another machine.
- Product images, prices, refund estimates, collection timestamps, and original-store links are shown per configuration.

## Verification

```sh
bun install --frozen-lockfile
bun run test
bun run typecheck
bun run format:check
bun scripts/seed-test.ts && bun run build
bunx playwright install chromium  # one-time browser installation
bun run test:browser
DATA_SOURCE=local bun run build:vercel
```

Browser tests seed synthetic snapshots into ignored `data/`, build, and start the Bun server. They cover hydration, preferences, configuration selection, history, refunds, filtering, responsive overflow, missing products, and absence of API requests. Seeding replaces local published snapshots; run `data:fetch` after removing the fixture directory to fetch real data again. Vercel builds fetch production data unless `DATA_SOURCE=local` is explicitly set.

TypeScript strict mode covers app, collector, scripts, and tests. `bun run format` applies Biome formatting; the generated route tree is excluded from manual formatting.
