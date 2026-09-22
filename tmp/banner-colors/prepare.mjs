import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const sharp=createRequire(import.meta.url)('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
for(const width of [480,720,1200,1536]) {
 const name=`banner-home-iphone18-pro-v3-${width}.webp`;
 await sharp(process.argv[2]).resize({width}).webp({quality:84,effort:6}).toFile('assets/'+name);
 await fs.copyFile('assets/'+name,'public/assets/'+name);
}
let html=await fs.readFile('index.html','utf8');
html=html.replaceAll('banner-home-iphone18-pro-v2-','banner-home-iphone18-pro-v3-').replace('alt="iPhone 18 Pro and Pro Max in clear magnetic cases with a USB-C cable"','alt="Burgundy iPhone 18 Pro and Glacier blue iPhone 18 Pro Max in clear magnetic cases with a USB-C cable"');
await fs.writeFile('index.html',html);
