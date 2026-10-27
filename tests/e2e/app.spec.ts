import { test, expect } from '@playwright/test';
import { product } from '../fixtures.ts';
test('country labels hydrate even when browser locale data differs from the server', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    // ICU releases can use different English names for the same country.
    Intl.DisplayNames.prototype.of = function (code: string) {
      return `Browser region ${code}`;
    };
  });
  await page.goto('/');
  await expect(page.locator('#region')).toHaveValue('in');
  await expect(page.locator('#region option[value="tr"]')).toContainText('Türkiye');
  expect(errors).toEqual([]);
});
test.beforeEach(async ({ page }) => {
  await page.route('https://ipapi.co/json/', (route) =>
    route.fulfill({ json: { country_code: 'IN' } }),
  );
  await page.route('https://images.example.test/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="silver"/></svg>',
    }),
  );
});
test('React configuration, region, history and reload preserve the exact hardware', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('header .brand')).toContainText('The Apple Index');
  await expect(page.locator('#region')).toHaveValue('in');
  await page.locator('[data-product="macbook-pro"]').click();
  await page.locator('[data-spec="Color"][data-value="Black"]').click();
  await expect(page).toHaveURL(new RegExp(product.variants[1].id));
  await expect(page.locator('[data-spec="Memory"][data-value="36GB"]')).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.selectOption('#region', 'jp');
  await expect(page).toHaveURL(new RegExp(product.variants[1].id + '\\?country=jp&currency=JPY'));
  await page.reload();
  await expect(page.locator('[data-spec="Color"][data-value="Black"]')).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.goBack();
  await expect(page.locator('#region')).toHaveValue('in');
  await page.goForward();
  await expect(page.locator('#region')).toHaveValue('jp');
  await page.locator('[data-spec="Memory"][data-value="48GB"]').click();
  await expect(page.locator('.spec-button:disabled')).toHaveText('Black');
  await expect(page.locator('#configuration-notice')).toContainText('color to Silver');
  const price = await page.locator('.comparison-table .price strong').first().textContent();
  await page.locator('#refund').uncheck();
  await expect(page.locator('.comparison-table .price strong').first()).not.toHaveText(price!);
  await page.locator('.back').click();
  await page.locator('#search').fill('not a product');
  await expect(page.locator('.empty')).toBeVisible();
  await page.locator('#search').fill('');
  await page.locator('[data-filter="Mac"]').click();
  await expect(page.locator('.product-card')).toHaveCount(1);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.locator('[data-product="macbook-pro"]').click();
  await page.setViewportSize({ width: 375, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
test('explicit links win and unknown variants are not silently substituted', async ({ page }) => {
  await page.goto('/products/macbook-pro/missing?country=us&currency=USD');
  await expect(page.getByRole('heading', { name: 'Configuration not found' })).toBeVisible();
  await expect(page).toHaveURL(/\/missing\?country=us&currency=USD/);
  await expect(page.locator('#region')).toHaveValue('us');
});
test('late country lookup cannot overwrite a manual selection', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route('https://ipapi.co/json/', async (route) => {
    await gate;
    await route.fulfill({ json: { country_code: 'IN' } });
  });
  await page.goto('/');
  await page.selectOption('#region', 'jp');
  const response = page.waitForResponse('https://ipapi.co/json/');
  release();
  await response;
  await expect(page.locator('#region')).toHaveValue('jp');
  await expect(page).toHaveURL(/currency=JPY/);
});
test('bundled prices render without API requests and retain pending and unknown states', async ({
  page,
  request,
}) => {
  await page.addInitScript(() => {
    Date.now = () => Date.parse('2030-01-01T00:00:00Z');
  });
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) requests.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  const html = await (await request.get('/')).text();
  expect(html).toContain('MacBook Pro');
  expect(html).toContain('card-prices');
  const detail = await (
    await request.get(`/products/macbook-pro/${product.variants[0].id}`)
  ).text();
  expect(detail).toContain('Prices around the world');
  expect(detail).toContain('United States');
  await page.goto('/?country=jp&currency=JPY');
  await expect(page.locator('#region')).toHaveValue('jp');
  await page.locator('[data-product="macbook-pro"]').click();
  await expect(page.locator('.comparison-table .price strong').first()).toBeVisible();
  await page.reload();
  await expect(page.locator('#region')).toHaveValue('jp');
  await page.goto('/products/macbook-pro?country=jp&currency=JPY');
  await expect(page).toHaveURL(new RegExp(product.defaultVariant + '\\?country=jp&currency=JPY'));
  await expect(page.locator('#region')).toHaveValue('jp');
  await page.goto('/products/ipad-pro');
  await expect(
    page.getByText('Prices for this product have not been collected yet.', { exact: false }),
  ).toBeVisible();
  expect((await request.get('/products/unknown')).status()).toBe(404);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});
