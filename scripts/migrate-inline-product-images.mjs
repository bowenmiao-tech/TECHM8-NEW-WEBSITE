import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const shouldApply = process.argv.includes("--apply");
const verboseOutput = process.argv.includes("--verbose");
const productIds = process.argv
  .slice(2)
  .map((value) => Number(value))
  .filter((value) => Number.isInteger(value) && value > 0);

if (!productIds.length) {
  throw new Error("Pass one or more numeric product ids to migrate.");
}

const adminSource = await readFile(join(projectRoot, "admin", "admin.js"), "utf8");
const supabaseUrl = adminSource.match(/supabaseUrl:\s*["']([^"']+)["']/)?.[1];
const supabaseAnonKey = adminSource.match(/supabaseAnonKey:\s*["']([^"']+)["']/)?.[1];
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase public configuration could not be read from admin/admin.js.");
}

const products = [];
for (const productId of productIds) {
  const productsUrl = new URL("/rest/v1/products", supabaseUrl);
  productsUrl.searchParams.set("select", "id,slug,name,detail_html");
  productsUrl.searchParams.set("id", `eq.${productId}`);
  productsUrl.searchParams.set("limit", "1");

  const response = await fetch(productsUrl, {
    headers: {
      Accept: "application/json",
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Product ${productId} could not be loaded (${response.status}).`);
  }
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(`Product ${productId} could not be loaded.`);
  }
  products.push(rows[0]);
}

const outputDirectory = await mkdtemp(join(tmpdir(), "techm8-inline-product-images-"));
const uploadDirectory = join(outputDirectory, "upload");
await mkdir(uploadDirectory, { recursive: true });

const inlineImagePattern = /(<img\b[^>]*\bsrc\s*=\s*)(["'])(data:image\/[a-z0-9.+-]+;base64,[^"']+)\2/gi;
const publicBucketBase = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/product-images/`;
const manifest = [];
const databaseUpdates = [];
const updateStatements = [];
const restoreStatements = [];

function sqlLiteral(value, tag) {
  const delimiter = `$${tag}$`;
  if (String(value).includes(delimiter)) {
    throw new Error(`SQL delimiter collision for ${tag}.`);
  }
  return `${delimiter}${value}${delimiter}`;
}

for (const product of products) {
  const originalHtml = String(product.detail_html || "");
  const matches = Array.from(originalHtml.matchAll(inlineImagePattern));
  if (!matches.length) {
    manifest.push({
      product_id: product.id,
      slug: product.slug,
      image_count: 0,
      original_html_chars: originalHtml.length,
      updated_html_chars: originalHtml.length,
      files: [],
    });
    continue;
  }

  let updatedHtml = "";
  let cursor = 0;
  const files = [];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const source = match[3];
    const base64 = source.slice(source.indexOf(",") + 1).replace(/\s/g, "");
    const inputBytes = Buffer.from(base64, "base64");
    const digest = createHash("sha256").update(inputBytes).digest("hex").slice(0, 12);
    const fileName = `inline-${String(index + 1).padStart(2, "0")}-${digest}.webp`;
    const storagePath = `product-details/${product.slug}/migrated-inline/${fileName}`;
    const localPath = join(uploadDirectory, storagePath.replaceAll("/", "\\"));
    await mkdir(dirname(localPath), { recursive: true });

    const outputInfo = await sharp(inputBytes)
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toFile(localPath);

    const publicUrl = `${publicBucketBase}${storagePath}`;
    const replacement = `${match[1]}${match[2]}${publicUrl}${match[2]}`;
    updatedHtml += originalHtml.slice(cursor, match.index) + replacement;
    cursor = match.index + match[0].length;
    files.push({
      local_path: localPath,
      storage_path: storagePath,
      public_url: publicUrl,
      source_bytes: inputBytes.byteLength,
      webp_bytes: outputInfo.size,
      width: outputInfo.width,
      height: outputInfo.height,
    });
  }
  updatedHtml += originalHtml.slice(cursor);

  const updateTag = `techm8_product_${product.id}`;
  const restoreTag = `techm8_restore_product_${product.id}`;
  updateStatements.push(
    `update public.products set detail_html = ${sqlLiteral(updatedHtml, updateTag)}, updated_at = now() where id = ${Number(product.id)};`,
  );
  restoreStatements.push(
    `update public.products set detail_html = ${sqlLiteral(originalHtml, restoreTag)}, updated_at = now() where id = ${Number(product.id)};`,
  );
  databaseUpdates.push({ product_id: product.id, detail_html: updatedHtml });
  manifest.push({
    product_id: product.id,
    slug: product.slug,
    name: product.name,
    image_count: files.length,
    original_html_chars: originalHtml.length,
    updated_html_chars: updatedHtml.length,
    files,
  });
}

const updateSqlPath = join(outputDirectory, "update-products.sql");
const restoreSqlPath = join(outputDirectory, "restore-products.sql");
const manifestPath = join(outputDirectory, "manifest.json");
await writeFile(updateSqlPath, `${updateStatements.join("\n")}\n`, "utf8");
await writeFile(restoreSqlPath, `${restoreStatements.join("\n")}\n`, "utf8");
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

if (shouldApply) {
  const keyOutput = execFileSync(
    "supabase.exe",
    ["projects", "api-keys", "--project-ref", "fwlronvmgqzkleofriis", "-o", "json"],
    { cwd: projectRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
  const projectKeys = JSON.parse(keyOutput);
  const serviceRoleKey = projectKeys.find((key) => key.id === "service_role")?.api_key;
  if (!serviceRoleKey) {
    throw new Error("The linked project's service role key could not be obtained.");
  }

  for (const product of manifest) {
    for (const file of product.files) {
      const fileBytes = await readFile(file.local_path);
      const uploadResponse = await fetch(
        `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/product-images/${file.storage_path}`,
        {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Cache-Control": "max-age=31536000, immutable",
            "Content-Type": "image/webp",
            "x-upsert": "true",
          },
          body: fileBytes,
        },
      );
      if (!uploadResponse.ok) {
        throw new Error(`Storage upload failed for ${file.storage_path} (${uploadResponse.status}).`);
      }
    }
  }

  for (const update of databaseUpdates) {
    const updateResponse = await fetch(
      `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/products?id=eq.${update.product_id}`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ detail_html: update.detail_html }),
      },
    );
    if (!updateResponse.ok) {
      throw new Error(`Database update failed for product ${update.product_id} (${updateResponse.status}).`);
    }
    const updatedRows = await updateResponse.json();
    if (!Array.isArray(updatedRows) || updatedRows.length !== 1) {
      throw new Error(`Database update did not return product ${update.product_id}.`);
    }
  }
}

const summary = {
  applied: shouldApply,
  outputDirectory,
  uploadDirectory,
  updateSqlPath,
  restoreSqlPath,
  manifestPath,
  product_count: manifest.length,
  image_count: manifest.reduce((total, product) => total + product.image_count, 0),
  original_html_chars: manifest.reduce((total, product) => total + product.original_html_chars, 0),
  updated_html_chars: manifest.reduce((total, product) => total + product.updated_html_chars, 0),
  source_image_bytes: manifest.reduce(
    (total, product) => total + product.files.reduce((subtotal, file) => subtotal + file.source_bytes, 0),
    0,
  ),
  webp_image_bytes: manifest.reduce(
    (total, product) => total + product.files.reduce((subtotal, file) => subtotal + file.webp_bytes, 0),
    0,
  ),
  products: verboseOutput
    ? manifest
    : manifest.map((product) => ({
        product_id: product.product_id,
        slug: product.slug,
        image_count: product.image_count,
        original_html_chars: product.original_html_chars,
        updated_html_chars: product.updated_html_chars,
      })),
};
console.log(JSON.stringify(summary, null, 2));
