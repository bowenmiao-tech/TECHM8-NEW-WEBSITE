import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const decode = (text) => text.replaceAll("&amp;", "&").replaceAll("&quot;", '"')
  .replaceAll("&#39;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
const normalise = (text) => decode(text).replace(/\s+/g, " ").trim();
let checked = 0;
for (const category of ["phones", "tablets", "computers"]) {
  const directory = join(root, "repair-services", category);
  for (const name of await readdir(directory)) {
    if (!name.endsWith(".html")) continue;
    const file = join(directory, name);
    const html = await readFile(file, "utf8");
    if (!html.includes("data-generic-repair-prerendered")) continue;
    const body = html.split(/<body\b[^>]*>/i)[1].split("</body>")[0];
    const visible = normalise(body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]*>/g, " "));
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
    const page = graph.find((item) => item["@type"] === "WebPage");
    const service = graph.find((item) => item["@type"] === "Service");
    const faq = graph.find((item) => item["@type"] === "FAQPage");
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)[1];
    assert.equal(page.url, canonical, `${file}: page canonical mismatch`);
    assert.equal(service.url, canonical, `${file}: service canonical mismatch`);
    assert.equal(page.mainEntity["@id"], service["@id"], `${file}: service reference mismatch`);
    assert(visible.includes(normalise(service.description)), `${file}: service description is not visible`);
    for (const question of faq.mainEntity) {
      assert(visible.includes(normalise(question.name)), `${file}: FAQ question is not visible`);
      assert(visible.includes(normalise(question.acceptedAnswer.text)), `${file}: FAQ answer is not visible`);
    }
    assert(!/future (?:SEO|keyword)|search traffic|search intent targeting|consistent UX|scalable SEO|page now targets|later (?:add|split|target)|designed for visitors/i.test(visible),
      `${file}: customer copy contains template planning text`);
    checked++;
  }
}
assert(checked > 0, "No generic repair pages were validated");
console.log(`Validated visible service/FAQ content and canonical relationships on ${checked} repair pages.`);
