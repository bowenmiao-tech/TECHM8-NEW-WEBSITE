import { defineConfig } from "vite";
import { readdirSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";

const IGNORED_DIRECTORIES = new Set([
  ".git",
  "dist",
  "node_modules",
  "public",
  "api",
  "database",
  "supabase"
]);

function collectHtmlFiles(dir, baseDir = dir) {
  const entries = readdirSync(dir);
  const files = {};

  for (const entry of entries) {
    if (IGNORED_DIRECTORIES.has(entry)) continue;

    const fullPath = resolve(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      Object.assign(files, collectHtmlFiles(fullPath, baseDir));
      continue;
    }

    if (!entry.endsWith(".html")) continue;

    const key = relative(baseDir, fullPath).replace(/[\\\\/.]+/g, "-").replace(/-html$/, "");
    files[key] = fullPath;
  }

  return files;
}

export default defineConfig({
  build: {
    rollupOptions: {
      input: collectHtmlFiles(__dirname)
    }
  },
  server: {
    host: "0.0.0.0",
    port: 4173
  }
});
