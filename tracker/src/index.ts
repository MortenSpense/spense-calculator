export interface Env {
  BUCKET: R2Bucket;
  SLACK_WEBHOOK_URL: string;
}

interface Visit {
  timestamp: string;
  country: string | null;
}

function toFlag(code: string | null): string {
  if (!code || code.length !== 2) return "";
  const c = code.toUpperCase();
  return String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65) +
         String.fromCodePoint(0x1F1E6 + c.charCodeAt(1) - 65);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    let slug = url.pathname.replace(/^\/slugs\//, "").replace(/\.html$/, "").replace(/^\//, "");

    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return new Response("Not found", { status: 404 });
    }

    const key = `slugs/${slug}.html`;
    const object = await env.BUCKET.get(key);

    if (!object) {
      return new Response("Not found", { status: 404 });
    }

    const meta = object.customMetadata ?? {};
    const visitCount = parseInt(meta.visitCount ?? "0", 10) + 1;
    const lastVisitedAt = new Date().toISOString();
    const prospectName = meta.prospectName ?? slug;
    const country = ((request as any).cf?.country as string | null) ?? null;

    const html = await object.text();

    await env.BUCKET.put(key, html, {
      httpMetadata: object.httpMetadata,
      customMetadata: {
        ...meta,
        visitCount: String(visitCount),
        lastVisitedAt,
      },
    });

    // Append to visit log (fire-and-forget)
    ctx.waitUntil((async () => {
      const visitsKey = `visits/${slug}.json`;
      const existing = await env.BUCKET.get(visitsKey);
      let visits: Visit[] = [];
      if (existing) {
        try { visits = await existing.json<Visit[]>(); } catch { visits = []; }
      }
      visits.push({ timestamp: lastVisitedAt, country });
      if (visits.length > 100) visits = visits.slice(-100);
      await env.BUCKET.put(visitsKey, JSON.stringify(visits), {
        httpMetadata: { contentType: "application/json" },
      });
    })());

    // Slack only on first two visits
    if (env.SLACK_WEBHOOK_URL && visitCount <= 2) {
      const flag = toFlag(country);
      const location = country ? ` ${flag}` : "";
      const message = {
        text: `👀 *${prospectName}* just opened their calculator${location} — visit #${visitCount}`,
      };
      ctx.waitUntil(fetch(env.SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      }).catch(() => {}));
    }

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "Cache-Control": "no-store",
      },
    });
  },
};
