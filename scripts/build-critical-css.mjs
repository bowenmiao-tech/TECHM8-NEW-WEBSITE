// Inlines the CSS a critical page actually uses, and downgrades the full
// stylesheet to a non-blocking load.
//
// styles.css covers every page on the site, so the homepage was blocking first
// paint on ~30 KB of gzipped CSS to use about a sixth of it (Lighthouse:
// "Render-blocking requests, 750 ms" and "Reduce unused CSS, 28 KiB").
//
// The extraction is static - it reads the page's own markup plus a small list of
// JS-rendered class names in critical-css-tokens.json - so it re-runs on every
// prerender and can never fall behind styles.css.
//
// The full stylesheet still loads on every page, just asynchronously. If this
// extraction ever misses a rule the page self-corrects as soon as that arrives,
// so the worst case is a brief flash, never a broken layout.

import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import postcss from "postcss";
import { transform } from "esbuild";

const ROOT = resolve(import.meta.dirname, "..");
const TOKENS_FILE = join(ROOT, "scripts", "critical-css-tokens.json");
const SOURCE_CSS = join(ROOT, "styles.css");

const START = "<!-- CRITICAL-CSS:START -->";
const END = "<!-- CRITICAL-CSS:END -->";

// Pages worth the extra inline bytes: the entries most traffic lands on first.
const CRITICAL_PAGES = ["index.html"];

// Selectors with no class or id (body, a:hover, ::selection, *) apply broadly, so
// they are always kept rather than guessed at.
function selectorTokens(selector) {
  return {
    classes: [...selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]),
    ids: [...selector.matchAll(/#(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]),
  };
}

// State classes are toggled by script.js after load (menu opened, item selected),
// so they are never in the served markup. Ignoring them keeps the interactive
// variants of components that are otherwise present - without this, opening the
// nav menu before the async stylesheet lands shows an unstyled dropdown.
const STATE_CLASS = /^(?:is|has)-/;

function keepSelector(selector, tokens) {
  const { classes, ids } = selectorTokens(selector);
  if (!classes.length && !ids.length) return true;
  return (
    classes.every(
      (name) => STATE_CLASS.test(name) || tokens.classes.has(name),
    ) && ids.every((name) => tokens.ids.has(name))
  );
}

function collectTokens(html, extraClasses) {
  const classes = new Set(extraClasses);
  const ids = new Set();

  for (const match of html.matchAll(/\bclass="([^"]*)"/g)) {
    for (const name of match[1].split(/\s+/)) if (name) classes.add(name);
  }
  for (const match of html.matchAll(/\bid="([^"]*)"/g)) {
    if (match[1]) ids.add(match[1].trim());
  }

  return { classes, ids };
}

function filterRoot(container, tokens) {
  const kept = [];

  for (const node of container.nodes || []) {
    if (node.type === "rule") {
      const selectors = node.selectors.filter((selector) =>
        keepSelector(selector, tokens),
      );
      if (!selectors.length) continue;
      const clone = node.clone();
      clone.selectors = selectors;
      kept.push(clone);
      continue;
    }

    if (node.type === "atrule") {
      // Font faces, custom property fallbacks and keyframes are small and their
      // usage cannot be resolved from selectors alone.
      if (/^(font-face|keyframes|property|charset|import)$/i.test(node.name)) {
        kept.push(node.clone());
        continue;
      }
      if (/^(media|supports|layer|container)$/i.test(node.name)) {
        const clone = node.clone();
        clone.removeAll();
        for (const child of filterRoot(node, tokens)) clone.append(child);
        if (clone.nodes.length) kept.push(clone);
        continue;
      }
      kept.push(node.clone());
      continue;
    }

    if (node.type === "decl") kept.push(node.clone());
  }

  return kept;
}

export async function buildCriticalCss({ quiet = false } = {}) {
  const tokensConfig = JSON.parse(await readFile(TOKENS_FILE, "utf8"));
  const source = await readFile(SOURCE_CSS, "utf8");
  const parsed = postcss.parse(source);
  const results = [];

  for (const page of CRITICAL_PAGES) {
    const pagePath = join(ROOT, page);
    let html = await readFile(pagePath, "utf8");

    const tokens = collectTokens(html, tokensConfig[page] || []);
    const critical = postcss.root();
    for (const node of filterRoot(parsed, tokens)) critical.append(node);

    const { code } = await transform(critical.toString(), {
      loader: "css",
      minify: true,
      legalComments: "none",
      target: "chrome100",
    });

    const block = `${START}\n    <style>${code}</style>\n    <link rel="stylesheet" href="styles.min.css" media="print" onload="this.media='all';this.onload=null">\n    <noscript><link rel="stylesheet" href="styles.min.css"></noscript>\n    ${END}`;

    const start = html.indexOf(START);
    const end = html.indexOf(END);

    if (start !== -1 && end !== -1) {
      html = html.slice(0, start) + block + html.slice(end + END.length);
    } else {
      const link = /[ \t]*<link rel="stylesheet" href="styles\.min\.css"[^>]*>/;
      if (!link.test(html)) {
        console.warn(`${page}: no stylesheet link found, critical CSS skipped`);
        continue;
      }
      html = html.replace(link, `    ${block}`);
    }

    await writeFile(pagePath, html, "utf8");
    results.push({ page, bytes: code.length, sourceBytes: source.length });
  }

  if (!quiet) {
    for (const result of results) {
      const share = (result.bytes * 100) / result.sourceBytes;
      console.log(
        `critical CSS for ${result.page}: ${Math.round(result.bytes / 1024)}KB inlined ` +
          `(${share.toFixed(0)}% of styles.css), full stylesheet now async`,
      );
    }
  }

  return results;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  buildCriticalCss().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
