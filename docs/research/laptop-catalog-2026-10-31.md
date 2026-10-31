# Laptop catalog evidence — 2026-10-31

Eight representative laptops across seven manufacturers, covering general productivity, business, ultraportable and gaming product lines. This is a curated selection, not a sales or popularity ranking. Each manifest entry contains one verified regional configuration; it is not an exhaustive list of configurations sold. No price or availability observations are seeded into the catalog.

## Verified configurations

| Catalog ID                         | Regional reference                      | Verified CPU / memory / storage / GPU / screen                                                            |
| ---------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `dell-14-plus-db14255`             | US, Dell offer `db14255_fixed_03`       | Ryzen AI 5 340; 16GB LPDDR5X; 512GB SSD; Radeon 840M; 14-inch 1920×1200 non-touch IPS                     |
| `lenovo-thinkpad-x1-carbon-gen-13` | US, `21NX00F9US`                        | Core Ultra 7 255U; 32GB LPDDR5X; 512GB SSD; integrated Intel Graphics; 14-inch 1920×1200 IPS, 60Hz        |
| `hp-omnibook-ultra-14-kg0831nr`    | US, `D9KL5UA#ABA`                       | Snapdragon X2 Elite X2E-84-100; 32GB; 1TB SSD; Qualcomm Adreno; 14-inch 2880×1800 OLED touch, up to 120Hz |
| `asus-zenbook-a14`                 | US, `UX3407QA-PS76` / `90NB1502-M00FM0` | Snapdragon X X1-26-100; 32GB LPDDR5X; 1TB SSD; Qualcomm Adreno; 14-inch 1920×1200 OLED, 60Hz              |
| `asus-rog-zephyrus-g14-2025`       | US, `GA403UP-CS96`                      | Ryzen 9 270; 32GB LPDDR5X; 1TB SSD; RTX 5070 Laptop GPU with 8GB GDDR7; 14-inch 2880×1800 OLED, 120Hz     |
| `microsoft-surface-laptop-13`      | US, 13-inch 1st Edition, Platinum       | Snapdragon X Plus 8-core; 16GB LPDDR5X; 256GB UFS; Qualcomm Adreno; 13-inch PixelSense                    |
| `samsung-galaxy-book5-pro-16`      | UK (`gb`), `NP960XHA-KG1UK`             | Core Ultra 7 256V; 16GB LPDDR5X; 512GB SSD; Intel Arc 140V; 16-inch 2880×1800 Dynamic AMOLED 2X touch     |
| `acer-swift-go-14-sfg14-71`        | India, `SFG14-71-70BG` / `NX.KF1SI.007` | Core i7-13700H; 16GB LPDDR5; 1TB SSD; Intel Iris Xe; 14-inch 2880×1800 OLED, 90Hz, non-touch              |

## Primary evidence and limits

1. **Dell:** [US configuration page](https://www.dell.com/en-us/shop/cty/spd/dellplus14laptopdb14255). The selected configuration block and detailed specifications agree on the tuple. The processor description identifies Radeon 840M; the shorter graphics field says Radeon Graphics. The identifier stored in `part` is explicitly an **offer ID**, not a separately verified manufacturer part number. The earlier [XPS 13 page](https://www.dell.com/en-us/shop/dell-computer-laptops/spd/xps139350) explicitly said unavailable, so it was not added.
2. **Lenovo:** [exact-model PSREF](https://psref.lenovo.com/Detail/ThinkPad_X1_Carbon_Gen_13?M=21NX00F9US), also available through [PSREF's numeric product route](https://psref.lenovo.com/Detail/2520?M=21NX00F9US). The direct text renderer returned an empty application shell; the search index's manufacturer-page extract exposed the exact model's CPU, RAM, SSD, graphics, display and OS rows. A future collector must obtain actual offers separately.
3. **HP:** [US exact-SKU product page](https://www.hp.com/us-en/shop/pdp/hp-omnibook-ultra-laptop-next-gen-ai-14-kg0831nr). Technical specifications name the processor precisely. The extracted page displayed a placeholder zero in its cart area, which is unusable as an offer. The manifest does not use it. Product image was extracted from that page's image link.
4. **ASUS Zenbook:** [US model list](https://www.asus.com/us/laptops/for-home/zenbook/asus-zenbook-a14-ux3407/where-to-buy/) supplies exact SKU, manufacturer part and processor; [official US announcement](https://www.asus.com/us/news/qyjjfnz7m8jbmbb3/) supplies the matched memory, storage and display in its SKU table. The announcement's indexed official excerpt was readable; a direct open subsequently returned an error. [US technical specifications](https://www.asus.com/us/laptops/for-home/zenbook/asus-zenbook-a14-ux3407/techspec/) were also inspected, but its independent option lists were not multiplied into combinations.
5. **ASUS ROG:** [US specification comparison](https://rog.asus.com/us/laptops/rog-zephyrus/rog-zephyrus-g14-2025/spec/) contains the exact `GA403UP-CS96` column. CPU, GPU, RAM, SSD and display are read from that same column. The [configuration-query version](https://rog.asus.com/us/laptops/rog-zephyrus/rog-zephyrus-g14-2025/spec/?config=90NR0M53-M00910) was inspected first but still returned the full comparison; the query itself was not treated as SKU evidence.
6. **Microsoft:** [US configurator](https://www.microsoft.com/en-us/store/configure/surface-laptop-13-inch/8mzbmmcjzqv3) explicitly lists Platinum, 16GB, 256GB together. Its specification section identifies UFS, although its selection labels say SSD. The manifest uses UFS. [Microsoft support](https://support.microsoft.com/en-us/surface/models/surface-laptop-13-inch-features) confirms the 13-inch 1st Edition identity. An exact manufacturer part number was not established; none is invented.
7. **Samsung:** [UK exact-model specifications](https://www.samsung.com/uk/business/computers/galaxy-book/galaxy-book5-pro-16-inch-ultra-7-16gb-512gb-np960xha-kg1uk/). The business page explicitly lists Windows 11 Home. Its GPU memory is shared; the catalog does not present it as dedicated VRAM. This is UK SKU evidence, not evidence for availability in other countries.
8. **Acer:** [India exact-model specifications](https://www.acer.com/in-en/laptops/swift/swift-go/pdp/NX.KF1SI.007). Some direct follow-up opens timed out, but the official page's complete indexed specification extract exposed the model and all tuple fields. This is an established older SFG14-71 generation still documented by Acer; no newest-model or stock claim is made.

## Images

Only URLs extracted from actual official markup were added: HP's product image link, the ASUS A14 `img` on its US model page, and the first ROG comparison column's `img`. The A14 image is a model illustration rather than independent color evidence. Other products use the application's fallback; generic Samsung logo metadata was deliberately not used as a product photo.

## Collector follow-up

The ROG comparison HTML exposes Product JSON-LD with `sku`, `offers.url`, `priceCurrency`, `price`, and `availability`; the observed offer was out of stock. Its generic description also incorrectly referred to a Flow Z13. Before enabling a collector, verify the JSON-LD manufacturer's SKU against the selected G14 SKU and exact configuration. No JSON-LD amount was imported. HP's zero-valued placeholder must be rejected. Dell's page includes configuration blocks and offer IDs, but direct generic HTTP fetching returned 403 during this check.

Laptop offers should match manufacturer SKU where available and preserve CPU, RAM, storage, GPU and display identity. A product family name alone is not sufficient. Keyboard region, operating-system edition and item condition also matter when comparing regional offers.

## Validation

The manifest parses as JSON and contains eight unique product IDs, eight configurations and seven brands. Every configuration uses exactly its declared dimension keys, each source matches its reference market, and no manifest entry contains a price field. Application integration and broader tests belong to the core catalog change.
