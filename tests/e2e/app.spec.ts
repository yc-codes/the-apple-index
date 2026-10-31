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
  await expect(page.locator('header .brand')).toContainText('The Device Index');
  await expect(page.locator('#region')).toHaveValue('in');
  await expect(page).not.toHaveURL(/\?/);
  await expect(page.locator('footer a')).toHaveCount(1);
  await page.locator('[data-product="macbook-pro"]').click();
  await page.locator('[data-spec="Color"][data-value="Black"]').click();
  await expect(page).toHaveURL(new RegExp(product.variants[1].id));
  await expect(page.locator('[data-spec="Memory"][data-value="36GB"]')).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.selectOption('#region', 'jp');
  await expect(page).toHaveURL(new RegExp(product.variants[1].id + '$'));
  await expect(page.locator('.last-fetched')).toContainText('Last fetched');
  await page.reload();
  await expect(page.locator('#region')).toHaveValue('jp');
  await expect(page.locator('[data-spec="Color"][data-value="Black"]')).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(product.variants[0].id + '$'));
  await expect(page.locator('#region')).toHaveValue('jp');
  await page.goForward();
  await expect(page).toHaveURL(new RegExp(product.variants[1].id + '$'));
  await page.locator('[data-spec="Memory"][data-value="48GB"]').click();
  await expect(page.locator('.spec-button:disabled')).toHaveText('Black');
  await expect(page.locator('#configuration-notice')).toContainText('color to Silver');
  const price = await page.locator('.comparison-table .price strong').first().textContent();
  await page.locator('#refund').uncheck();
  await expect(page.locator('.comparison-table .price strong').first()).not.toHaveText(price!);
  await page.locator('.back').click();
  await page.locator('#search').fill('not a product');
  await expect(page.locator('.empty')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#search')).toBeFocused();
  await expect(page.locator('#search')).toHaveValue('');
  await page.locator('[data-filter="Computers"]').click();
  await expect(page.locator('.product-card')).toHaveCount(1);
  for (const width of [320, 375, 768, 1024, 1440]) {
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
test('catalog refund estimates update prices and persist into product comparisons', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#region')).toHaveValue('in');
  await expect(page.locator('.deal-configuration')).toHaveText(product.variants[0].label);
  const lowest = page.locator('.card-meta strong').first();
  const withRefund = await lowest.textContent();
  const toggle = page.getByLabel('Include estimated tourist refunds');
  await expect(toggle).toBeChecked();
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).not.toBeChecked();
  await expect(lowest).not.toHaveText(withRefund!);
  const withoutRefund = (await lowest.textContent())!;
  await expect(page.locator('.deal-price')).toHaveText(withoutRefund);
  await page.locator('[data-product="macbook-pro"]').click();
  await expect(page.locator('#refund')).not.toBeChecked();
  await expect(page.locator('.comparison-summary h2')).toHaveText(withoutRefund);
  await page.locator('.back').click();
  await page.reload();
  await expect(page.locator('#catalog-refund')).not.toBeChecked();
  await expect(lowest).toHaveText(withoutRefund);
});

for (const legacyKey of ['apple-index-preferences', 'mac-index-preferences']) {
  test(`the rebrand preserves preferences from ${legacyKey}`, async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(key, JSON.stringify({ country: 'jp', currency: 'JPY', refund: false }));
    }, legacyKey);
    await page.goto('/');
    await expect(page.locator('#region')).toHaveValue('jp');
    await expect(page.locator('#catalog-refund')).not.toBeChecked();
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(localStorage.getItem('device-index-preferences') || '{}')),
      )
      .toEqual({ country: 'jp', currency: 'JPY', refund: false });
  });
}

test('brand filters expose researched phones without pretending prices are available', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveTitle('The Device Index — Global tech prices, compared.');
  await page.getByRole('combobox', { name: 'Brand', exact: true }).selectOption('Samsung');
  await page.locator('[data-filter="Phones"]').click();
  const card = page
    .locator('.product-card')
    .filter({ has: page.locator('[data-product="samsung-galaxy-s26"]') });
  await expect(card).toContainText('Prices coming soon');
  await expect(card.locator('.card-meta')).toHaveCount(0);
  await expect(page.locator('[data-product="macbook-pro"]')).toHaveCount(0);
  await card.getByRole('link', { name: 'View specifications' }).click();
  await expect(page).toHaveURL(/\/products\/samsung-galaxy-s26\/12gb-256gb$/);
  await expect(page.getByRole('heading', { name: 'Galaxy S26', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Price comparisons coming soon' })).toBeVisible();
  await expect(page.locator('.official-sources')).toContainText('Specifications checked');
  await expect(page.locator('.official-sources a').first()).toHaveAttribute(
    'href',
    /^https:\/\/www\.samsung\.com\//,
  );
  await expect(page.locator('.price-row')).toHaveCount(0);
  await expect(page.locator('#refund')).toHaveCount(0);
  await expect(page.locator('.last-fetched')).toHaveCount(0);
});

test('explicit links win and unknown variants are not silently substituted', async ({ page }) => {
  await page.goto('/products/macbook-pro/missing?country=us&currency=USD');
  await expect(page.getByRole('heading', { name: 'Configuration not found' })).toBeVisible();
  await expect(page).toHaveURL(/\/missing$/);
  await expect(page.locator('#region')).toHaveValue('us');
});
test('an exact Xiaomi offer identifies its source and expires while the page stays open', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install({ time: new Date('2030-12-31T23:50:00.000Z') });
  await page.goto('/products/xiaomi-17-ultra/16gb-512gb-white');
  await expect(page.locator('.price-row')).toHaveCount(1);
  await expect(page.locator('.price-row')).toContainText('Xiaomi India');
  await expect(page.locator('.price-row a')).toHaveAttribute(
    'href',
    'https://store.mi.com/in/item/9999999999',
  );
  await expect(page.locator('.configuration').first()).toContainText('White');
  await expect(page.locator('#refund')).toHaveCount(0);
  await page.clock.fastForward(11 * 60 * 1000);
  await expect(page.locator('.price-row')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'No current prices for this configuration' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
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
  await expect(page).not.toHaveURL(/\?/);
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
  await expect(page).not.toHaveURL(/\?/);
  await page.locator('[data-product="macbook-pro"]').click();
  await expect(page.locator('.comparison-table .price strong').first()).toBeVisible();
  await page.reload();
  await expect(page.locator('#region')).toHaveValue('jp');
  await page.goto('/products/macbook-pro?country=jp&currency=JPY');
  await expect(page).toHaveURL(new RegExp(product.defaultVariant + '$'));
  await expect(page.locator('#region')).toHaveValue('jp');
  await page.goto('/products/ipad-pro');
  await expect(
    page.getByText('Prices for this product have not been collected yet.', { exact: false }),
  ).toBeVisible();
  expect((await request.get('/products/unknown')).status()).toBe(404);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

for (const width of [375, 1440]) {
  test(`header compacts without shifting content and keeps region selection usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('#region')).toHaveValue('in');
    const header = page.locator('header');
    const expandedHeight = (await header.boundingBox())!.height;
    const contentTop = await page
      .locator('main')
      .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'instant' }));
    await expect
      .poll(async () => (await header.boundingBox())!.height)
      .toBeLessThan(expandedHeight);
    expect(await page.evaluate(() => window.scrollY)).toBe(200);
    expect(
      await page.locator('main').evaluate((el) => el.getBoundingClientRect().top + window.scrollY),
    ).toBe(contentTop);
    await header.locator('.brand').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('combobox', { name: 'Country and currency' })).toBeFocused();
    await page.selectOption('#region', 'jp');
    await expect(page.locator('.region-currency')).toHaveText('JPY');
    const picker = await page.locator('.region-picker').boundingBox();
    expect(picker!.height).toBeGreaterThanOrEqual(44);
    expect(picker!.x + picker!.width).toBeLessThanOrEqual(width);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect.poll(async () => (await header.boundingBox())!.height).toBe(expandedHeight);
  });
  test(`variant changes preserve scroll position at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/products/macbook-pro/${product.variants[0].id}`);
    await expect(page.locator('#region')).toHaveValue('in');
    await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'instant' }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(200);
    await page.locator('[data-spec="Color"][data-value="Black"]').click();
    await expect(page).toHaveURL(new RegExp(product.variants[1].id + '$'));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(200);
    await page.locator('[data-spec="Memory"][data-value="48GB"]').click();
    await expect(page).toHaveURL(new RegExp(product.variants[2].id + '$'));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(200);
  });
}
