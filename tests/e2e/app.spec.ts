import { test, expect } from '@playwright/test';
import { product } from '../fixtures.ts';
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
test('server APIs serve stored results and report pending and unknown products', async ({
  request,
}) => {
  const listing = await request.get('/api/products');
  expect(listing.status()).toBe(200);
  expect((await listing.json()).products[0].id).toBe('macbook-pro');
  const detail = await request.get('/api/products/macbook-pro');
  expect((await detail.json()).variants).toHaveLength(3);
  expect((await request.get('/api/products/ipad-pro')).status()).toBe(503);
  expect((await request.get('/api/products/unknown')).status()).toBe(404);
  expect((await request.post('/api/products')).status()).toBe(405);
  const html = await (await request.get('/')).text();
  expect(html).toContain('The Apple Index');
});
