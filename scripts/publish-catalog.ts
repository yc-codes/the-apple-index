import { publishResearchedCatalog } from '../server/published-catalog';
import { researchedProducts } from '../server/products';
import { storage } from '../server/storage';

// Publish reference configurations without contacting any manufacturer or replacing prices.
await publishResearchedCatalog(storage);
console.log(
  `Published ${researchedProducts.length} researched products; existing observations preserved.`,
);
