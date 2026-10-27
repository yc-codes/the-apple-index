# Plan: static site built from a `data` branch (replace Vercel Blob)

## Goal

Vercel Blob (Hobby) is exhausted: the collector performs ~800 Blob writes per run
(every cached checkpoint goes through `server/cache.ts:44`), far above the 2,000
operations/month quota. Replace it with:

- **No external storage service.** The collector's working checkpoints live in the
  GitHub Actions cache; the small published JSON is committed to a `data` branch.
- **A static, pre-rendered website.** Every page is rendered at build time with its
  data embedded. Visitors make **no API calls** and no function reads a database.
- **A rebuild after each collection** via a Vercel Deploy Hook (about 4 builds/day).

The repo `yc-codes/the-apple-index` is **public**, so the build can clone the
`data` branch without credentials.

## Target data flow

```text
GitHub Actions collector (cron 17 */6 * * *)
  restore .cache from actions/cache  (checkpoints: catalog-*, prices-*, store-*, page-*, regional-*, rates)
  bun run collect                    (writes checkpoints to .cache, published files to data/)
  save .cache to actions/cache        (always, even on partial failure)
  commit data/ to the `data` branch   (only when changed)
  POST $VERCEL_DEPLOY_HOOK_URL        (only when a commit was pushed)
        ↓
Vercel production build (main)
  bun scripts/fetch-data.ts           (shallow-clone `data` branch → ./data)
  vite build                          (prerender every page with data embedded)
        ↓
Static HTML + JS chunks on the Vercel CDN
```

## Published files (`data` branch root, mirrored locally in `./data/`)

| File | Type (existing) | Notes |
| --- | --- | --- |
| `index.json` | `Listing` | written by `publish()` |
| `product-<id>.json` | `Product` | written by `publish()` |
| `rates.json` | `CacheEntry<ExchangeRates>` | collector cache entry, also published |
| `collector-status.json` | `CollectorStatus` | keeps cooldown/attempt order across runs |

Everything else (`catalog-*`, `prices-*`, `store-*`, `page-*`, `regional-*`) is a
collector checkpoint and stays in `.cache/` (never committed).

## Phase 1 — Storage: local disk only, published keys routed to `data/`

File: `server/storage.ts`, `server/types.ts`, `tests/storage.test.ts`

1. Remove `@vercel/blob` (`bun remove @vercel/blob`) and all `BLOB_READ_WRITE_TOKEN`
   handling, including the `production`/`requireStorage` logic.
2. `createStorage({ directory = DATA_CACHE_DIR || '.cache', publishDirectory = DATA_PUBLISH_DIR || 'data' })`.
   Keys `index`, `rates`, `collector-status`, and `product-*` read/write in
   `publishDirectory`; all other keys in `directory`. Keep the key validation regex
   and the atomic temp-file + rename write.
3. Write published JSON pretty-printed (`JSON.stringify(value, null, 2)` + trailing
   newline) so the `data` branch diffs are readable. Checkpoints can stay compact.
4. Make published output deterministic where cheap: no new random/ordering changes.
   (Do not remove per-row `at` timestamps; they are product data.)
5. Update `tests/storage.test.ts` for the routing (temp dirs), remove Blob tests.
6. Add `data/` to `.gitignore` on `main`.

## Phase 2 — Collector workflow

File: `.github/workflows/collect.yml`, `scripts/collect.ts`

1. `scripts/collect.ts`: delete the `CI && !BLOB_READ_WRITE_TOKEN` check. Behaviour
   otherwise unchanged (reads `collector-status` through storage → now `data/`).
2. Workflow (`permissions: contents: write`, keep the concurrency group):
   - `actions/checkout@v4` (main).
   - Check out the `data` branch into `./data` if it exists
     (`git fetch origin data` → `git worktree add data origin/data`), otherwise create
     an orphan worktree: `git worktree add --orphan -b data data` (or equivalent for the
     runner's git version). Must work on the very first run.
   - `actions/cache/restore@v4` path `.cache`, key `collector-${{ github.run_id }}`,
     `restore-keys: collector-`.
   - Setup Bun 1.4.4, `bun install --frozen-lockfile`.
   - `bun run collect` with a **step-level** `timeout-minutes: 300` and
     `continue-on-error: true` so later steps still run (job timeout stays 330). Keep
     `APPLE_BACKGROUND_GAP_MS: "8000"`.
   - `actions/cache/save@v4` with `if: always()`, same path/key.
   - Commit step (`if: always()`): in `./data`, configure
     `github-actions[bot]` identity, `git add -A`, commit only when there are staged
     changes (`git diff --cached --quiet || ...`), message
     `Update Apple prices <UTC ISO time>`, push to `origin data`. Expose an output
     `changed=true|false`.
   - Deploy step: if `changed == 'true'` and secret `VERCEL_DEPLOY_HOOK_URL` is set,
     `curl -fsS -X POST "$VERCEL_DEPLOY_HOOK_URL"`. If the secret is missing, print a
     warning, don't fail.
   - Final step: fail the job if the collect step's outcome was `failure`, so partial
     failures remain visible in Actions (after data was saved and published).
3. `.github/workflows/ci.yml`: don't run on the `data` branch
   (`on: push: branches-ignore: [data]` and keep `pull_request`).

## Phase 3 — Build-time data fetch

Files: `scripts/fetch-data.ts` (new), `package.json`, `vercel.json`

1. `scripts/fetch-data.ts`:
   - If `DATA_SOURCE=local` or not on Vercel and `./data/index.json` already exists,
     keep it (local dev / tests).
   - Otherwise shallow-clone the data branch:
     `git clone --depth 1 --branch data https://github.com/<owner>/<repo>.git <tmp>`;
     owner/repo from `VERCEL_GIT_REPO_OWNER`/`VERCEL_GIT_REPO_SLUG`, default
     `yc-codes/the-apple-index`; copy `*.json` into `./data` (replace the dir).
   - If the branch doesn't exist yet, create `./data/index.json` with the existing
     "not ready" listing shape (all families, `ready: false`, from
     `server/families.ts`) so the site still builds and shows the pending state.
   - Log how many products were fetched.
2. `package.json` scripts:
   - `"data:fetch": "bun scripts/fetch-data.ts"`
   - `"data:local": "bun scripts/fetch-data.ts --from=.cache"` — copy published files
     from a local `.cache` (old layout) into `./data` for local dev, if useful.
   - `"build": "bun scripts/fetch-data.ts && vite build"` (keep `build:vercel` working).
3. `vercel.json`: keep framework/commands; add
   `"git": { "deploymentEnabled": { "data": false } }` so pushes to `data` don't
   create preview deployments.

## Phase 4 — Static data in the app (no `/api`, no runtime reads)

Files: `src/data.ts` (new), `src/api.ts`, routes, components, `src/router.tsx`

1. `src/data.ts`: load published JSON through Vite so it is bundled at build time:
   - `index.json` and `rates.json` via static JSON import (small).
   - products via `import.meta.glob('../data/product-*.json', { import: 'default' })`
     (lazy, one JS chunk per product, served from the CDN).
   - `getListing()`, `getMeta()` (stores from `server/stores.ts` mapped to
     `{ code, name, currency, tax }` + `rates.value`), `getProduct(id)` returning
     `Product | null`.
   - Handle a missing `data/` dir cleanly at build time (Phase 3 guarantees
     `index.json`; `rates.json` may be absent → `rates: null`).
2. Route loaders:
   - Root (or index) loader provides meta; `/` loader provides the listing;
     `/products/$productId` loader calls `getProduct` and `throw notFound()` for an
     unknown id (unknown families) or a family that isn't collected yet → show the
     existing "Prices for this product have not been collected yet" message instead.
   - Loaders must not call server functions or `fetch` — only `src/data.ts`.
3. Replace the TanStack Query hooks in `src/api.ts` (`useMeta`, `useListing`,
   `useProduct`) with loader data (`Route.useLoaderData()` / `getRouteApi`). Remove the
   60s listing polling. Keep component markup and behaviour the same; drop now-dead
   error/refetch paths only where the data can no longer fail at runtime. Remove
   `@tanstack/react-query` if nothing uses it anymore.
4. Delete `src/routes/api.$.ts` and `server/data.ts` (and its tests, if any).
   Regenerate `src/routeTree.gen.ts` through the normal build.
5. Country/currency stay as client-side search params; the recent hydration fix
   (`057d793`) must keep working — server-rendered HTML uses the default preferences,
   and the client applies `?country=`/`?currency=` after hydration as today.

## Phase 5 — Prerender every page

File: `vite.config.ts`

1. Enable TanStack Start prerendering (check the installed
   `@tanstack/react-start` 1.169 docs/types in `node_modules` for the exact option
   names): prerender `/`, every `/products/<id>`, and every
   `/products/<id>/<variantId>` for collected products, listed explicitly from
   `./data` (read the JSON in `vite.config.ts`), with `crawlLinks` as a fallback.
2. Confirm the Vercel output (`bun run build:vercel`) places the HTML in the
   static output (`.vercel/output/static`) and that a request for a prerendered page
   does not invoke a function. Any remaining SSR fallback (e.g. an unknown variant
   URL) must use only the bundled data.
3. `Cache-Control` for prerendered HTML: Vercel's defaults for static files are fine;
   don't add custom headers unless needed.

## Phase 6 — Tests, docs, cleanup

1. `scripts/seed-test.ts`: write fixtures into a data directory that the build uses
   (e.g. `DATA_PUBLISH_DIR=data` for CI, or a temp dir copied into `./data`) and run it
   **before** `bun run build` in CI and Playwright (`playwright.config.ts` webServer
   should seed, build with the fixture data, then start).
2. Update `.github/workflows/ci.yml` order accordingly (seed → build → test:browser).
3. Unit tests: update `tests/cache.test.ts` etc. for the storage changes; add a test
   for `src/data.ts`/`fetch-data` fallback (empty listing when no data).
4. E2E (`tests/e2e/app.spec.ts`): pages render prices without any `/api/` request.
   Add an assertion that no request to `/api/` occurs while loading `/` and a product.
5. `.env.example`: remove the Blob vars; document `DATA_CACHE_DIR`,
   `DATA_PUBLISH_DIR`, `APPLE_BACKGROUND_GAP_MS`.
6. README: rewrite the deploy and data-flow sections:
   - Vercel: remove the Blob store; create a **Deploy Hook** for branch `main`
     (Project → Settings → Git → Deploy Hooks) and save the URL as the GitHub Actions
     secret `VERCEL_DEPLOY_HOOK_URL`. Remove `BLOB_READ_WRITE_TOKEN` from Vercel and
     GitHub.
   - First run: trigger **Refresh Apple prices** manually; it creates the `data`
     branch.
   - Local: `bun run collect` writes to `.cache/` + `data/`; `bun run dev` reads `data/`.

## Verification (all must pass)

```sh
bun install --frozen-lockfile
bun run test
bun run typecheck
bun run format:check
bun scripts/seed-test.ts && bun run build
bun run test:browser
bun run build:vercel   # inspect .vercel/output/static for prerendered HTML
```

Also: `bun run collect --family=<small family>` locally writes `data/product-<id>.json`
and `data/index.json`, and `git grep -n "vercel/blob\|BLOB_READ_WRITE_TOKEN"` returns
nothing.

## Manual steps for the owner (not automatable from the repo)

1. Vercel → Project → Settings → Git → Deploy Hooks: create a hook for `main`.
2. GitHub → Settings → Secrets → Actions: add `VERCEL_DEPLOY_HOOK_URL`; delete
   `BLOB_READ_WRITE_TOKEN`.
3. Vercel → Environment Variables: delete `BLOB_READ_WRITE_TOKEN`; disconnect/delete
   the Blob store.
4. GitHub → Settings → Actions → General: workflow permissions allow write (or rely on
   the workflow's `permissions: contents: write`).
5. Run **Refresh Apple prices** once from the Actions tab.

## Out of scope

- Instant cache purge, price-history UI, moving off Vercel hosting.
