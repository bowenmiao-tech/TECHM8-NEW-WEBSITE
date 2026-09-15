import { createRequire } from 'node:module'; const sharp = createRequire(import.meta.url)('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
import fs from 'node:fs/promises';
const root='C:/Users/User/.codex/generated_images/01a0a54b-788b-7593-9933-529e7fa0a182/';
for(const [input,prefix,widths] of [
 ['exec-28158085-716c-46d3-985e-0ceaab262894.png','banner-home-iphone18',[480,720,1200,1536]],
 ['exec-ce9e6b6d-7736-4675-afa6-925ed8e7c4ba.png','banner-home-ps5-unified',[720,1024,1200,2048]]
]) {
 for(const w of widths){
  const name=`${prefix}-${w===2048?'wide':w}.webp`;
  await sharp(root+input).resize({width:w}).webp({quality:82,effort:6}).toFile('assets/'+name);
  await fs.copyFile('assets/'+name,'public/assets/'+name);
  console.log(name,(await fs.stat('assets/'+name)).size);
 }
}

