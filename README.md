# The Device Index

Global tech prices, compared. Explore Apple, Samsung, OnePlus and Xiaomi products in one catalog. Apple price comparisons cover 39 regional stores. Android price coverage is added source by source; products awaiting prices show verified configurations and official references. No estimated or invented Android prices are displayed.

Built with React, TanStack Start/Router, TypeScript, and Bun. Vercel serves prerendered pages with bundled data; visitors make no `/api/` requests. The GitHub repository and data-branch origin remain `yc-codes/the-apple-index` so the name change preserves existing data collection and deployments.

## Product coverage

- Brand and category filters separate manufacturer identity from product type. Older Apple snapshots remain compatible with the brand-neutral interface.
- Seventeen researched phones include verified hardware configurations, dated official references and regional limitations. “Prices coming soon” means no current eligible price observations are available, not that the product is out of stock. Samsung, OnePlus and POCO initially have reference configurations; six curated Xiaomi/Redmi models have an India store collector.
- The Apple collector remains dedicated to Apple. Adding a manufacturer to the catalog does not send its products through Apple's price endpoint.
- Retailer integrations require proven data access and exact regional SKU matching before their prices are published. The [expansion plan](docs/plans/global-tech-expansion.md) records the source research and next phases.

## Local development

Use **Bun 1.4.4** (pinned in `package.json` and GitHub Actions).

```sh
bun install --frozen-lockfile
bun run data:fetch
bun run dev                  # http://localhost:5173
bun run collect --family=homepod-mini
bun run collect:android      # one bounded Xiaomi India fetch; preserve Apple snapshots
bun run collect              # Android catalog, Xiaomi India, then Apple families and rates
bun run data:publish         # publish cached results and researched catalog without source requests
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
4. Allow Actions write permissions (the collector declares `contents: write`). Manually run **Refresh device prices** once. It creates the `data` branch on its first run. Local `collect:android` only writes local snapshots; Actions publishes them through the normal data branch workflow.
5. The collector runs daily at 03:17 UTC. Each collected family is pushed to `data` immediately; one Deploy Hook call at the end of the run refreshes prerendered pages. Missing hooks produce a warning. Vercel Git deployments are enabled only for `main`; preview deployments from other branches are disabled. The collector writes a separate `vercel.json` with `git.deploymentEnabled: false` onto `data`, because Vercel reads configuration from the branch being pushed, not from `main`. Pushes to `data` also skip CI.

Before the first collection, the site shows pending families. Browsers load the latest `data` branch from `raw.githubusercontent.com` after hydration (cached up to five minutes), so pushed families appear without a redeploy; prerendered HTML uses the snapshot bundled at build time. `DATA_SOURCE=local` builds skip the live fetch. Known product pages and every collected configuration are prerendered; unknown URLs use an SSR fallback that reads only bundled data.

## Data flow

The GitHub Actions collector restores `.cache/`, fetches Xiaomi India, collects Apple prices and exchange rates, then saves checkpoints even after partial failure. Xiaomi runs independently of Apple's cooldown; `--family` remains scoped to Apple. The `data` branch contains `index.json`, `product-*.json`, `rates.json`, and `collector-status.json`, plus the `vercel.json` that disables deployments of that branch. Cooldown and attempt order survive between runs. A changed commit calls the Deploy Hook, which fetches that branch and prerenders the website. HTML and product JavaScript chunks are served from the CDN.

- `server/storage.ts` uses atomic disk writes, routing published keys into `data/` and checkpoints into `.cache/`. Published JSON is formatted for readable diffs.
- `server/catalog.ts` discovers Apple configurations. `server/prices.ts` matches regional part numbers through Apple's undocumented price endpoint.
- `server/products.ts` is the researched multi-brand registry; `server/xiaomi.ts` parses the public Xiaomi India catalog's main cards. Only known models, verified RAM/storage pairs, exact colors and explicit in-stock actions can produce prices. Former MRP, unknown stock and accessories cannot enter rankings. Item links retain source SKU identity but may redirect to a model page; shipping is checked at checkout.
- `server/android.ts` publishes researched models and collected Xiaomi observations. Xiaomi prices expire after 36 hours; original timestamps survive partial failures and unobserved colors. Expiry is enforced in data reads and browser rankings. A static prerender can still contain a formerly eligible price until rebuild; hydration removes expired offers. This source is a maintained webpage parser, not a documented public API.
- `server/service.ts` retains successful store rows and timestamps when some stores fail. Prices target six hours, configurations 24 hours; failed price sets become eligible after 30 minutes on the next collector run.
- Apple requests are serialized, eight seconds apart by default. HTTP 403/429/541 records a cooldown and stops collection. A first crawl can take hours or several runs. Partial failures remain visible in Actions after saving and publishing progress.
- `src/data.ts` bundles the listing and optional exchange rates eagerly, and products as lazy JavaScript chunks. It merges older live Apple-only listings with bundled newer observations and the researched registry, so new products do not disappear before the next data-branch publication.
- `server/stores.ts` contains reference tax and tourist-refund rules. Eligibility and checkout amounts must be verified with Apple.

## UI behavior

- One country/currency dropdown persists preferences and preserves the configuration URL.
- Estimated tourist refunds can be toggled in the catalog or product comparison; the setting persists across navigation and reloads.
- First visits use timezone/browser-locale defaults followed by an approximate IP-country lookup. Explicit URLs and saved preferences take priority; a delayed lookup cannot overwrite a manual selection. Preferences now use `device-index-preferences`; prior `apple-index-preferences` and `mac-index-preferences` values are read for migration compatibility.
- Color options preserve **every** hardware specification; unavailable combinations are disabled. Hardware changes can choose another valid configuration and disclose any additional changes.
- Unknown configuration URLs show a not-found message instead of substituting another machine.
- Product images, prices, refund estimates, collection timestamps, and original-store links are shown per priced configuration. Researched configurations awaiting prices show official references instead of misleading empty price comparisons or collection timestamps.

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
