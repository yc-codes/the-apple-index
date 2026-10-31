# Global tech price comparison: research and restructuring plan

## Primary goal

Help shoppers compare the same technology product across brands, retailers and countries, with clear information about the seller, regional version, availability, warranty and actual purchase conditions. Preserve existing Apple comparisons while introducing Samsung, OnePlus and Xiaomi phones and a broader retail-source network.

Research date: **31 October 2026**. This is a proposed architecture and rollout, not an implementation or a claim of partner acceptance. Public documentation was researched; authenticated feed access and live production accuracy were not tested. “Saraf” is interpreted as **Sharaf DG**. Existing country coverage is the geographic starting point.

**Implementation update — 31 October 2026:** The user approved **The Device Index**. The first implementation slice adds 17 researched Android models, a Xiaomi India public-HTML collector and six observed India offers, while preserving Apple collection. Samsung, OnePlus and POCO initially have verified configurations with price collection pending. Amazon, noon and Sharaf DG partner sources are not activated. The remaining architectural phases below are proposed future work; see [catalog evidence](../research/android-catalog-2026-10-31.md) for this slice's sources and limits.

## Recommended decisions

- Keep React, TanStack Start/Router, TypeScript, Bun and Vercel. Build a modular collector and shared domain inside this repository; no framework rewrite or microservice split.
- Keep the existing Apple catalog and its 39 markets. Pilot new phone coverage in **India and the UAE**, then Saudi Arabia, Singapore, the US and UK, followed by Germany and Japan. These are proposed priorities, not measured demand rankings.
- Start with new, outright-purchase phones: Samsung Galaxy S/Z and selected A models; OnePlus flagship/Nord; Xiaomi flagship/Redmi/POCO. Add Pixel and Nothing next, then evaluate Motorola, Honor, Oppo, Vivo and Realme based on local demand and usable feeds. Retain existing Apple computers/tablets/etc.; expand other brands' categories after phones work reliably.
- Curate an initial **20–30 additional models** and a bounded set of regional configurations. This is a scope recommendation, not a measured catalog size. Do not import every marketplace search result.
- Separate official manufacturer prices, local retailer offers and overseas purchase estimates. Rank comparable, available, fresh offers; expose all material differences.
- Put Amazon, noon and Sharaf DG on the source roadmap, but do not make the launch dependent on unverified access. Start partner applications and integration proofs early.
- Use versioned static snapshots as a migration bridge for content that permits durable publication. Use private ingestion storage and expiring delivery for restricted content. Adopt a managed relational database when introducing multiple workers/history; do not turn Git into a price-event database.

## What exists today

| Area        | Verified repository evidence                                                                      | Consequence                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Catalog     | 24 Apple families, `server/families.ts:3`; 39 regions, `server/stores.ts:4`                       | No brand-neutral catalog or third-party adapter exists                            |
| Local data  | Ignored snapshots contain 22 ready products, 362 variants and 13,502 price rows, dated 28 October | Local state only; not proof of current production coverage                        |
| Identity    | `src/types.ts:1` uses `Price.code`; `Store` is a country; Apple parts drive matching              | Several sellers in one country require new identities                             |
| Collection  | `server/catalog.ts:222`, `server/prices.ts:7`, `server/apple.ts:58`                               | Apple discovery and undocumented price endpoint must stay inside an Apple adapter |
| Scheduling  | `.github/workflows/collect.yml:4` runs daily at 03:17 UTC                                         | Six-hour cache TTL in `server/service.ts:20` does not mean six-hour refresh       |
| Publication | `server/storage.ts:5`, `scripts/collect.ts`, `src/data.ts:13`                                     | Current snapshots enter a public Git data branch, builds and browser bundles      |
| Ranking     | `src/pricing.ts:34` converts and sorts rows                                                       | No seller, stock, condition or expiry eligibility checks                          |
| Refunds     | `src/pricing.ts:5`, `src/components/layout.tsx:34`                                                | Country heuristics and default-on refunds cannot generalize to marketplace offers |
| History     | Latest JSON is overwritten                                                                        | No application price-history model exists; Git diffs are not that feature         |
| Routing     | `vite.config.ts:9`; `src/routes/products.$productId.tsx:3`                                        | Every variant prerenders; route validation depends on bundled Apple families      |

The previous `docs/plans/static-data-branch.md` explains why public Git snapshots replaced Blob costs. Preserve that cost discipline. Its proposed four-times-daily schedule is superseded by the actual daily workflow.

## Naming direction

**Preferred working name: The Device Index.** It keeps the continuity and editorial feel of The Apple Index while making phones, laptops, tablets, wearables and consoles fit naturally. Suggested descriptor: **“Global tech prices, compared.”**

| Candidate          | Why it fits                                   | Tradeoff                                         |
| ------------------ | --------------------------------------------- | ------------------------------------------------ |
| The Device Index   | Natural evolution of the existing name        | Descriptive; needs a distinctive visual identity |
| Tech Price Atlas   | Communicates technology, prices and countries | Longer, but immediately understandable           |
| Gadget Latitude    | Memorable geographic association              | More playful and less explicit about prices      |
| Device Compass     | Suggests help making a purchase decision      | Needs a price-comparison descriptor              |
| Circuit Passport   | Distinctive travel/technology association     | May sound primarily travel-focused               |
| Global Tech Prices | Clear and useful as descriptive copy          | Generic as the main brand                        |

Exploratory web searches are **not domain, trademark or handle clearance**. Avoid Techfare, which already runs a [technology pricing product](https://techfare.com/); Tech Atlas also has [existing technology businesses](https://tech-atlas.com/). “The Tech Index” already appears as an [existing technology information property](https://sqmagazine.co.uk/tech-index/). Do not rename the repository, domain or deployed project until the final name is chosen. Make branding and data origin configurable first.

## Source access: what the research actually establishes

### Amazon

Amazon's current [Creators API introduction](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction) documents `SearchItems`, `GetItems`, `GetVariations` and `GetBrowseNodes`, with marketplace enrollment and qualifying-sales requirements. Its [PA-API deprecation notice](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation) says old calls return `403 AccessDenied`; do not build a new PA-API integration.

Copy the [migration guide](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/migrating-to-creatorsapi-from-paapi) for OAuth, marketplace headers and `OffersV2`; use the [locale reference](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/locale-reference) to validate each market. An Amazon storefront does not establish access through a single global account. Follow [rate limits](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/concepts/api-rates) and [field-specific cache guidance](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/concepts/best-programming-practices).

The [Associates policies](https://affiliate-program.amazon.com/help/operating/policies) restrict site price tracking/alerts without agreement, aggregation/analysis/repurposing without express permission, image caching and content retention. They also restrict using Amazon content to promote other retailers. **Inference:** the proposed comparison use needs explicit validation; disabling Amazon history alone may not address the site-level provisions. Maintain an independently licensed catalog and a source-specific expiring offer cache. Approval must precede activation of the affected features. [SP-API](https://developer-docs.amazon.com/sp-api/docs/onboarding-overview) is seller/vendor-authorized infrastructure, not an assumed workaround.

### noon

The [affiliate FAQ](https://affiliates.noon.com/en/questions?category=general) and [terms](https://affiliates.noon.com/en/terms) establish a publisher program. They do not establish a public comparison feed. The [API platform](https://noon-docs.noonpartners.dev/docs/getting-started/intro) is seller-oriented; [`GetProductOffers`](https://noon-docs.noonpartners.dev/docs/api-reference/offer/offer-service-get-product-offers) takes a partner SKU, not an unrestricted whole-market query. Obtain a publisher/feed agreement covering seller, stock, warranty, price, refresh and retention. Keep its adapter status `access_pending` until a sample feed is proven.

### Sharaf DG

Sharaf's [own affiliate entry point](https://uae.sharafdg.com/grow/) links to Admitad program 19333. Admitad documents [product feeds and automated export](https://admitad.useresponse.com/knowledge-base/article/product-feed-what-it-is-and-how-to-export-it-for-your-website_4). **Sharaf-specific feed availability, columns and retention rights remain unverified.** Test this route before assuming HTML collection is necessary.

### Other viable feed routes

[Awin's feed-list API](https://help.awin.com/developers/docs/product-feed-list-download) provides accessible feed IDs, update timestamps and download URLs; the feed key differs from the Partner API key. Consume actual mapped columns, and download on feed changes. Publisher membership and each advertiser's permissions still govern access.

There are concrete retailer examples: [Currys UK](https://ui.awin.com/merchant-profile/1599) advertises feeds, with [program terms](https://ui.awin.com/merchant-profile-terms/1599?setLocale=it_IT) describing daily and requested higher-frequency access; [MediaMarkt Switzerland](https://ui.awin.com/merchant-profile/14040) advertises hourly feeds. [MediaMarkt Germany](https://www.mediamarkt.de/de/about-us/affiliate/partnerprogrammnden.html) names a different private network, so country integrations must be checked individually.

Use authorized APIs/feeds first, then permitted structured product data or a maintained parser. A public webpage or JSON-LD block is an extraction format, not a grant of access/redistribution rights. Do not treat a search snippet as a current price observation. Avoid bypassing access controls. Source availability and access approval are separate facts.

### Additional documented interfaces for Phase 0

| Source         | Documented interface / useful fields                                                                                                                                                                    | Access status and limitation                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Best Buy US    | [Products API](https://bestbuyapis.github.io/api-documentation/): `/v1/products/{sku}.json`, `salePrice`, `modelNumber`, `upc`, `onlineAvailability`, `priceUpdateDate`                                 | Key required; temporary caching only under documented terms; permanent history not established. US API coverage does not prove Canadian coverage                           |
| Rakuten Japan  | [Ichiba Item Search](https://webservice.rakuten.co.jp/documentation/ichiba-item-search), version `20260701`; `applicationId` and `accessKey`, optional `affiliateId`; `shopCode` for merchant filtering | Documented; no authenticated sample tested; retention rights need review                                                                                                   |
| Flipkart India | [Affiliate Product/Offer APIs](https://affiliate.flipkart.com/api-docs/af_overview.html) explicitly contemplate comparison sites                                                                        | New-account onboarding unverified; [current portal](https://affiliate.flipkart.com/) exposes login, so do not promise immediate credentials                                |
| eBay           | [Browse API](https://developer.ebay.com/develop/api/buy/browse_api): `/item_summary/search`, `/item/{item_id}`; GTIN/category/keyword search                                                            | Later wave; [production requirements](https://developer.ebay.com/api-docs/buy/buy-requirements.html), supported marketplaces, condition and seller filters need validation |

These and the interfaces cited above are the documented external API shortlist. Proposed adapter/repository method names in implementation must be explicitly identified as our own abstractions. Credentials and feed URLs containing keys belong only in private runtime configuration.

## Country and retailer research matrix

All 39 currently configured markets are included below. These are **established retailer candidates**, supported by official local or corporate presence evidence, not measured popularity rankings or blanket endorsements. For marketplaces, qualify the seller as well as the platform. Manufacturer stores are an additional reference source wherever they actually sell that model locally. Amazon is added only in supported, approved marketplaces.

**Access labels:** `D` = a documented API/feed route was found, still requiring approval/testing; `P` = publisher/partner route exists but a usable feed is unverified; `U` = retailer presence established, data access unverified. Every retailer marked U needs a discovery proof before implementation. Labels describe this research, not retailer quality.

| Market         | Candidate retailers and source evidence                                                                                                                      | Access                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| UAE            | [Sharaf DG](https://business.sharafdg.com/about-sharaf-dg/), [Jumbo](https://www.jumbo.ae/), Amazon.ae, noon                                                 | Sharaf/noon P; Amazon D with use approval; Jumbo U   |
| India          | [Croma](https://www.croma.com/about-croma), [Reliance Digital](https://www.relianceretail.com/reliance-digital.html), Flipkart, Amazon.in                    | Flipkart/Amazon D with onboarding limits; others U   |
| Saudi Arabia   | [Jarir](https://www.jarir.com/sa-en/about-jarir/), [eXtra](https://www.extra.com/en-sa/aboutextra), Amazon.sa, noon                                          | Amazon D; noon P; others U                           |
| Singapore      | [Challenger](https://online.challenger.sg/pages/about-challenger), [COURTS](https://www.courts.com.sg/about-courts.html), Amazon.sg                          | Amazon D; others U                                   |
| United States  | [Best Buy](https://developer.bestbuy.com/apis), Amazon.com                                                                                                   | D, source-specific use/retention limits              |
| United Kingdom | [Currys](https://ui.awin.com/merchant-profile/1599), Amazon.co.uk                                                                                            | D, program acceptance required                       |
| Germany        | [MediaMarkt/Saturn](https://www.ceconomy-mms.com/en/article/standorte), Amazon.de                                                                            | MediaMarkt P; Amazon D; Saturn access separately U   |
| Japan          | [Yodobashi](https://www.yodobashi.com/ec/store/list/en/), Rakuten approved merchants, Amazon.co.jp                                                           | Rakuten/Amazon D; Yodobashi U                        |
| Austria        | [MediaMarkt](https://ui.awin.com/merchant-profile/13996)                                                                                                     | D, feed by arrangement                               |
| Australia      | [JB Hi-Fi](https://www.jbhifi.com.au/pages/about-us)                                                                                                         | U                                                    |
| Belgium        | [MediaMarkt](https://www.ceconomy-mms.com/en/article/standorte), [Fnac/Vanden Borre](https://www.fnacdarty.com/en/group/)                                    | U                                                    |
| Brazil         | [Magazine Luiza / Magalu](https://carreiras.magazineluiza.com.br/sobre-o-magalu/)                                                                            | U                                                    |
| Canada         | [Best Buy Canada](https://www.bestbuy.ca/en-ca/about/about-us/blt6d2c74aaa5bd3e78)                                                                           | U; do not reuse US access assumptions                |
| Switzerland    | [MediaMarkt](https://ui.awin.com/merchant-profile/14040), [Fnac](https://www.fnacdarty.com/en/group/)                                                        | MediaMarkt D; Fnac U                                 |
| Chile          | [Falabella](https://www.falabella.com/falabella-cl/category/cat720161/Smartphones)                                                                           | U; preserve marketplace seller                       |
| Czechia        | [Alza](https://www.alza.cz/obchodni-podminky-art10.htm)                                                                                                      | U                                                    |
| Denmark        | [Elgiganten](https://www.elkjopnordic.com/who-we-are)                                                                                                        | U                                                    |
| Spain          | [MediaMarkt](https://www.ceconomy-mms.com/en/article/standorte), [Fnac](https://www.fnacdarty.com/en/group/)                                                 | U                                                    |
| Finland        | [Gigantti](https://www.elkjopnordic.com/who-we-are)                                                                                                          | U                                                    |
| France         | [Fnac / Darty](https://www.fnacdarty.com/en/group/)                                                                                                          | U                                                    |
| Hong Kong      | [Fortress](https://www.fortress.com.hk/en/termsAndConditions)                                                                                                | U; local fulfillment/after-sales restrictions matter |
| Hungary        | [MediaMarkt](https://www.ceconomy-mms.com/en/article/standorte)                                                                                              | U                                                    |
| Ireland        | [Currys](https://www.currysplc.com/about-us/)                                                                                                                | U; UK program is not proof of Irish access           |
| Italy          | [MediaWorld](https://www.ceconomy-mms.com/en/article/standorte), [Unieuro](https://www.fnacdarty.com/en/group/)                                              | U                                                    |
| South Korea    | [LOTTE Hi-Mart](https://company.himart.co.kr/en/himart/companyIntro)                                                                                         | U; phone assortment needs a separate check           |
| Luxembourg     | [MediaMarkt](https://www.ceconomy-mms.com/en/article/standorte)                                                                                              | U                                                    |
| Mexico         | [Liverpool](https://www.liverpool.com.mx/tienda/telefon%C3%ADa-abierta/CAT5150024)                                                                           | U                                                    |
| Malaysia       | [Senheng](https://www.senheng.com.my/about-us/), [COURTS](https://www.courts.com.sg/about-courts.html)                                                       | U                                                    |
| Netherlands    | [MediaMarkt](https://www.ceconomy-mms.com/en/article/standorte)                                                                                              | U                                                    |
| Norway         | [Elkjøp](https://www.elkjopnordic.com/who-we-are)                                                                                                            | U                                                    |
| New Zealand    | [PB Tech](https://www.pbtech.co.nz/about), [JB Hi-Fi](https://www.jbhifi.co.nz/)                                                                             | U                                                    |
| Philippines    | Abenson, documented in [Samsung's retailer terms](https://images.samsung.com/is/content/samsung/assets/ph/offer/price-promise/Price-Promise-TnC-Updated.pdf) | U; direct site extraction not established            |
| Poland         | [MediaMarkt](https://www.ceconomy-mms.com/en/article/standorte)                                                                                              | U                                                    |
| Portugal       | [Fnac](https://www.fnacdarty.com/en/group/)                                                                                                                  | U                                                    |
| Sweden         | [Elgiganten](https://www.elkjopnordic.com/who-we-are)                                                                                                        | U                                                    |
| Thailand       | [BaNANA](https://www.bnn.in.th/en), [Com7](https://www.comseven.com/en_US/about-us/)                                                                         | U; shared corporate source may help                  |
| Türkiye        | [MediaMarkt](https://www.ceconomy-mms.com/en/article/standorte)                                                                                              | U                                                    |
| Taiwan         | [PChome 24h](https://corp.pchome.tw/en/corporate-social-responsibility/pchome-business-overview/)                                                            | U                                                    |
| Vietnam        | [FPT Shop / FPT Retail](https://frt.vn/en/about-us)                                                                                                          | U                                                    |

This is a starting acquisition list, not an exhaustive list of every good retailer. Brand × market × retailer coverage should remain sparse and explicit. In particular, [Google's region rules](https://support.google.com/store/answer/2462844?hl=en) distinguish local availability and shipping regions, and [POCO's official notice](https://www.po.co/global/service/support/notice-of-poco-sites-closure.html) redirects product sourcing toward mi.com. Source domains and product availability cannot be assumed permanent.

Later geography: investigate Indonesia (COURTS has [documented presence](https://www.courts.com.sg/about-courts.html)), Bahrain and Oman (Sharaf DG [corporate footprint](https://business.sharafdg.com/about-sharaf-dg/)); treat Qatar, Kuwait, Egypt and China as discovery candidates until local catalog/access proofs exist. Wider geography is not a dependency for the first multi-brand release.

## New domain model

These are proposed internal contracts, not existing APIs:

```text
Brand → ProductModel → Configuration → RegionalSKU
Market ← RetailerMarket ← Source
SourceListing → RegionalSKU (match evidence)
SourceListing + Seller + Condition + Fulfillment → Offer
Offer → CurrentObservation + permitted HistoricalObservations
Source → AccessPolicy + Health + CollectionJobs
```

| Entity             | Essential fields/responsibility                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Brand / category   | Stable ID, display name; independent brand and product-category hierarchies                                                       |
| ProductModel       | Stable internal ID, brand, model/generation, category, canonical slug, independent image/spec provenance                          |
| Configuration      | Typed storage/RAM/color/chip/display/connectivity; category-specific attributes; no Apple page IDs as global identity             |
| RegionalSKU        | Manufacturer model/part number, GTIN/EAN/UPC, intended market, SIM/bands/firmware/plug/keyboard differences and evidence          |
| Market             | Country/region, currency, locale; destination postal region when needed for checkout estimates                                    |
| Retailer / seller  | Platform versus actual merchant, marketplace seller ID, fulfillment party, authorization evidence and review date                 |
| SourceListing      | Source-market external ID, canonical URL, mapped SKU, mapping method/evidence, reviewed status                                    |
| Offer              | Stable offer ID; listing, seller, condition, warranty type/territory, stock, fulfillment, purchase restrictions                   |
| Observation        | Decimal native-currency amounts, shipping/fees/tax basis, observedAt, sourceUpdatedAt if known, expiresAt, promo conditions       |
| SourcePolicy       | Comparison/display/history/alerts permissions; unknown allowed; cache/retention/export limits, attribution, terms URL/review date |
| SourceHealth / job | Last attempt/success, error class, cooldown, cursor, idempotency key, collection budget                                           |

Use decimal money or integer minor units with currency metadata; never assume every currency has two decimals. Preserve native prices and dated FX separately. `null` delivery cost means unknown, not free.

Offer identity must distinguish market, listing, seller, condition and fulfillment. Keep changes as observations of that offer; do not generate a new offer ID whenever its price changes. Separate permitted history from short-lived current data. Account-bound member/card/trade-in prices are structured conditions, not unconditional sale prices.

### Exact matching and comparable regional versions

1. Start with manufacturer identifiers and a curated model/configuration registry. Use validated GTIN/MPN where supplied; see [GS1 identification guidance](https://support.gs1.org/support/solutions/articles/43000734095-how-do-gs1-gtins-and-barcodes-work-/).
2. Match brand, generation and full configuration; validate regional SKU attributes. A merchant SKU or ASIN is a source identifier, not a universal identifier.
3. Record exact matches, explicitly reviewed regional equivalents, and ambiguous matches separately. A cross-country configuration group can contain different regional SKUs, but must surface the differences.
4. Send ambiguous matches to a small manual review queue. Title similarity or an LLM can suggest a match; neither can approve it alone.
5. Treat local-market and imported versions distinctly. Do not merge Chinese-ROM and global-ROM devices, carrier-locked and unlocked devices, or materially different processors/SIM capabilities by marketing name.

Warranty is a reason to preserve these distinctions. [OnePlus US terms](https://www.oneplus.com/us/legal/terms-of-sales) limit its stated warranty geographically; [Samsung UK](https://www.samsung.com/uk/support/warranty/) documents conditional international coverage; [Xiaomi](https://www.mi.com/global/support/xiaomi-iws/) offers international service for designated models and qualifying channels. Avoid universal “international warranty” badges inferred from brand alone.

## Collection, storage and delivery

Keep a modular monolith initially. Suggested new modules:

```text
domain/                 model, SKU, offer, money, source-policy contracts
catalog/                curated models, aliases, regional equivalence mappings
collectors/adapters/    apple, approved brand stores, feeds, amazon, noon, sharaf
collectors/             scheduler, normalization, matching, validation, health
storage/                catalog/current/history repositories; snapshot publisher
src/                    existing application and its data read boundary
```

Adapters belong to data sources, not one adapter per brand/country combination. A retailer feed can supply multiple brands; market-specific configuration supplies locale, credentials and access policy.

Collection flow: **schedule → fetch → normalize → match → validate → save → publish**. Work units are source × market × listing/batch. Use per-source throttles and independently configurable cooldowns; an Apple block must not stop other retailers. Preserve successful rows after a failure only while source policy permits; preserve their original observation timestamps. Distinguish unavailable from failed-to-fetch.

Schedule using permitted source cadence and commercial importance: catalog discovery can be daily; changed feeds can be imported at their published cadence; fast-moving offer feeds can refresh more often if quotas permit. A freshness deadline is a publication contract, not merely an in-memory TTL. Show stale data explicitly and remove it from best-price eligibility.

**Migration bridge:** retain atomic versioned JSON publication and existing Apple pages. Include schemaVersion, generation ID, source coverage and observation times. Publish a complete generation before changing its manifest pointer. This avoids mixing an old catalog with a new offer file. Do not place restricted feeds, credential-bearing URLs or private evidence in the Git data branch.

**Expanded operation:** a managed PostgreSQL database holds catalog mappings, jobs, current offers and history that can be retained. One scheduled Bun worker initially; add workers only when measured queue lag requires them. A transactional claim/lease table can serve the initial job queue. Publish read-optimized, policy-approved snapshots to object storage/CDN. Do not add Redis or a search cluster until actual workload warrants it.

Restricted, short-lived content needs a separate expiring read path and purgeable cache, potentially a small server endpoint behind `src/data.ts`. It must not be baked into immutable HTML/JS, Git history or long-lived backups. Enforce expiry in server/CDN output as well as the browser. Keep manufacturer catalog pages prerendered; fetch only changing offers where required. This deliberately relaxes the old no-API design only where access terms/freshness require it.

The existing [FX endpoint](https://www.exchangerate-api.com/docs/free) updates daily, requires attribution and prohibits redistribution. Review the current public `rates.json` publication before carrying it into v2; use conversion internally or choose a license allowing the intended distribution. More frequent fetches do not make this endpoint's daily rates fresher.

## Price calculation and product experience

Provide distinct views:

- **Official prices:** manufacturer-store reference prices, with collection dates.
- **Buy locally:** eligible retailer/seller offers deliverable in the selected market.
- **Compare countries:** comparable regional versions and clear currency conversion; overseas availability does not imply shipping to the user's home.
- **Travel estimate:** optional retailer-specific refund eligibility, fees and purchase-date rules. Separate from cash due at checkout.

Default eligibility: reviewed match, new condition, in stock, fresh, outright purchase and no unmet membership/card/trade-in condition. Unknown warranty/seller attributes remain visible and filterable; do not label them verified. Imported offers should be a distinct group or deliberate filter. Marketplace fulfillment is not proof that the platform is the seller or that manufacturer warranty applies.

Display base price, known mandatory costs, tax basis, seller, warranty territory, source link and observed time. If tax/shipping is unknown, label the result an estimate or subtotal and avoid calling it the cheapest complete checkout. Rank by the selected purchase scenario. Keep affiliate commission out of price ranking.

Do not apply `gross * (1 - VAT rate)` as a full VAT refund. For a fully refundable included tax, the tax component is `gross * rate / (1 + rate)`, before fees and eligibility. Shipping/customs/import taxes require destination and purchase mode; no universal landed-cost promise.

This is time-sensitive: [UAE FTA](https://tax.gov.ae/en/services/tourist.VAT.refunds.aspx) requires participating retailers/e-commerce sites and transaction validation. [Japan Customs](https://www.customs.go.jp/kaigairyoko/taxrefund.htm) says purchases from **1 November 2026** move to the refund method after customs confirmation. Store effective dates and supporting URLs; do not generalize country percentages to every offer.

Keep the existing configuration-selection behavior, especially color changes preserving hardware. Add brand/category/search filters, multiple retailers per country, explicit seller/condition/warranty controls, and a coverage page listing active/pending/unavailable sources. Do not generate every brand × model × variant × country × retailer route. Prerender useful model pages and selected landing pages; keep most comparison filters in URL state.

## Phased implementation

### Phase 0 — Prove source access and freeze the pilot

**How this serves the primary goal:** ensures the first comparison pages can show usable, permitted data rather than empty integrations.

- Implement: a source registry and evidence file for India/UAE plus next-wave markets; a bounded phone catalog; sample-feed trials using documented access. Record field completeness and allowed publication/retention. Start Amazon/noon/Sharaf applications without waiting to build the neutral catalog.
- References: retailer documentation above; current `server/families.ts`, `server/stores.ts`; external methods are limited to the documented interfaces cited here.
- Verify: one real sample per enabled source; identity, seller, stock, currency and timestamp validation; all required permissions recorded. Where no sample is obtainable, record pending status and select another source for the pilot.
- Guard: affiliate membership is not feed access; seller APIs are not public market APIs; no invented universal Samsung/Xiaomi/noon endpoint.

### Phase 1 — Introduce the neutral domain and preserve Apple

**How this serves the primary goal:** allows new brands and several offers per country without breaking existing comparisons.

- Implement: new domain types, category/brand registries, regional SKU and source-listing mappings, v1-to-v2 Apple snapshot conversion and old URL aliases. Put existing Apple parsing behind the adapter contract.
- References: copy configuration invariants from `src/configuration.ts:11`, timestamp preservation from `server/service.ts:127`, atomic write pattern from `server/storage.ts:28`, Apple fixtures from `tests/apple.test.ts`.
- Verify: every legacy ready Apple model/variant is represented; prices and original timestamps preserved; two independent offers in the same country render; old links and saved preferences still resolve.
- Guard: no source ID as canonical model identity, no UI keys based solely on country, no manufactured stock/warranty guarantees for legacy rows.

### Phase 2 — Build source-isolated ingestion and publication

**How this serves the primary goal:** keeps prices current and makes source outages visible without losing healthy offers.

- Implement: source/market jobs, rate controls, parsing/normalization, mapping review, retries, expiry, policy-aware storage and versioned snapshots. Introduce relational storage when multiple writers/history are enabled; keep the read boundary stable.
- References: `server/cache.ts:32` in-flight deduplication, `server/apple.ts:58` throttle behavior, `server/service.ts:196` publish-without-fetch pattern; Awin feed-list timestamps and source TTL documentation.
- Verify: idempotent repeated import, partial failure, worker interruption/resume, independent cooldowns, source withdrawal, atomic generation switch, expiry/purge of all served copies.
- Guard: no global all-retailer circuit breaker, no stale row relabeled fresh, no licensed raw payloads in public Git, no infinite retention default.

### Phase 3 — Ship the India/UAE multi-brand pilot

**How this serves the primary goal:** delivers real Samsung, OnePlus and Xiaomi comparisons with usable local purchase links.

- Implement: selected new phone models, verified retailer feeds and independently sourced specifications; manual mapping queue; official/local/global views. Enable Amazon/noon/Sharaf individually only after their access proofs pass.
- References: manufacturer warranty/region pages, GS1 guidance, source sample mappings from Phase 0, [Schema.org Offer](https://schema.org/Offer) fields for seller, availability, currency and condition where present.
- Verify: audited fixture set covers near-identical model names, RAM/storage/color differences, imports, different sellers and conditional discounts; click-through matches the exact listing/version where the source supports it.
- Guard: no title-only auto-merge, no assumption every brand sells officially in every country, no trade-in headline ranked as cash purchase price.

### Phase 4 — Rebrand and finish the comparison experience

**How this serves the primary goal:** makes expanded coverage understandable and preserves discoverability and existing links.

- Implement: chosen name via a central brand config; updated categories, filters, retailer grouping, timestamps and warranty labels; corrected optional travel estimates; metadata/canonicals and redirects. Configure data origin separately from project name.
- References: `src/components/layout.tsx:29,158`, `src/components/catalog.tsx:9`, `src/components/prices.tsx:106`, `src/routes/__root.tsx:27`, `src/data.ts:13`, `scripts/fetch-data.ts:48`, `vite.config.ts:9`.
- Verify: old Apple URLs/preferences migrate, canonical URLs are consistent, offers remain keyboard accessible, catalog growth does not produce combinatorial prerender output.
- Guard: no silent GitHub/domain rename, no claim of global coverage for pending markets, no buyer-facing technical source jargon.

### Phase 5 — Expand market coverage and permitted history

**How this serves the primary goal:** broadens useful comparisons without sacrificing identity accuracy or freshness.

- Implement: next-wave markets, selected additional phone brands, then tablets/watches/audio/laptops. Add history only for sources allowing it, with native price and dated FX. Alerts are a later feature gated by source/site permissions and measured demand.
- References: country-source matrix, source registry, permitted retention evidence, existing `src/pricing.ts` conversion boundary.
- Verify: market-specific currencies/locales, source-specific permissions, seller qualification, measured freshness and mapping precision; new cohorts pass the same checks as the pilot.
- Guard: no blanket “most trusted” designation, no global history toggle overriding a restrictive provider, no connector copy per brand.

### Phase 6 — Verify and launch incrementally

**How this serves the primary goal:** proves buyers see accurate, comparable offers and existing Apple use cases continue working.

- Implement: source health/coverage reporting and rollback controls; perform review against the documented APIs and a bounded reference catalog.
- References: commands in `README.md:55`, CI workflow, `tests/configuration.test.ts`, `tests/pricing.test.ts`, `tests/e2e/app.spec.ts`. Update the no-API browser assertion only for explicitly designed short-lived read paths.
- Verify: unit/type/format/build checks and targeted end-to-end tests; several sellers per country; matching conflicts; stale/out-of-stock exclusion; fresh fallback after outage; zero secret/feed-token exposure; old links; mobile usability; source removal and cache purge; bundle/build size at the pilot target.
- Guard: do not seed synthetic snapshots over valuable local collected data; use a separate fixture directory. No production rollout based only on parser success.

## Launch gates and unresolved work

Pilot readiness means: all enabled sources have proven access; selected models have reviewed mappings; each advertised retailer comparison has multiple eligible offers where available; source/market gaps are explicit; old Apple pages work; stale, conditional and incompatible offers cannot win silently. Run a proposed seven-day observation period before expanding—this is a quality gate recommendation, not work performed in this research session.

Still to establish: final name/domain choice; retailer account acceptance; feed samples and contracts; actual demand by market; achievable refresh cadence; source operating costs; complete current tax rules. No partner was contacted or account created during this research.

Measure costs before committing to a large crawl: API/feed charges, worker time, storage/retention, publication bandwidth, monitoring and manual mapping effort. A staged catalog plus batch feeds should control these better than all-brand/all-country page scraping. No reliable monthly cost can be quoted until the source samples and permitted request budgets are known.
