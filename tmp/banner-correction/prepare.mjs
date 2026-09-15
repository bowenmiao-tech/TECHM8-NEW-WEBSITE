import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const sharp=createRequire(import.meta.url)('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const input='C:/Users/User/.codex/generated_images/01a0a54b-788b-7593-9933-529e7fa0a182/exec-e6c74e6d-4676-48b5-af93-8f04810827e8.png';
for(const width of [480,720,1200,1536]) {
 const name=`banner-home-iphone18-pro-v2-${width}.webp`;
 await sharp(input).resize({width}).webp({quality:84,effort:6}).toFile('assets/'+name);
 await fs.copyFile('assets/'+name,'public/assets/'+name);
}
let html=await fs.readFile('index.html','utf8');
html=html.replaceAll('banner-home-iphone18-','banner-home-iphone18-pro-v2-');
await fs.writeFile('index.html',html);
