/**
 * spense-hubspot worker — receives HubSpot Workflow webhooks, generates
 * personalised lead-gen result pages, writes them to R2, and pushes the
 * URL back to the contact's `spense_calculator_url` property.
 *
 * Status: skeleton. Auth + payload parse work; calc/template/HubSpot calls
 * still being built up. See .Clairvoyance/notes — Lead-Gen Data Flow Design.
 */

export interface Env {
  BUCKET: R2Bucket;
  HUBSPOT_WEBHOOK_SECRET: string;
  HUBSPOT_API_TOKEN: string;
  SLACK_WEBHOOK_URL: string;
  WORKER_SECRET: string;
}

async function safeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.byteLength !== bb.byteLength) return false;
  return crypto.subtle.timingSafeEqual(ab, bb);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const authHeader = request.headers.get('Authorization') ?? '';
    if (!(await safeEqual(authHeader, `Bearer ${env.HUBSPOT_WEBHOOK_SECRET}`))) {
      return new Response('Unauthorized', { status: 401 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    // TODO: parse contact + form fields from `payload`
    // TODO: validate market via resolveMarket()
    // TODO: compute() savings
    // TODO: render result-page HTML template
    // TODO: write to R2 (with deterministic slug)
    // TODO: PATCH HubSpot contact with spense_calculator_url
    // TODO: fire Slack notification

    return new Response('Not implemented yet', { status: 501 });
  },
};
