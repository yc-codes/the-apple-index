import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearch } from '@tanstack/react-router';
import { useMeta } from '../api';
import { countryCurrencies, detectCountry, fallbackCountry } from '../region.ts';
import type { Preferences } from '../types';
import { stores } from '../../server/stores';

type PrefContext = {
  country: string;
  currency: string;
  refund: boolean;
  setRefund: (value: boolean) => void;
  setCountry: (value: string) => void;
};
const Context = createContext<PrefContext | null>(null);
export function usePreferences() {
  const value = useContext(Context);
  if (!value) throw new Error('Missing preferences');
  return value;
}
const currencies: Record<string, string> = countryCurrencies;
export const flag = (code: string) =>
  String.fromCodePoint(
    ...code
      .toUpperCase()
      .split('')
      .map((c) => 127397 + c.charCodeAt(0)),
  );
const key = 'apple-index-preferences';
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const search = useSearch({ strict: false }) as Preferences;
  const location = useLocation();
  const navigate = useNavigate();
  const [refund, setRefundValue] = useState(true);
  // Null until the browser has chosen a country, so server and first client render match.
  const [selected, setSelected] = useState<{ country: string; currency: string } | null>(null);
  const revision = useRef(0);
  const current = useRef({ location, search });
  current.current = { location, search };
  const country = selected?.country || 'us';
  const currency = selected?.currency || currencies[country];
  useEffect(() => {
    let cancelled = false;
    let saved: { country?: string; currency?: string; refund?: boolean } = {};
    try {
      saved =
        JSON.parse(
          localStorage.getItem(key) || localStorage.getItem('mac-index-preferences') || '{}',
        ) || {};
    } catch {
      /* Storage can be unavailable. */
    }
    setRefundValue(saved.refund ?? true);
    // Older shared links may carry ?country=&currency=; honour them once, then drop them.
    const initial = current.current.search;
    if (initial.country || initial.currency)
      void navigate({ to: current.current.location.pathname as '/', search: {}, replace: true });
    const preferred =
      initial.country || (saved.country && currencies[saved.country] ? saved.country : null);
    const fallback = fallbackCountry(Intl.DateTimeFormat().resolvedOptions().timeZone, [
      ...navigator.languages,
    ]);
    const version = revision.current;
    const apply = (choice: string) => {
      if (cancelled || revision.current !== version) return;
      setSelected({
        country: choice,
        currency:
          initial.currency ||
          (preferred && saved.country === choice ? saved.currency : null) ||
          currencies[choice],
      });
    };
    if (preferred || initial.currency) apply(preferred || fallback);
    else {
      apply(fallback);
      void detectCountry(fallback).then(apply);
    }
    return () => {
      cancelled = true;
    };
  }, [navigate]);
  useEffect(() => {
    if (!selected) return;
    try {
      localStorage.setItem(key, JSON.stringify({ ...selected, refund }));
    } catch {
      /* Optional persistence. */
    }
  }, [selected, refund]);
  return (
    <Context.Provider
      value={{
        country,
        currency,
        refund,
        setRefund: (value) => {
          setRefundValue(value);
          setSelected((s) => s ?? { country, currency });
        },
        setCountry: (value) => {
          revision.current++;
          setSelected({ country: value, currency: currencies[value] });
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function IndexLink({
  path = '/',
  children,
  ...props
}: {
  path?: string;
  children: ReactNode;
  className?: string;
  resetScroll?: boolean;
  onClick?: () => void;
  'aria-current'?: 'true' | 'false';
  title?: string;
  'data-spec'?: string;
  'data-value'?: string;
  'data-product'?: string;
}) {
  return (
    <Link to={path as '/'} {...props}>
      {children}
    </Link>
  );
}
export function Layout({ children }: { children: ReactNode }) {
  const { data: meta } = useMeta();
  const { country, currency, setCountry } = usePreferences();
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const update = () => setCompact(window.scrollY > 48);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  // Static names keep server and browser markup identical across ICU versions.
  const countries = meta?.stores || stores;
  const countryName = countries.find((c) => c.code === country)?.name || country.toUpperCase();
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="header-space">
        <header data-compact={compact}>
          <div className="header-inner">
            <IndexLink className="brand">
              <span className="brand-icon" aria-hidden="true">
                a<span>↗</span>
              </span>
              The Apple Index<span className="brand-period">.</span>
            </IndexLink>
            <nav aria-label="Preferences">
              <div className="region-picker">
                <div className="region-display" aria-hidden="true">
                  <span className="region-flag">{flag(country)}</span>
                  <span className="region-name">{countryName}</span>
                  <span className="region-currency">{currency}</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
                <select
                  id="region"
                  aria-label="Country and currency"
                  title={`Country and currency: ${countryName} · ${currency}`}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  {[...countries]
                    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
                    .map((c) => (
                      <option key={c.code} value={c.code}>
                        {flag(c.code)} {c.name} · {c.code === country ? currency : c.currency}
                      </option>
                    ))}
                </select>
              </div>
            </nav>
          </div>
        </header>
      </div>
      <main id="main-content" tabIndex={-1}>
        {children}
        <aside className="data-note">
          <span>ⓘ</span>
          <p>
            Prices are collected from Apple’s regional stores. Tax and tourist refunds are
            estimates; eligibility varies.{' '}
            {meta?.rates
              ? `Exchange rates updated ${new Date(meta.rates.updated).toLocaleDateString('en-GB', { timeZone: 'UTC' })}.`
              : 'Exchange rates have not been collected yet.'}{' '}
            Check with Apple before purchasing.
          </p>
        </aside>
      </main>
      <footer>
        <IndexLink className="brand">The Apple Index.</IndexLink>
        <p>A better view of what you pay.</p>
      </footer>
    </>
  );
}
