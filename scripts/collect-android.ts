import { collectAndroid, publishAndroidCatalog } from '../server/android';
import { storage } from '../server/storage';
import { errorMessage } from '../server/json';

try {
  const result = await collectAndroid(storage);
  console.log(
    `Published ${result.offers} Xiaomi India offers across ${result.products} models at ${result.observedAt}.`,
  );
} catch (error) {
  // A failed source never refreshes the observation timestamp or erases last successful data.
  await publishAndroidCatalog(storage);
  console.error('Android collection:', errorMessage(error));
  process.exitCode = 1;
}
