# The Mac Index

Live Apple Store prices for every standard configuration, compared across 39 countries in your currency.

## Run

```sh
npm install
npm run dev        # client + live data API (Vite middleware)
npm run build && npm start   # production: node server on PORT (default 8787)
```

## Where the data comes from

Nothing is bundled. The server reads Apple's own stores, the same source The Mac Index uses:

1. **Configurations.** Each family's buy page (for example `apple.com/shop/buy-mac/macbook-pro`) embeds `productSelectionData`, which holds every product with its part number and dimensions (size, chip, color, capacity…). For Macs, Apple also lists every standard configuration with a readable spec line, and each configuration page's JSON-LD gives the SKU and a configuration-specific image. 24 families and about 377 configurations are currently covered.
2. **Prices.** `apple.com/{store}/shop/mcm/product-price?parts=…` returns the shelf price for base part numbers (for example `MGE74`) in any store. Regions that sell their own part numbers (iPhone, iPad) are matched by dimensions. Parts learned in one store are tried in the next before a regional buy page is loaded.
3. **Exchange rates.** From ExchangeRate-API (`open.er-api.com`), refreshed every 6 hours.
4. **Tax rules.** `server/stores.js` holds VAT/GST rates and tourist-refund estimates per country. This is reference data, not prices.

Prices refresh every 6 hours, configurations every 24 hours. Stores that failed are retried after 30 minutes and keep their last good price, with a timestamp, in the meantime. Results are cached in memory and mirrored to `.cache/` so a restart can answer immediately. That folder is only a cache; delete it at any time.

## Rate limits

Apple answers **HTTP 541** when one IP sends too many requests (observed after about 60–70 back-to-back requests). The client therefore:

- sends one request at a time, about 1.5s apart when a visitor is waiting (`APPLE_INTERACTIVE_GAP_MS`) and about 8s apart for background refreshes (`APPLE_BACKGROUND_GAP_MS`);
- pauses background work while a visitor is waiting;
- stops all traffic for 15 minutes on a 541/429/403, doubling the pause on repeated blocks, up to 2 hours.

The first full collection on a new server takes a few hours. Families fill in on the home page as they arrive, and opening a product fetches it with priority. Set `LIVE_WARM=0` to disable background collection. Respect Apple's terms of use when deploying.

## Behavior

- Every configuration option links to a configuration Apple really sells. Changing color keeps all hardware when that combination exists. Otherwise the nearest configuration is chosen, and the UI says exactly what else changed.
- Country/currency changes only update query parameters, so the selected configuration never changes.
- Each row shows the comparable price in your currency, Apple's local shelf price, tax/refund rules, and a link to that country's Apple Store. The tourist refund can be toggled off.

## Verification

`npm test` runs unit tests for parsing, selection, pricing and state. `npm run test:browser` drives the UI against a running dev server; it fetches live data.
