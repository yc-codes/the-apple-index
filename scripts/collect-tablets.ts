import { collectTablets } from '../server/tablets';
import { publishResearchedCatalog } from '../server/published-catalog';
import { storage } from '../server/storage';
import { errorMessage } from '../server/json';

try {
  const result = await collectTablets(storage);
  console.log(
    `Published ${result.offers} Xiaomi India tablet offers across ${result.products} models at ${result.observedAt}.`,
  );
} catch (error) {
  await publishResearchedCatalog(storage);
  console.error('Tablet collection:', errorMessage(error));
  process.exitCode = 1;
}
