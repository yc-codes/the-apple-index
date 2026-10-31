# Initial Android catalog evidence

Checked **31 October 2026**, with direct HTTP checks completed around **13:17 UTC**. This research supports The Device Index's first multi-brand catalog. Sources are official manufacturer pages; a model's presence is not proof of current stock or international warranty.

## Verified model/configuration shortlist

Values below are **RAM GB / storage GB**. Each row is a bounded verified subset, not necessarily every configuration ever sold. Do not manufacture a Cartesian product of separately listed RAM, storage or colors. Configuration evidence is regional: India except POCO, which uses the UAE specification page.

| Suggested ID              | Brand   | Official model name      | Verified pairs          | Source / evidence                                                                                                                               |
| ------------------------- | ------- | ------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| samsung-galaxy-s26        | Samsung | Galaxy S26               | 12/256; 12/512          | [India buying page](https://www.samsung.com/in/smartphones/galaxy-s26/buy/), FAQ explicitly associates both RAM/storage pairs with S26 and S26+ |
| samsung-galaxy-s26-plus   | Samsung | Galaxy S26+              | 12/256; 12/512          | [Same official page](https://www.samsung.com/in/smartphones/galaxy-s26/buy/); do not import S26 FE's 8 GB option into these models              |
| samsung-galaxy-s26-ultra  | Samsung | Galaxy S26 Ultra         | 12/256; 12/512; 16/1024 | [India buying selector](https://www.samsung.com/in/smartphones/galaxy-s26-ultra/buy/)                                                           |
| samsung-galaxy-z-fold8    | Samsung | Galaxy Z Fold8           | 12/256; 12/512; 16/1024 | [India buying page](https://www.samsung.com/in/smartphones/galaxy-z-fold8/buy/), storage FAQ                                                    |
| samsung-galaxy-z-flip8    | Samsung | Galaxy Z Flip8           | 12/256; 12/512          | [India buying page](https://www.samsung.com/in/smartphones/galaxy-z-flip8/buy/), storage FAQ                                                    |
| samsung-galaxy-a57        | Samsung | Galaxy A57 5G            | 8/256; 12/256           | [India buying selector](https://www.samsung.com/in/smartphones/galaxy-a57/buy/)                                                                 |
| oneplus-15                | OnePlus | OnePlus 15               | 12/256; 16/512          | [India specifications](https://www.oneplus.in/15/specs), embedded page data explicitly identifies available configurations                      |
| oneplus-15r               | OnePlus | OnePlus 15R              | 12/256; 12/512          | [India specifications](https://www.oneplus.in/15r/specs), embedded available configurations                                                     |
| oneplus-nord-6            | OnePlus | OnePlus Nord 6           | 8/256; 12/256           | [India specifications](https://www.oneplus.in/nord-6/specs), embedded available configurations                                                  |
| oneplus-nord-ce6          | OnePlus | OnePlus Nord CE6         | 8/128; 8/256            | [India specifications](https://www.oneplus.in/nord-ce6/specs), RAM fixed at 8 GB and storage 128/256 GB                                         |
| xiaomi-17-ultra           | Xiaomi  | Xiaomi 17 Ultra          | 16/512                  | [India specifications](https://www.mi.com/in/product/xiaomi-17-ultra/specs/); do not infer the global 1 TB version is this Indian listing       |
| xiaomi-17t                | Xiaomi  | Xiaomi 17T               | 12/256; 12/512          | [India specifications](https://www.mi.com/in/product/xiaomi-17t/specs/)                                                                         |
| redmi-note-15-pro-plus-5g | Redmi   | Redmi Note 15 Pro+ 5G    | 8/256; 12/256; 12/512   | [India specifications](https://www.mi.com/in/product/redmi-note-15-pro-plus-5g/specs/)                                                          |
| redmi-note-17-pro-5g      | Redmi   | REDMI Note 17 Pro 5G     | 8/128; 8/256            | [India specifications](https://www.mi.com/in/product/redmi-note-17-pro-5g/specs/) and exact store listing variants                              |
| redmi-note-17-pro-max-5g  | Redmi   | REDMI Note 17 Pro Max 5G | 8/256; 12/256           | [Official India catalog](https://store.mi.com/in/products/448-0-0-0-0-1), exact SKU records in `li[data-config]`                                |
| redmi-note-17-5g          | Redmi   | REDMI Note 17 5G         | 6/128; 8/128            | [Official India catalog](https://store.mi.com/in/products/448-0-0-0-0-1), exact SKU records                                                     |
| poco-x8-pro               | POCO    | POCO X8 Pro              | 8/256; 8/512; 12/512    | [UAE specifications](https://www.mi.com/ae-en/product/poco-x8-pro/specs/); do not label these as verified India offers                          |

The four OnePlus specification pages return little text through the web extractor, but public HTTP HTML contains embedded specification objects. Search for `Available configurations` in the returned document. No authentication, browser automation or access-control bypass was used.

## Working exact-price extraction candidate

The public [Xiaomi India catalog](https://store.mi.com/in/products/448-0-0-0-0-1) returned approximately 152 KB of server-rendered HTML. It provides product identity, price, image and visible availability on the same product card. This is a webpage parser candidate, not a documented API or an established redistribution license.

Parse only a bounded allowlist of exact model names. The useful DOM structure is:

```text
.goods-item
  .goods-item-info
    .figure img[src]             representative image for the displayed SKU
    h2.title a[href]             exact model + RAM/storage + color, item URL
    p.price                     current visible cash price; <del> is former MRP
    .actions .J_buyGoods         explicit cart link when offered
      data-disabled="false"
      data-cid                  item/catalog ID
      data-gid                  SKU ID
  .thumb-list li[data-config]    JSON for named configurations and colors
```

Do not infer stock from undocumented `is_cos` or other thumbnail fields. The initial collector can restrict observations to main displayed cards with explicit availability. Exclude out-of-stock cards from eligible price rankings. Exclude accessories by requiring exact model identity after parsing configuration and color; “Xiaomi 17 Ultra Photography Kit Pro” is not a phone.

Example evidence observed in the HTML, not enduring price guarantees:

| Exact displayed item                            | Displayed INR amount | Original item URL                                          |
| ----------------------------------------------- | -------------------: | ---------------------------------------------------------- |
| Xiaomi 17 Ultra, 16/512, White                  |               139999 | [Item 3224101431](https://store.mi.com/in/item/3224101431) |
| Xiaomi 17T, 12/256, Violet                      |                69999 | [Item 3224101583](https://store.mi.com/in/item/3224101583) |
| Redmi Note 15 Pro+ 5G, 8/256, Carbon Black      |                39999 | [Item 3224101364](https://store.mi.com/in/item/3224101364) |
| REDMI Note 17 Pro 5G, 8/128, Cloud Blue         |                36999 | [Item 3224101689](https://store.mi.com/in/item/3224101689) |
| REDMI Note 17 Pro Max 5G, 8/256, Secret Sunrise |                49999 | [Item 3224101696](https://store.mi.com/in/item/3224101696) |
| REDMI Note 17 5G, 6/128, Arctic Blue            |                27999 | [Item 3224101632](https://store.mi.com/in/item/3224101632) |

Fetch again during collection and timestamp that response; do not make these research samples a timeless seed. A price tied to one color must not be assigned to every color. The item URLs may redirect to a model landing page; retain the original source URL and SKU and do not claim checkout preselects that exact SKU. Shipping and delivery remain destination-dependent.

The Xiaomi 17 Ultra and 17T `/buy/` pages expose `Product` JSON-LD with images and descriptions but **no Offer price** in the fetched response. The usable price evidence is the catalog card, not that JSON-LD.

## Official representative images

The following images were discovered in actual source markup; they are model-level illustrations, not verified color/configuration images for every variant.

| Model            | Official image URL                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| OnePlus 15       | https://www.oneplus.in/content/dam/oneplus/2026/in/nav/OP15-sand.png                                                       |
| OnePlus 15R      | https://www.oneplus.in/content/dam/oneplus/2026/in/nav/OP15R-Mint-Breeze.png                                               |
| OnePlus Nord 6   | https://www.oneplus.in/content/dam/oneplus/2026/product-station/oneplus-nord-6/nav/OnePlus_VW_Mint_296x296.png             |
| OnePlus Nord CE6 | https://www.oneplus.in/content/dam/oneplus/2026/product-station/oneplus-nord-ce6/others/OnePlus_Prado_Mint_296x296_new.png |
| Xiaomi 17 Ultra  | https://i03.appmifile.com/579_item_in/10/03/2026/523f0c0d69d5cf5067d4acd8f01602b3.png                                      |
| Xiaomi 17T       | https://i03.appmifile.com/922_item_in/09/06/2026/e948e8ab5a10f60c9102215f5c85f3f1.png                                      |
| POCO X8 Pro      | https://i02.appmifile.com/332_operator_sg/06/03/2026/0ad119ed645050b492d6f231af016dd8.png                                  |

The Xiaomi listing's displayed-card images provide additional exact-color references at collection time. Do not use the generic OnePlus company logo found in buy-page Open Graph metadata as a phone image.

## UAE coverage and known gaps

- [Samsung Gulf S26 Ultra specifications](https://www.samsung.com/ae/smartphones/galaxy-s26-ultra/specs/) verifies regional product presence and storage options. A simple direct HTTP request to Samsung India's buy page returned HTTP 403, so no automated Samsung price collector was established in this research.
- [OnePlus UAE 15 product page](https://www.oneplus.com/ae/15) verifies a regional marketing page. It does not establish stock, a local seller, price or warranty entitlement.
- [Xiaomi UAE POCO X8 Pro specifications](https://www.mi.com/ae-en/product/poco-x8-pro/specs/) verifies the listed configuration pairs. The UAE locale path is `ae-en`, not `ae`.
- Public OnePlus buy-page HTML did not expose a usable product Offer JSON-LD. Catalog entries can be researched and linked while price collection remains pending.
- None of this establishes Amazon/noon/Sharaf publisher-feed access. Those integrations retain the access gates in the broader expansion plan.

## Data-entry rules

Store `checkedAt`, a source label, source URL and market alongside each researched product. Preserve regional scope. Storage/RAM pairs are sufficient for the first catalog; add colors only from enumerated variants. Keep empty price arrays honest. Actual collector observations must identify their source, exact configuration, observation time and freshness limit.

Confidence is high for the cited model identities and configuration pairs; medium for practical long-term HTML parser stability. Product availability, full cross-country equivalence, warranty and retailer data permissions require further source-specific validation.
