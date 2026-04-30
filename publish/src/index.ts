export interface Env {
  BUCKET: R2Bucket;
  PUBLISH_SECRET: string;
}

const ALLOWED_ORIGIN = "https://mortenspense.github.io";

async function safeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.byteLength !== bb.byteLength) return false;
  return crypto.subtle.timingSafeEqual(ab, bb);
}

interface AuditEntry {
  action: string;
  slug: string;
  prospectName: string;
  performedBy: string;
  timestamp: string;
  previousProspectName?: string;
}

function auditKey(action: string, slug: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return `logs/${ts}-${action}-${slug}.json`;
}

async function writeAuditLog(bucket: R2Bucket, entry: AuditEntry): Promise<void> {
  await bucket.put(auditKey(entry.action, entry.slug), JSON.stringify(entry), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: {
      action: entry.action,
      slug: entry.slug,
      prospectName: entry.prospectName,
      performedBy: entry.performedBy,
      timestamp: entry.timestamp,
      ...(entry.previousProspectName ? { previousProspectName: entry.previousProspectName } : {}),
    },
  });
}

function corsHeaders(origin: string | null) {
  const allowed = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const authHeader = request.headers.get("Authorization") ?? "";
    if (!await safeEqual(authHeader, `Bearer ${env.PUBLISH_SECRET}`)) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST" || new URL(request.url).pathname !== "/publish") {
      return new Response("Not found", { status: 404, headers: corsHeaders(origin) });
    }

    let body: { html: string; prospectSlug: string; publishedBy?: string; prospectName?: string; force?: boolean };
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400, headers: corsHeaders(origin) });
    }

    const { html, prospectSlug, publishedBy = "", prospectName = "", force = false } = body;

    if (html && html.length > 5_000_000) {
      return new Response("Payload too large", { status: 413, headers: corsHeaders(origin) });
    }

    if (!html || !prospectSlug) {
      return new Response("Missing html or prospectSlug", { status: 400, headers: corsHeaders(origin) });
    }

    if (!/^[a-z0-9-]+$/.test(prospectSlug)) {
      return new Response("prospectSlug must be lowercase alphanumeric with hyphens only", {
        status: 400,
        headers: corsHeaders(origin),
      });
    }

    const key = `slugs/${prospectSlug}.html`;

    const existing = await env.BUCKET.head(key);
    if (existing && !force) {
      return new Response(JSON.stringify({ conflict: true, existing: existing.customMetadata }), {
        status: 409,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    await env.BUCKET.put(key, html, {
      httpMetadata: { contentType: "text/html;charset=UTF-8" },
      customMetadata: {
        createdAt: existing?.customMetadata?.createdAt ?? now,
        publishedBy,
        prospectName,
      },
    });

    if (existing && force) {
      await writeAuditLog(env.BUCKET, {
        action: "overwrite",
        slug: prospectSlug,
        prospectName,
        performedBy: publishedBy,
        previousProspectName: existing.customMetadata?.prospectName ?? "",
        timestamp: now,
      });
    }

    const publicUrl = `https://spense-roi.results-calc.workers.dev/${prospectSlug}`;

    return new Response(JSON.stringify({ url: publicUrl, slug: prospectSlug }), {
      status: 200,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  },
};
