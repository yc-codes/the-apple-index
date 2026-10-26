// Production server: live API + built client (run `npm run build` first).
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname} from 'node:path';
import {handleApi} from './api.js';
import {schedule} from './service.js';
const dist=new URL('../dist/',import.meta.url);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.json':'application/json'};
const port=Number(process.env.PORT)||8787;
createServer(async(req,res)=>{
 if(await handleApi(req,res))return;
 const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.includes('..')||path==='/'||!extname(path)?'index.html':path.slice(1);
 try{const body=await readFile(new URL(file,dist));res.setHeader('content-type',types[extname(file)]||'application/octet-stream');if(file.startsWith('assets/'))res.setHeader('cache-control','public, max-age=31536000, immutable');res.end(body);}
 catch{res.statusCode=404;res.end('Not found');}
}).listen(port,()=>{console.log(`The Mac Index on http://localhost:${port}`);schedule();});
