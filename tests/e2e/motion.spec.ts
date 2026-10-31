import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://ipapi.co/json/', (route) =>
    route.fulfill({ json: { country_code: 'IN' } }),
  );
  await page.route('https://images.example.test/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"/>',
    }),
  );
});

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`homepage interactions remain usable with motion: ${reducedMotion}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.emulateMedia({ reducedMotion });
    await page.goto('/');
    await expect(page.locator('#region')).toHaveValue('in');
    await expect(page.locator('.hero h1')).toHaveCSS('opacity', '1');
    const deals = page.getByRole('region', { name: 'Featured price comparisons' });
    const next = deals.getByRole('button', { name: 'Next comparison' });
    const previous = deals.getByRole('button', { name: 'Previous comparison' });

    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const height = await deals.evaluate((element) => element.getBoundingClientRect().height);
      await next.focus();
      await page.keyboard.press('Enter');
      await expect(deals.getByRole('link')).toHaveCount(1);
      await expect(deals.getByRole('link')).toContainText('iPhone 18 Pro Max');
      await expect(next).toBeFocused();
      await expect(deals.locator('.deal-slide')).toHaveCount(1);
      expect(await deals.evaluate((element) => element.getBoundingClientRect().height)).toBe(
        height,
      );
      await next.click();
      await expect(deals.getByRole('link')).toContainText('MacBook Pro');
      await previous.click();
      await expect(deals.getByRole('link')).toContainText('iPhone 18 Pro Max');
      await previous.click();
      await expect(deals.getByRole('link')).toContainText('MacBook Pro');
      await expect(deals.locator('.deal-slide')).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }

    // Interrupt transitions before they finish; only the final selection must remain interactive.
    await page.locator('[data-filter="Phones"]').click();
    await page.locator('[data-filter="Tablets"]').click();
    await page.getByRole('combobox', { name: 'Brand' }).selectOption('Apple');
    await page.locator('[data-filter="Laptops"]').click();
    await expect(page.locator('[data-filter="Laptops"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByRole('article')).toContainText('MacBook Pro');
    await expect(page.locator('.product-card')).toHaveCount(1);
    await page.locator('#search').fill('missing');
    await expect(page.getByRole('heading', { name: 'No matching products' })).toBeVisible();
    await expect(page.locator('.product-card')).toHaveCount(0);
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.locator('#search')).toBeFocused();
    await expect(page.locator('[data-product="macbook-pro"]')).toBeVisible();
    await expect(page.locator('[data-product="ipad-pro"]')).toBeVisible();
    await expect(page.locator('[data-product="iphone-18-pro"]')).toBeVisible();
    await expect(page.locator('.tab-highlight')).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}

test('reduced motion skips hero, deal and layout movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#region')).toHaveValue('in');
  const movingElements = await page.evaluate(async () => {
    const moved = new Set<string>();
    (document.querySelector('[aria-label="Next comparison"]') as HTMLButtonElement).click();
    (document.querySelector('[data-filter="Phones"]') as HTMLButtonElement).click();
    for (let frame = 0; frame < 24; frame++) {
      await new Promise(requestAnimationFrame);
      for (const element of document.querySelectorAll(
        '.hero > div, .hero h1, .hero p, .hero .primary, .deal-slide, .tab-highlight, .product-card',
      )) {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
        if (!matrix.isIdentity) moved.add(element.className || element.tagName);
      }
    }
    return [...moved];
  });
  expect(movingElements).toEqual([]);
});

test('the prerendered hero and catalog stay visible without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto('http://localhost:5190/');
    await expect(page.locator('.hero h1')).toBeVisible();
    await expect(page.locator('.hero h1')).toHaveCSS('opacity', '1');
    await expect(page.getByRole('link', { name: 'Explore products' })).toBeVisible();
    await expect(page.locator('.product-card').first()).toHaveCSS('opacity', '1');
    await expect(page.locator('.deal')).toBeVisible();
  } finally {
    await context.close();
  }
});
