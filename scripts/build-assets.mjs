// Minifies the two shared front-end assets that GitHub Pages serves directly.
//
// The site is deployed from the repository root, not from Vite's dist/, so the
// browser was downloading and parsing the unminified sources: 228 KB of CSS and
// 388 KB of JavaScript. Lighthouse flagged both under "Minify CSS/JavaScript".
//
// styles.css and script.js stay the editable sources (as documented in README).
// This writes styles.min.css and script.min.js next to them, and every page
// references the minified copies. `npm run prerender` calls this, so the minified
// output cannot drift behind the source for longer than one catalog refresh.

import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { transform } from "esbuild";

const ROOT = resolve(import.meta.dirname, "..");

const TARGETS = [
  { source: "styles.css", output: "styles.min.css", loader: "css" },
  { source: "script.js", output: "script.min.js", loader: "js" },
];

export async function buildAssets({ quiet = false } = {}) {
  const results = [];

  for (const target of TARGETS) {
    const sourcePath = join(ROOT, target.source);
    const code = await readFile(sourcePath, "utf8");

    const minified = await transform(code, {
      loader: target.loader,
      minify: true,
      legalComments: "none",
      // script.js ships as <script type="module">, so modern syntax is safe to keep.
      target: target.loader === "js" ? "es2020" : "chrome100",
    });

    if (minified.warnings.length) {
      for (const warning of minified.warnings) {
        console.warn(`${target.source}: ${warning.text}`);
      }
    }

    const outputPath = join(ROOT, target.output);
    await writeFile(outputPath, minified.code, "utf8");
    await writeFile(join(ROOT, "public", target.output), minified.code, "utf8");

    results.push({
      source: target.source,
      output: target.output,
      before: Buffer.byteLength(code),
      after: Buffer.byteLength(minified.code),
    });
  }

  if (!quiet) {
    for (const result of results) {
      const saved = 100 - (result.after * 100) / result.before;
      console.log(
        `${result.source} -> ${result.output}: ` +
          `${Math.round(result.before / 1024)}KB -> ${Math.round(result.after / 1024)}KB ` +
          `(${saved.toFixed(0)}% smaller)`,
      );
    }
  }

  return results;
}

// pathToFileURL keeps this working on Windows, where argv[1] is a drive path that
// never matches a naively built file:// string.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  buildAssets().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
