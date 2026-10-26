// JSON API shared by the Vite dev server and the production server.
import {product,summaries,meta,warm,hydrate} from './service.js';
import {interactive} from './apple.js';
const send=(res,status,body,maxAge=60)=>{res.statusCode=status;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control',status===200?`public, max-age=${maxAge}`:'no-store');res.end(JSON.stringify(body));};
export async function handleApi(req,res){
 const url=new URL(req.url,'http://localhost');
 if(!url.pathname.startsWith('/api/'))return false;
 try{
  if(url.pathname==='/api/meta')return send(res,200,await meta(),300),true;
  if(url.pathname==='/api/products'){await hydrate();warm();const list=summaries();return send(res,200,{ready:list.every(p=>p.ready),products:list},list.every(p=>p.ready)?60:0),true;}
  const match=url.pathname.match(/^\/api\/products\/([a-z0-9-]+)$/);
  if(match){const data=await interactive(()=>product(match[1]));return data?send(res,200,data):send(res,404,{error:'Unknown product'}),true;}
  send(res,404,{error:'Not found'});
 }catch(error){console.error('[api]',error);send(res,502,{error:'Apple data is temporarily unavailable. Please retry shortly.',detail:error.message});}
 return true;
}
