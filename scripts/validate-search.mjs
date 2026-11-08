import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const origin = "https://www.techm8australia.com";
const read = (file) => readFile(join(root, file), "utf8");
const decode = (text) => text.replaceAll("&amp;", "&").replaceAll("&quot;", '"')
  .replaceAll("&#39;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)]
    .map(([, key, , value]) => [key.toLowerCase(), decode(value)]));
}
const utilityPages = [
  "account.html", "account-dashboard.html", "account-details.html", "cart.html",
  "checkout.html", "checkout-success.html", "completed-orders.html", "delivery-address.html",
  "forgot-password.html", "my-orders.html", "my-repairs.html", "pending-orders.html",
  "register.html", "repair-bookings.html", "reset-password.html",
];
const seen = new Set();
let checked = 0;
for (const sitemap of ["sitemap-pages.xml", "sitemap-categories.xml", "sitemap-products.xml"]) {
  const xml = await read(sitemap);
  assert.equal(xml, await read(`public/${sitemap}`), `${sitemap}: public copy differs`);
  for (const [, encoded] of xml.matchAll(/<loc>(.*?)<\/loc>/g)) {
    const location = decode(encoded);
    const url = new URL(location);
    assert.equal(url.origin, origin, `${location}: unexpected origin`);
    assert(!seen.has(location), `${location}: duplicate sitemap URL`);
    seen.add(location);
    const relative = decodeURIComponent(url.pathname).replace(/^\//, "");
    assert(!utilityPages.includes(relative), `${location}: utility page is in sitemap`);
    let file = relative || "index.html";
    if (file.endsWith("/")) file += "index.html";
    else if (!(await stat(join(root, file)).catch(() => null))) file += ".html";
    const html = await read(file);
    const head = html.split(/<\/head>/i)[0];
    const tags = [...head.matchAll(/<(?:meta|link)\b[^>]*>/gi)].map(([tag]) => attributes(tag));
    const canonicals = tags.filter((tag) => tag.rel === "canonical");
    assert.deepEqual(canonicals.map((tag) => tag.href), [location], `${file}: canonical mismatch`);
    const titles = [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
    assert(titles.length === 1 && titles[0][1].trim(), `${file}: missing or duplicate title`);
    const descriptions = tags.filter((tag) => tag.name === "description");
    assert(descriptions.length === 1 && descriptions[0].content?.trim(), `${file}: missing description`);
    assert(!tags.some((tag) => tag.name === "robots" && /noindex|none/i.test(tag.content)),
      `${file}: sitemap page is noindex`);
    assert.equal([...html.matchAll(/<h1\b/gi)].length, 1, `${file}: expected one static H1`);
    for (const [, json] of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      JSON.parse(json);
    }
    checked++;
  }
}
assert(checked > 0, "No sitemap pages checked");
for (const file of utilityPages) {
  const html = await read(file);
  assert(/<meta\b[^>]*name="robots"[^>]*content="noindex, follow"/i.test(html),
    `${file}: utility page must be noindex, follow`);
}
for (const file of ["robots.txt", "llms.txt", "sitemap.xml"]) {
  assert.equal(await read(file), await read(`public/${file}`), `${file}: public copy differs`);
}
const llms = await read("llms.txt");
assert(!llms.includes("repair technician and support roles"), "llms.txt lists unsupported roles");
for (const [, href] of llms.matchAll(/\]\((https:\/\/www\.techm8australia\.com\/[^)]+)\)/g)) {
  let path = new URL(href).pathname.slice(1);
  if (path.endsWith("/")) path += "index.html";
  const exists = await stat(join(root, path)).catch(() => stat(join(root, `${path}.html`)).catch(() => null));
  assert(exists?.isFile(), `llms.txt: missing local destination ${href}`);
}
console.log(`Validated ${checked} sitemap pages, ${utilityPages.length} utility pages and search discovery files.`);
