import './style.css';
import {configurationOptions,variantById} from './configuration.js';
import {rankPrices,taxNote} from './pricing.js';
import {readState,stateUrl,changePreferences} from './state.js';
import {countryCurrencies,regionPreferences,fallbackCountry,detectCountry} from './region.js';

// All data is live: Apple store prices and exchange rates come from the /api server, never from bundled files.
async function api(path){
 const response=await fetch(path);const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(body.error||`Request failed (${response.status})`);
 return body;
}
const categories=['All products','Mac','iPhone','iPad','Watch','TV & Home'];
let meta,listing,stores={},countries=[];
const details=new Map(),loading=new Map(),failures=new Map();
let saved={};try{saved=JSON.parse(localStorage.getItem('mac-index-preferences'))||{};}catch{}
let includeRefund=saved.refund??true,filter='All products',search='',preferenceRevision=0,notice='',listingTimer=null;
let state;

const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const flag=code=>String.fromCodePoint(...code.toUpperCase().split('').map(c=>127397+c.charCodeAt(0)));
const money=usd=>new Intl.NumberFormat('en-US',{style:'currency',currency:state.currency,maximumFractionDigits:0}).format(usd*(meta.rates.rates[state.currency]||1));
const countryName=code=>stores[code]?.name||code.toUpperCase();
const pricingOptions=()=>({refund:includeRefund});
function ago(iso){
 if(!iso)return 'not yet';const minutes=Math.round((Date.now()-new Date(iso))/60e3);
 return minutes<1?'just now':minutes<60?`${minutes} min ago`:minutes<48*60?`${Math.round(minutes/60)} h ago`:new Date(iso).toLocaleDateString('en-GB');
}
const knownProducts=()=>listing.products.map(p=>details.get(p.id)||p);
function savePreferences(){try{localStorage.setItem('mac-index-preferences',JSON.stringify({country:state.country,currency:state.currency,refund:includeRefund}));}catch{}}
function go(next,replace=false){state=next;history[replace?'replaceState':'pushState']({},'',stateUrl(state));savePreferences();render();}

function loadProduct(id){
 if(details.has(id)||loading.has(id))return;
 failures.delete(id);
 loading.set(id,api('/api/products/'+id).then(product=>{
  details.set(id,product);
  // Validate the configuration from the URL now that the real list exists; unknown ids fall back to the default.
  if(state.product===id&&!variantById(product,state.variant))go({...state,variant:product.defaultVariant},true);
 },error=>failures.set(id,error.message)).finally(()=>{loading.delete(id);render();}));
}
function refreshListing(){
 clearTimeout(listingTimer);
 if(listing.ready)return;
 // Families still being collected from Apple fill in as they arrive.
 listingTimer=setTimeout(()=>api('/api/products').then(next=>{listing=next;if(!state.product)render();}).catch(()=>{}).finally(refreshListing),5000);
}

function art(name,image,eager){return `<div class="product-art">${image?`<img src="${escape(image)}" alt="${escape(name)}" loading="${eager?'eager':'lazy'}" decoding="async" referrerpolicy="no-referrer">`:''}<span class="image-fallback" ${image?'hidden':''}>${escape(name)}</span></div>`;}
function priceRow(row,i,base,{compact,stale}={}){
 const diff=base?(row.usd/base.usd-1)*100:null;
 const relative=diff===null?'No price in your country':Math.abs(diff)<.05?'Your benchmark':`${diff>0?'+':'−'}${Math.abs(diff).toFixed(1)}%`;
 const oldRow=stale&&row.at&&new Date(stale)-new Date(row.at)>60e3;
 return `<div class="price-row"><span class="rank">${String(i+1).padStart(2,'0')}</span><span class="flag">${flag(row.code)}</span><div class="country">${escape(countryName(row.code))} ${row.code===state.country?'<small class="base">BASE</small>':''}<small>${escape(taxNote(row.store,pricingOptions()))}</small></div><div class="price"><strong>${money(row.usd)}</strong><small class="${diff!==null&&diff<0?'saving':''}">${relative}</small>${compact?'':`<small class="shelf">Apple: ${escape(row.display||row.local)}${oldRow?` · from ${ago(row.at)}`:''}</small>`}</div>${compact?'':`<a class="store" href="${escape(row.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open the ${escape(countryName(row.code))} Apple Store">↗</a>`}</div>`;
}
function card(p){
 const href=stateUrl({...state,product:p.id,variant:p.variant?.id||null});
 if(!p.ready)return `<article class="product-card loading-card" aria-busy="true"><a class="card-top" data-product="${p.id}" href="${href}"><div><span class="eyebrow">${escape(p.category)}</span><h3>${escape(p.name)}</h3><p>Collecting live prices from Apple…</p></div><span class="circle-arrow">↗</span></a><div class="product-art"><span class="skeleton"></span></div><div class="card-prices">${'<div class="price-row"><span class="skeleton line"></span></div>'.repeat(3)}</div></article>`;
 const rows=rankPrices(p,stores,meta.rates.rates,pricingOptions()),base=rows.find(r=>r.code===state.country);
 return `<article class="product-card"><a class="card-top" data-product="${p.id}" data-variant="${escape(p.variant.id)}" href="${href}"><div><span class="eyebrow">${escape(p.category)} · ${p.configurations} configurations</span><h3>${escape(p.name)}</h3><p>From: ${escape(p.variant.label)}</p></div><span class="circle-arrow">↗</span></a>${art(p.name,p.image)}<div class="card-prices"><div class="card-meta"><span>LOWEST PRICE</span><strong>${rows[0]?money(rows[0].usd):'—'}</strong></div>${rows.slice(0,3).map((r,i)=>priceRow(r,i,base,{compact:true})).join('')}<a class="all-prices" data-product="${p.id}" data-variant="${escape(p.variant.id)}" href="${href}">Compare ${rows.length} countries <span>→</span></a></div></article>`;
}
function listingView(){
 const products=listing.products.filter(p=>(filter==='All products'||p.category===filter)&&p.name.toLowerCase().includes(search.toLowerCase()));
 const tracked=listing.products.reduce((n,p)=>n+(p.configurations||0),0);
 return `<section class="hero"><div><div class="eyebrow"><i class="live-dot"></i> LIVE FROM ${countries.length} APPLE STORES</div><h1>Same Apple.<br>Different <em>price.</em></h1><p>Live Apple Store prices from around the world, in your currency.<br>Every configuration, compared like for like.</p><a class="primary" href="#catalog">Find your next Apple <span>↘</span></a></div><div class="hero-note"><span class="orbit">◎</span><div class="stat"><strong>${countries.length}</strong><span>countries.<br>${listing.ready?`${tracked} configurations tracked.`:`${listing.products.filter(p=>p.ready).length} of ${listing.products.length} product families ready.`}</span></div><div class="note-bottom">LOCAL PRICES. GLOBAL PERSPECTIVE.<span>↗</span></div></div></section><section id="catalog"><div class="section-heading"><div><span class="eyebrow">THE INDEX</span><h2>Good things. Better prices.</h2></div><p>Compared with <strong>${escape(countryName(state.country))}</strong> ${flag(state.country)}</p></div><div class="catalog-tools"><div class="tabs" role="group" aria-label="Product category">${categories.map(c=>`<button data-filter="${c}" class="${filter===c?'active':''}">${c}</button>`).join('')}</div><label class="search"><span>⌕</span><input id="search" type="search" placeholder="Find a product" aria-label="Find a product" value="${escape(search)}"></label></div><div class="product-grid">${products.map(card).join('')||'<p class="empty">No products found. Try another search or category.</p>'}</div></section>`;
}
function selector(product,variant){
 if(!product.dimensions.length)return '<p class="standard-configuration">One standard configuration</p>';
 return `<div class="configuration-selector" aria-label="Product configuration">${configurationOptions(product,variant.id).map(group=>`<fieldset class="configuration-group"><legend>${escape(group.name)}</legend><div class="configuration-options">${group.values.map(option=>{
  const also=option.changes.length?`Also changes ${option.changes.map(c=>`${/^[A-Z]{2,}/.test(c.name)?c.name:c.name.toLowerCase()} to ${c.label}`).join(', ')}`:'';
  return `<a class="spec-button${also&&!option.selected?' shifts':''}" href="${stateUrl({...state,variant:option.target})}" data-variant="${escape(option.target)}" data-spec="${escape(group.name)}" data-value="${escape(option.label)}" data-changes="${escape(also)}" aria-current="${option.selected}" ${also&&!option.selected?`title="${escape(also)}"`:''}>${escape(option.label)}</a>`;}).join('')}</div></fieldset>`).join('')}</div><p class="configuration-notice" role="status" id="configuration-notice">${escape(notice)}</p>`;
}
function detailView(){
 const summary=listing.products.find(p=>p.id===state.product),product=details.get(state.product);
 const back=`<a class="back" href="${stateUrl({...state,product:null,variant:null})}" data-home>← All products</a>`;
 if(!product){
  const error=failures.get(state.product);
  return `${back}<section class="detail-top"><div><span class="eyebrow">${escape(summary.category)} / GLOBAL PRICE COMPARISON</span><h1>${escape(summary.name)}</h1>${error?`<p class="load-error" role="alert">${escape(error)}</p><button class="primary" id="retry">Try again</button>`:'<p aria-busy="true">Fetching every configuration and live prices from Apple’s stores…</p>'}</div><div class="product-art"><span class="skeleton"></span></div></section>`;
 }
 const variant=variantById(product,state.variant)||variantById(product,product.defaultVariant);
 const rows=rankPrices(variant,stores,meta.rates.rates,pricingOptions()),best=rows[0],base=rows.find(r=>r.code===state.country);
 const fixed=Object.entries(product.fixed||{}).map(([k,v])=>`${k}: ${v}`).join(' · ');
 const savings=base&&best&&base.usd>best.usd?`<div class="savings-callout"><strong>Save ${money(base.usd-best.usd)}</strong><span>${((1-best.usd/base.usd)*100).toFixed(1)}% less than ${escape(countryName(state.country))}</span></div>`:'';
 const missing=countries.filter(c=>!variant.prices.some(p=>p.code===c.code));
 return `${back}<section class="detail-top"><div><span class="eyebrow">${escape(product.category)} / GLOBAL PRICE COMPARISON</span><h1>${escape(product.name)}</h1><p>${product.variants.length} configurations sold by Apple.${fixed?` Every model: ${escape(fixed)}.`:''}</p>${selector(product,variant)}<p class="selection-note">Your configuration stays selected when you change country or currency.</p></div>${art(product.name,variant.image||product.image,true)}</section><section class="comparison"><div class="comparison-summary"><span class="eyebrow">THE LOWEST PRICE</span><h2>${best?money(best.usd):'—'}</h2><p>${best?`${flag(best.code)} ${escape(countryName(best.code))}`:'No live prices yet'}</p>${savings}<hr><span class="eyebrow">YOUR CONFIGURATION</span><p class="configuration">${escape(variant.label)}</p><p class="part">Apple part ${escape(variant.part)}</p><span class="eyebrow">YOUR BENCHMARK</span><p>${flag(state.country)} ${escape(countryName(state.country))}</p><p class="selection-note">${base?'Differences compare the same configuration in your country.':'Apple doesn’t sell this configuration in your country. Other countries remain available.'}</p></div><div class="comparison-table"><div class="table-heading"><div><h2>Prices around the world</h2><span>${rows.length} countries · lowest first · checked ${ago(product.pricedAt)}</span></div><label class="refund-toggle"><input type="checkbox" id="refund" ${includeRefund?'checked':''}> Include tourist tax refund</label></div>${rows.map((r,i)=>priceRow(r,i,base,{stale:product.pricedAt})).join('')}${missing.length?`<p class="not-sold">Not sold by Apple online in: ${missing.map(c=>escape(c.name)).join(', ')}.</p>`:''}</div></section>`;
}
function dataNote(){
 const pricedAt=state.product?details.get(state.product)?.pricedAt:listing.products.map(p=>p.pricedAt).filter(Boolean).sort()[0];
 return `<aside class="data-note"><span>ⓘ</span><p>Prices are collected live from Apple’s online stores in ${countries.length} countries and refreshed every ${meta.ttl.prices/3600e3} hours${pricedAt?` (last checked ${ago(pricedAt)})`:''}. Shelf prices include local VAT/GST; US and Canadian prices add an estimated sales tax. Tourist refunds are estimates and depend on eligibility. Exchange rates from ExchangeRate-API, updated ${ago(meta.rates.updated)}. Always confirm with Apple before purchasing.</p></aside>`;
}
function render(){
 const product=state.product&&listing.products.find(p=>p.id===state.product);
 document.title=product?`${product.name} — The Mac Index`:'The Mac Index — Apple prices, everywhere.';
 if(state.product)loadProduct(state.product);
 document.querySelector('#app').innerHTML=`<header><div class="header-inner"><a class="brand" data-home href="${stateUrl({...state,product:null,variant:null})}"><span class="brand-icon">m<span>↗</span></span>The Mac Index<span class="brand-period">.</span></a><nav aria-label="Preferences"><label>COUNTRY & CURRENCY<select id="region" aria-label="Country and currency">${countries.map(c=>`<option value="${c.code}" ${c.code===state.country?'selected':''}>${flag(c.code)} ${escape(c.name)} · ${c.code===state.country?state.currency:c.currency}</option>`).join('')}</select></label></nav></div></header><main>${state.product?detailView():listingView()}${dataNote()}</main><footer><a class="brand" data-home href="${stateUrl({...state,product:null,variant:null})}">The Mac Index.</a><p>A better view of what you pay.</p><a href="https://www.apple.com/choose-country-region/" target="_blank" rel="noopener noreferrer">Apple Stores ↗</a><a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">Exchange rates ↗</a></footer><div class="sr-only" role="status" id="status"></div>`;
 bind();
}
function bind(){
 document.querySelector('#region').onchange=e=>{preferenceRevision++;go(changePreferences(state,regionPreferences(e.target.value)));document.getElementById('region').focus();document.getElementById('status').textContent=`Prices updated in ${state.currency} against ${countryName(state.country)}. Configuration preserved.`;};
 document.querySelectorAll('.product-art img').forEach(img=>img.onerror=()=>{img.hidden=true;img.nextElementSibling.hidden=false;});
 const plain=e=>!(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button);
 document.querySelectorAll('.spec-button[data-variant]').forEach(a=>a.onclick=e=>{
  if(!plain(e))return;e.preventDefault();
  if(a.getAttribute('aria-current')==='true')return;
  notice=a.dataset.changes?`${a.dataset.changes}: that’s the closest configuration Apple sells.`:'';
  go({...state,variant:a.dataset.variant});notice='';
  document.querySelector(`.spec-button[data-spec="${CSS.escape(a.dataset.spec)}"][data-value="${CSS.escape(a.dataset.value)}"]`)?.focus();
 });
 document.querySelectorAll('[data-product]').forEach(a=>a.onclick=e=>{if(!plain(e))return;e.preventDefault();go({...state,product:a.dataset.product,variant:a.dataset.variant||null});window.scrollTo(0,0);});
 document.querySelectorAll('[data-home]').forEach(a=>a.onclick=e=>{if(!plain(e))return;e.preventDefault();go({...state,product:null,variant:null});refreshListing();});
 document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;render();document.querySelector(`[data-filter="${filter}"]`).focus();});
 document.querySelector('#search')?.addEventListener('input',e=>{search=e.target.value;const position=e.target.selectionStart;render();const input=document.querySelector('#search');input.focus();try{input.setSelectionRange(position,position);}catch{}});
 const refund=document.querySelector('#refund');if(refund)refund.onchange=()=>{includeRefund=refund.checked;savePreferences();render();document.querySelector('#refund').focus();};
 const retry=document.querySelector('#retry');if(retry)retry.onclick=()=>{failures.delete(state.product);render();};
}

async function boot(){
 const app=document.querySelector('#app');
 app.innerHTML='<p class="boot" aria-busy="true">Loading live Apple prices…</p>';
 try{[meta,listing]=await Promise.all([api('/api/meta'),api('/api/products')]);}
 catch(error){app.innerHTML=`<div class="boot"><p role="alert">${escape(error.message)}</p><button class="primary" onclick="location.reload()">Try again</button></div>`;return;}
 stores=Object.fromEntries(meta.stores.map(s=>[s.code,s]));
 countries=[...meta.stores].sort((a,b)=>a.name.localeCompare(b.name));
 for(const s of meta.stores)countryCurrencies[s.code]??=s.currency;
 const initial=new URL(location.href);
 const hasPreference=initial.searchParams.has('country')||initial.searchParams.has('currency')||Boolean(stores[saved.country]);
 const fallback=fallbackCountry(Intl.DateTimeFormat().resolvedOptions().timeZone,navigator.languages);
 state=readState(location.href,hasPreference?saved:regionPreferences(fallback),knownProducts(),countries);
 window.addEventListener('popstate',()=>{preferenceRevision++;state=readState(location.href,{},knownProducts(),countries);render();});
 history.replaceState({},'',stateUrl(state));render();refreshListing();
 if(!hasPreference){const revision=preferenceRevision;detectCountry(fallback).then(country=>{if(preferenceRevision===revision&&country!==state.country)go(changePreferences(state,regionPreferences(country)),true);});}
}
boot();
