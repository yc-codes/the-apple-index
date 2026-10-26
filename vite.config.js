import {defineConfig} from 'vite';
// In development the live Apple data API runs inside the Vite server.
const liveApi={name:'live-apple-api',async configureServer(server){
 const {handleApi}=await server.ssrLoadModule('/server/api.js');const {schedule}=await server.ssrLoadModule('/server/service.js');
 server.middlewares.use((req,res,next)=>handleApi(req,res).then(handled=>handled||next(),next));schedule();
}};
export default defineConfig({plugins:[liveApi]});
