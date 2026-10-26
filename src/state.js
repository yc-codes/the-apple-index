import {countryCurrencies} from './region.js';
export const currencies=[...new Set(Object.values(countryCurrencies))];
export function readState(url, saved, products, countries){
 const u=new URL(url);const parts=u.pathname.split('/').filter(Boolean);
 const product=products.find(p=>p.id===parts[1]);
 const country=countries.some(c=>c.code===u.searchParams.get('country'))?u.searchParams.get('country'):countries.some(c=>c.code===saved.country)?saved.country:'us';
 const requested=u.searchParams.get('currency')||(u.searchParams.has('country')?countryCurrencies[country]:saved.currency)||countryCurrencies[country];
 const currency=currencies.includes(requested)?requested:countryCurrencies[country]||'USD';
 // Variants load from the live API per product; until then the requested id is kept and validated on arrival.
 const variant=!product?null:product.variants?(product.variants.find(v=>v.id===parts[2])?.id||product.defaultVariant||product.variants[0].id):parts[2]||null;
 return {country,currency,product:product?.id||null,variant};
}
export function stateUrl(state){
 const path=state.product?`/products/${state.product}${state.variant?'/'+state.variant:''}`:'/';
 return `${path}?${new URLSearchParams({country:state.country,currency:state.currency})}`;
}
export function changePreferences(state,patch){return {...state,country:patch.country??state.country,currency:patch.currency??state.currency};}
