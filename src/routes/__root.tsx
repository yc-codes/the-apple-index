import { createRootRoute, HeadContent, Outlet, Scripts, useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { getMeta } from '../data';
import { PreferencesProvider, Layout } from '../components/layout';
import { countryCurrencies } from '../region.ts';
import styles from '../style.css?url';
import type { Preferences } from '../types';

export const Route = createRootRoute({
  loader: getMeta,
  validateSearch: (search: Record<string, unknown>): Preferences => ({
    country:
      typeof search.country === 'string' && search.country in countryCurrencies
        ? search.country
        : undefined,
    currency:
      typeof search.currency === 'string' &&
      Object.values(countryCurrencies).includes(search.currency)
        ? search.currency
        : undefined,
  }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'The Apple Index — Apple prices, everywhere.' },
      {
        name: 'description',
        content: 'Compare Apple configurations and regional store prices in your currency.',
      },
    ],
    links: [{ rel: 'stylesheet', href: styles }],
  }),
  component: Root,
  notFoundComponent: () => (
    <div className="boot">
      <h1>Page not found</h1>
      <a href="/">Back to the index</a>
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="boot" role="alert">
      <p>We couldn’t load this page.</p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </div>
  ),
});
function Root() {
  const router = useRouter();
  // After hydration, reload route data from GitHub; the prerendered snapshot stays until it arrives.
  useEffect(() => {
    router.invalidate();
  }, [router]);
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <PreferencesProvider>
          <Layout>
            <Outlet />
          </Layout>
        </PreferencesProvider>
        <Scripts />
      </body>
    </html>
  );
}
