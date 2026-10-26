export const countryCurrencies = {
  ae: 'AED',
  at: 'EUR',
  au: 'AUD',
  be: 'EUR',
  br: 'BRL',
  ca: 'CAD',
  ch: 'CHF',
  cl: 'CLP',
  cz: 'CZK',
  de: 'EUR',
  dk: 'DKK',
  es: 'EUR',
  fi: 'EUR',
  fr: 'EUR',
  gb: 'GBP',
  hk: 'HKD',
  hu: 'HUF',
  ie: 'EUR',
  in: 'INR',
  it: 'EUR',
  jp: 'JPY',
  kr: 'KRW',
  lu: 'EUR',
  mx: 'MXN',
  my: 'MYR',
  nl: 'EUR',
  no: 'NOK',
  nz: 'NZD',
  ph: 'PHP',
  pl: 'PLN',
  pt: 'EUR',
  sa: 'SAR',
  se: 'SEK',
  sg: 'SGD',
  th: 'THB',
  tr: 'TRY',
  tw: 'TWD',
  us: 'USD',
  vn: 'VND',
};
export function regionPreferences(country) {
  return { country, currency: countryCurrencies[country] || 'USD' };
}
export function fallbackCountry(timezone, languages = []) {
  const zones = {
    'Asia/Kolkata': 'in',
    'Asia/Calcutta': 'in',
    'Asia/Tokyo': 'jp',
    'Asia/Singapore': 'sg',
    'Asia/Hong_Kong': 'hk',
    'Europe/London': 'gb',
    'Asia/Dubai': 'ae',
    'Asia/Shanghai': 'cn',
    'Australia/Sydney': 'au',
    'Europe/Paris': 'fr',
    'Europe/Berlin': 'de',
    'America/New_York': 'us',
    'America/Los_Angeles': 'us',
  };
  if (countryCurrencies[zones[timezone]]) return zones[timezone];
  for (const language of languages) {
    try {
      const country = new Intl.Locale(language).region?.toLowerCase();
      if (countryCurrencies[country]) return country;
    } catch {}
  }
  return 'us';
}
export async function detectCountry(fallback, fetcher = fetch) {
  try {
    const response = await fetcher('https://ipapi.co/json/', { signal: AbortSignal.timeout(2500) });
    if (!response.ok) return fallback;
    const data = await response.json();
    const country = data.country_code?.toLowerCase();
    return countryCurrencies[country] ? country : fallback;
  } catch {
    return fallback;
  }
}
