// Live shelf prices from Apple's own price endpoint, which accepts region-neutral base part numbers.
import {appleJson,storeUrl} from './apple.js';
import {regionalParts,specSignature} from './catalog.js';

const BATCH=20;
// Some stores reject a whole batch (500) when one part isn't sold there, so split failing batches.
async function priceBatch(store,parts){
 if(!parts.length)return {};
 try{
  const data=await appleJson(storeUrl(store,'shop/mcm/product-price?parts='+parts.join(',')),{retries:parts.length>1?0:1});
  const out={};
  for(const [part,item] of Object.entries(data.items||{}))if(item.type!=='UNKNOWN'&&Number.isFinite(item.price?.value))out[part]={value:item.price.value,display:item.price.display?.actual||item.price.display?.smart||null,name:item.name||null};
  return out;
 }catch(error){
  if(error.status!==500)throw error; // throttling or network trouble: the store failed, it doesn't mean "not sold"
  if(parts.length===1)return {};
  const half=Math.ceil(parts.length/2);
  return {...await priceBatch(store,parts.slice(0,half)),...await priceBatch(store,parts.slice(half))};
 }
}
export async function storePrices(store,parts){
 const unique=[...new Set(parts)],chunks=[];
 for(let i=0;i<unique.length;i+=BATCH)chunks.push(unique.slice(i,i+BATCH));
 return Object.assign({},...await Promise.all(chunks.map(chunk=>priceBatch(store,chunk))));
}
// Prices every configuration of a family in one store.
// Regions often sell their own part numbers (iPhone, iPad). Parts already seen in other stores (`candidates`)
// are tried first through the cheap price endpoint; the store's own buy page is loaded only when that fails.
export async function familyPrices(family,store,{regional=()=>regionalParts(family,store.store),candidates=new Map()}={}){
 const result={};
 const attempt=async pairs=>{
  const prices=await storePrices(store.store,pairs.map(x=>x.part));
  for(const {v,part} of pairs)if(!result[v.id]&&prices[part])result[v.id]={...prices[part],part};
 };
 await attempt(family.variants.map(v=>({v,part:v.part})));
 const missing=()=>family.variants.filter(v=>!result[v.id]);
 if(missing().length&&!family.variants[0].name){ // bootstrap-shaped families (iPhone, iPad…) can be re-mapped
  const before=missing().length;
  await attempt(missing().flatMap(v=>[...(candidates.get(v.id)||[])].filter(part=>part!==v.part).map(part=>({v,part}))));
  // Most of the catalog still unknown here means a new regional model range, not a few unsold configurations.
  if(missing().length>before/2){
   const parts=new Map(Object.entries(await regional()));
   await attempt(missing().map(v=>({v,part:parts.get(specSignature(v.specs))})).filter(x=>x.part&&x.part!==x.v.part));
  }
 }
 for(const [id,price] of Object.entries(result)){if(!candidates.has(id))candidates.set(id,new Set());candidates.get(id).add(price.part);}
 return result;
}
