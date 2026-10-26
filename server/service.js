// Live data service: Apple is the source of truth. Results are cached in memory (and mirrored to .cache/
// so a restart can answer immediately), served stale-while-revalidate, and refreshed on a schedule.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {families,familyById,discoverFamily,regionalParts} from './catalog.js';
import {familyPrices} from './prices.js';
import {stores,storeByCode} from './stores.js';
import {storeUrl,throttleState,AppleThrottled} from './apple.js';

const HOUR=3600e3;
export const ttl={catalog:24*HOUR,prices:6*HOUR,rates:6*HOUR};
const cacheDir=new URL('../.cache/',import.meta.url);
const entries=new Map();

async function fromDisk(key){try{return JSON.parse(await readFile(new URL(key+'.json',cacheDir),'utf8'));}catch{return null;}}
async function toDisk(key,entry){try{await mkdir(cacheDir,{recursive:true});await writeFile(new URL(key+'.json',cacheDir),JSON.stringify(entry));}catch{}}
// Returns cached value when fresh; when stale returns it immediately and refreshes in the background.
export async function cached(key,maxAge,loader,{wait=false}={}){
 let entry=entries.get(key);
 if(!entry){entry=await fromDisk(key)||{};entries.set(key,entry);}
 const refresh=()=>entry.pending??=loader().then(value=>{Object.assign(entry,{value,at:Date.now(),error:null});toDisk(key,{value,at:entry.at});return value;},error=>{entry.error=error.message;throw error;}).finally(()=>{entry.pending=null;});
 const fresh=entry.at&&Date.now()-entry.at<maxAge;
 if(entry.value!==undefined&&(fresh||!wait)){if(!fresh)refresh().catch(()=>{});return entry.value;}
 return refresh();
}
export const peek=key=>entries.get(key)?.value;

export const rates=()=>cached('rates',ttl.rates,async()=>{
 const response=await fetch('https://open.er-api.com/v6/latest/USD',{signal:AbortSignal.timeout(15000)});
 const data=await response.json();if(data.result!=='success')throw new Error('Exchange rates unavailable');
 return {base:'USD',updated:new Date(data.time_last_update_unix*1000).toISOString(),source:'https://www.exchangerate-api.com',rates:data.rates};
});
export const catalog=(id,options)=>cached('catalog-'+id,ttl.catalog,()=>discoverFamily(familyById[id]),options);
// Regional part numbers (e.g. iPhone models per region) rarely change, so they share the catalog lifetime.
const regional=(family,store)=>()=>cached(`regional-${family.id}-${store.code}`,ttl.catalog,()=>regionalParts(family,store.store),{wait:true});
// A refresh where some stores failed (usually throttling) is retried after 30 minutes instead of 6 hours.
export const prices=(id,options)=>cached('prices-'+id,peek('prices-'+id)?.failed?.length?HOUR/2:ttl.prices,async()=>{
 const family=await catalog(id),previous=peek('prices-'+id);
 // Stores run in sequence (US first) so part numbers learned in one region help the next.
 const candidates=new Map(),results=[];
 for(const store of [storeByCode.us,...stores.filter(s=>s.code!=='us')]){
  try{results.push({store,value:await familyPrices(family,store,{regional:regional(family,store),candidates})});}
  catch(error){results.push({store,error});if(error instanceof AppleThrottled)break;}
 }
 for(const store of stores)if(!results.some(r=>r.store===store))results.push({store,error:new AppleThrottled(Date.now())});
 const byVariant={},failed=[];
 const add=(variantId,row)=>(byVariant[variantId]??=[]).push(row);
 for(const {store,value,error} of results){
  if(!error){for(const [variantId,price] of Object.entries(value))add(variantId,{code:store.code,local:price.value,display:price.display,part:price.part,at:new Date().toISOString()});continue;}
  // A store that failed this round keeps its last good prices (each row carries its own timestamp).
  failed.push(store.code);
  for(const [variantId,rows] of Object.entries(previous?.byVariant||{}))for(const row of rows)if(row.code===store.code)add(variantId,{at:previous.pricedAt,...row});
 }
 if(results.every(r=>r.error))throw results[0].error;
 return {pricedAt:new Date().toISOString(),failed,byVariant};
},options);

const storeLink=(family,variant,code)=>code==='us'&&variant.name?storeUrl('','shop/'+family.path+'/'+variant.id):storeUrl(storeByCode[code].store,'shop/'+family.path);
// The entry configuration (lowest US price, otherwise the first) is the family's default, like Apple's "From" price.
function defaultVariant(family,byVariant){
 const us=v=>byVariant[v.id]?.find(p=>p.code==='us')?.local??Infinity;
 return [...family.variants].filter(v=>byVariant[v.id]).sort((a,b)=>us(a)-us(b))[0]||family.variants[0];
}
export async function product(id){
 if(!familyById[id])return null;
 const family=await catalog(id),priced=await prices(id);
 const variants=family.variants.map(v=>({...v,prices:(priced.byVariant[v.id]||[]).map(p=>({...p,url:storeLink(family,v,p.code)}))}));
 return {...family,variants,defaultVariant:defaultVariant(family,priced.byVariant).id,pricedAt:priced.pricedAt,failedStores:priced.failed};
}
// Listing: whatever is ready now; families still loading are flagged so the client can poll.
export function summaries(){
 return families.map(f=>{
  const family=peek('catalog-'+f.id),priced=peek('prices-'+f.id);
  if(!family||!priced)return {id:f.id,name:f.name,category:f.category,ready:false};
  const v=family.variants.find(x=>x.id===defaultVariant(family,priced.byVariant).id);
  return {id:f.id,name:f.name,category:f.category,ready:true,image:v.image||family.image,variant:{id:v.id,label:v.label},configurations:family.variants.length,prices:priced.byVariant[v.id]||[],pricedAt:priced.pricedAt};
 });
}
export const meta=async()=>({stores:stores.map(({code,name,currency,tax})=>({code,name,currency,tax})),rates:await rates(),ttl,apple:throttleState()});

// Load every disk-cached entry once so the listing can answer immediately after a restart.
let hydrated=null;
export const hydrate=()=>hydrated??=Promise.all(families.flatMap(f=>['catalog-','prices-'].map(async key=>{key+=f.id;if(!entries.has(key))entries.set(key,await fromDisk(key)||{});})));
// Warm everything in the background, then keep it fresh. Families load one at a time to stay polite.
let warming=null;
export function warm(){
 if(process.env.LIVE_WARM==='0')return Promise.resolve();
 return warming??=(async()=>{
  await rates().catch(()=>{});
  await hydrate();
  for(const f of families){
   if(throttleState().blocked)break; // resume on the next scheduled pass
   try{await catalog(f.id,{wait:true});await prices(f.id,{wait:true});}catch(error){console.warn(`[data] ${f.id}: ${error.message}`);}
  }
 })().finally(()=>{warming=null;});
}
// LIVE_WARM=0 disables background collection (pages then load on demand only).
export function schedule(){if(process.env.LIVE_WARM==='0')return;warm();const timer=setInterval(warm,HOUR/2);timer.unref?.();}
