const allowedTables = new Set(["products", "product_images", "categories"])
const allowedOperations = new Set(["INSERT", "UPDATE", "DELETE"])

type CatalogChangePayload = {
  schema?: unknown
  table?: unknown
  type?: unknown
  requested_at?: unknown
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  })
}

function secureEqual(left: string, right: string) {
  const encoder = new TextEncoder()
  const leftBytes = encoder.encode(left)
  const rightBytes = encoder.encode(right)
  const length = Math.max(leftBytes.length, rightBytes.length)
  let difference = leftBytes.length ^ rightBytes.length

  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0)
  }

  return difference === 0
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405)
  }

  const webhookSecret = Deno.env.get("CATALOG_WEBHOOK_SECRET") ?? ""
  const suppliedSecret = request.headers.get("x-webhook-secret") ?? ""
  if (!webhookSecret || !secureEqual(suppliedSecret, webhookSecret)) {
    return jsonResponse({ ok: false, error: "Unauthorized." }, 401)
  }

  let payload: CatalogChangePayload
  try {
    payload = await request.json()
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON payload." }, 400)
  }

  const schema = String(payload.schema ?? "")
  const table = String(payload.table ?? "")
  const operation = String(payload.type ?? "").toUpperCase()
  if (schema !== "public" || !allowedTables.has(table) || !allowedOperations.has(operation)) {
    return jsonResponse({ ok: false, error: "Unsupported catalog event." }, 400)
  }

  const githubRepository = Deno.env.get("GITHUB_REPOSITORY") ?? ""
  const githubToken = Deno.env.get("GITHUB_CATALOG_DISPATCH_TOKEN") ?? ""
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(githubRepository) || !githubToken) {
    console.error("GitHub catalog dispatch configuration is incomplete.")
    return jsonResponse({ ok: false, error: "Dispatch is not configured." }, 503)
  }

  const githubResponse = await fetch(
    `https://api.github.com/repos/${githubRepository}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "Content-Type": "application/json",
        "User-Agent": "TECHM8-Supabase-Catalog-Refresh",
        "X-GitHub-Api-Version": "2026-03-10",
      },
      body: JSON.stringify({
        event_type: "catalog-updated",
        client_payload: {
          source: "supabase",
          schema,
          table,
          operation,
          requested_at: String(payload.requested_at ?? new Date().toISOString()),
        },
      }),
    },
  )

  if (!githubResponse.ok) {
    const responseBody = await githubResponse.text()
    console.error(
      `GitHub repository dispatch failed (${githubResponse.status}): ${responseBody.slice(0, 500)}`,
    )
    return jsonResponse({ ok: false, error: "GitHub dispatch failed." }, 502)
  }

  return jsonResponse({ ok: true, dispatched: true }, 202)
})
