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
  search: Preferences;
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
  const [initialized, setInitialized] = useState(false);
  const revision = useRef(0);
  const current = useRef({ location, search });
  current.current = { location, search };
  const country = (initialized && search.country) || 'us';
  const currency = (initialized && search.currency) || currencies[country];
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
    const initial = current.current.search;
    const preferred =
      initial.country || (saved.country && currencies[saved.country] ? saved.country : null);
    const fallback = fallbackCountry(Intl.DateTimeFormat().resolvedOptions().timeZone, [
      ...navigator.languages,
    ]);
    const version = revision.current;
    const apply = (selected: string) => {
      if (cancelled || revision.current !== version) return;
      void navigate({
        to: current.current.location.pathname as '/',
        search: {
          country: selected,
          currency:
            initial.currency ||
            (preferred && saved.country === selected ? saved.currency : null) ||
            currencies[selected],
        },
        replace: true,
      });
      setInitialized(true);
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
    if (!initialized) return;
    try {
      localStorage.setItem(key, JSON.stringify({ country, currency, refund }));
    } catch {
      /* Optional persistence. */
    }
  }, [country, currency, refund, initialized]);
  const setCountry = (value: string) => {
    revision.current++;
    setInitialized(true);
    void navigate({
      to: location.pathname as '/',
      search: { country: value, currency: currencies[value] },
    });
  };
  return (
    <Context.Provider
      value={{
        country,
        currency,
        refund,
        setRefund: (value) => {
          setRefundValue(value);
          setInitialized(true);
        },
        setCountry,
        search: { country, currency },
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
  onClick?: () => void;
  'aria-current'?: 'true' | 'false';
  title?: string;
  'data-spec'?: string;
  'data-value'?: string;
  'data-product'?: string;
}) {
  const { search } = usePreferences();
  return (
    <Link to={path as '/'} search={search} {...props}>
      {children}
    </Link>
  );
}
export function Layout({ children }: { children: ReactNode }) {
  const { data: meta } = useMeta();
  const { country, currency, setCountry } = usePreferences();
  // Static names keep server and browser markup identical across ICU versions.
  const countries = meta?.stores || stores;
  return (
    <>
      <header>
        <div className="header-inner">
          <IndexLink className="brand">
            <span className="brand-icon">
              a<span>↗</span>
            </span>
            The Apple Index<span className="brand-period">.</span>
          </IndexLink>
          <nav aria-label="Preferences">
            <label>
              COUNTRY &amp; CURRENCY
              <select
                id="region"
                aria-label="Country and currency"
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
            </label>
          </nav>
        </div>
      </header>
      <main>
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
        <a href="https://www.apple.com/choose-country-region/" target="_blank" rel="noreferrer">
          Apple Stores ↗
        </a>
        <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">
          Exchange rates ↗
        </a>
      </footer>
    </>
  );
}
