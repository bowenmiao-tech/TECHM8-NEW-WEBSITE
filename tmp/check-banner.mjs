import { chromium } from 'file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage();
await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
await page.locator('[data-home-banner]').hover();
for(const width of [1440,768,390,320]){
 await page.setViewportSize({width,height:960});
 for(let i=0;i<3;i++){
  await page.locator('[data-banner-dot]').nth(i).click();
  await page.waitForTimeout(600);
  const state=await page.locator('[data-home-banner]').evaluate(el=>({frame:el.querySelector('.home-banner__slides').getBoundingClientRect().toJSON(), active:el.querySelector('.is-active img').currentSrc, loaded:el.querySelector('.is-active img').naturalWidth,overflow:document.documentElement.scrollWidth>innerWidth}));
  console.log(width,i,JSON.stringify(state));
  await page.locator('[data-home-banner]').screenshot({path:`tmp/banner-${width}-${i}.png`});
 }
}
await browser.close();
