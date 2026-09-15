import fs from 'node:fs/promises';
const file='index.html';
let html=await fs.readFile(file,'utf8');
html=html.replace(/href="assets\/banner-home-monitors-720.webp"\s+imagesrcset="[^"]+"\s+imagesizes="[^"]+"/, 'href="assets/banner-home-iphone18-720.webp"\n      imagesrcset="assets/banner-home-iphone18-480.webp 480w, assets/banner-home-iphone18-720.webp 720w, assets/banner-home-iphone18-1200.webp 1200w, assets/banner-home-iphone18-1536.webp 1536w"\n      imagesizes="(max-width: 1212px) 60vw, 708px"');
const start=html.indexOf('            <article',html.indexOf('data-home-banner'));
html=html.slice(0,start)+`            <article class="home-banner__slide home-banner__slide--flat is-active" data-banner-slide data-banner-initial>
              <a class="home-banner__flat-link home-banner__campaign" href="/shop.html" aria-label="iPhone 18 accessories is here — shop accessories">
                <img class="home-banner__campaign-art" src="assets/banner-home-iphone18-720.webp"
                  srcset="assets/banner-home-iphone18-480.webp 480w, assets/banner-home-iphone18-720.webp 720w, assets/banner-home-iphone18-1200.webp 1200w, assets/banner-home-iphone18-1536.webp 1536w"
                  sizes="(max-width: 1212px) 60vw, 708px" alt="Teal and clear phone cases, screen protection and charging accessories"
                  width="1536" height="1024" fetchpriority="high" decoding="async" />
                <div class="home-banner__campaign-copy">
                  <span class="home-banner__campaign-kicker">NEW AT TECHM8</span>
                  <h1>iPhone 18<span>accessories is here</span></h1>
                  <p>Protect it. Charge it. Make it yours.</p>
                  <span class="home-banner__campaign-cta">Shop accessories <span aria-hidden="true">&#8594;</span></span>
                </div>
              </a>
            </article>
`+html.slice(start).replace('home-banner__slide--flat is-active','home-banner__slide--flat').replace('              data-banner-initial\n','');
html=html.replace('src="assets/banner-home-monitors-wide.webp"','data-src="assets/banner-home-monitors-wide.webp"').replace('srcset="assets/banner-home-monitors-720','data-srcset="assets/banner-home-monitors-720').replace('fetchpriority="high"\n                  decoding="async"','loading="lazy"\n                  fetchpriority="low"\n                  decoding="async"');
html=html.replaceAll('banner-home-ps5-controllers-', 'banner-home-ps5-unified-').replace('1672w','2048w').replace('width="1672"\n                  height="941"','width="2048"\n                  height="768"');
html=html.replaceAll('(max-width: 720px) calc(100vw - 2rem), 1180px','(max-width: 1212px) calc(100vw - 2rem), 1180px');
html=html.replace('data-banner-total>2','data-banner-total>3').replace('aria-label="Banner 1"','aria-label="iPhone 18 accessories" aria-current="true"').replace('aria-label="Banner 2"','aria-label="Monitors"');
html=html.replace('            </div>\n            <button\n              type="button"\n              class="home-banner__arrow"\n              data-banner-next','              <button type="button" data-banner-dot aria-label="PS5 controllers"></button>\n            </div>\n            <button\n              type="button"\n              class="home-banner__arrow"\n              data-banner-next');
await fs.writeFile(file,html);
