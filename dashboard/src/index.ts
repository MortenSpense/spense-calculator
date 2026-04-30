export interface Env {
  BUCKET: R2Bucket;
  DASHBOARD_PASSWORD: string;
  KV: KVNamespace;
}

interface AuditEntry {
  action: string;
  slug: string;
  prospectName: string;
  performedBy: string;
  timestamp: string;
  previousProspectName?: string;
}

interface Prospect {
  slug: string;
  prospectName: string;
  publishedBy: string;
  createdAt: string;
  visitCount: number;
  lastVisitedAt: string;
}

interface Rep {
  id: string;
  name: string;
}

interface Visit {
  timestamp: string;
  country: string | null;
}

const COUNTRY_NAMES: Record<string, string> = {
  NO:"Norway",DK:"Denmark",SE:"Sweden",FI:"Finland",DE:"Germany",AT:"Austria",
  CH:"Switzerland",NL:"Netherlands",BE:"Belgium",FR:"France",IT:"Italy",
  ES:"Spain",PT:"Portugal",GB:"United Kingdom",IE:"Ireland",PL:"Poland",
  CZ:"Czech Republic",HU:"Hungary",RO:"Romania",HR:"Croatia",SK:"Slovakia",
  SI:"Slovenia",EE:"Estonia",LV:"Latvia",LT:"Lithuania",LU:"Luxembourg",
  GR:"Greece",BG:"Bulgaria",MT:"Malta",CY:"Cyprus",IS:"Iceland",
  US:"United States",CA:"Canada",AU:"Australia",NZ:"New Zealand",
  JP:"Japan",CN:"China",IN:"India",BR:"Brazil",MX:"Mexico",ZA:"South Africa",
};

function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "🌍";
  const c = code.toUpperCase();
  return String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65) +
         String.fromCodePoint(0x1F1E6 + c.charCodeAt(1) - 65);
}

function countryName(code: string | null): string {
  if (!code) return "Unknown";
  return COUNTRY_NAMES[code.toUpperCase()] ?? code;
}

const TRACKER_BASE = "https://spense-roi.results-calc.workers.dev";
const COOKIE_NAME = "spense_dash_session";
const SESSION_TTL = 28800; // 8 hours
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_TTL = 900; // 15 minutes

function sessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/`;
}

function clearCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function redirect(to: string, extra: Record<string, string> = {}): Response {
  return new Response(null, { status: 302, headers: { Location: to, ...extra } });
}

function htmlRes(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "no-store" },
  });
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${mo[d.getMonth()]} ${d.getFullYear()}`;
}

function timeAgo(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const days = Math.round((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
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

function repId(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/, "");
}

function defaultReps(): Rep[] {
  return [
    { id: "lars-vangen-jordet", name: "Lars Vangen Jordet" },
    { id: "didrik-jarlsby", name: "Didrik Jarlsby" },
    { id: "morten-olsson", name: "Morten Olsson" },
    { id: "claus-persson", name: "Claus Persson" },
  ];
}

async function getReps(bucket: R2Bucket): Promise<Rep[]> {
  const obj = await bucket.get("config/reps.json");
  if (!obj) return defaultReps();
  try {
    const data = await obj.json<{ reps: Rep[] }>();
    return data.reps ?? [];
  } catch {
    return defaultReps();
  }
}

async function putReps(bucket: R2Bucket, reps: Rep[]): Promise<void> {
  await bucket.put("config/reps.json", JSON.stringify({ reps }), {
    httpMetadata: { contentType: "application/json" },
  });
}

function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/spense_dash_session=([^;]+)/);
  return match ? match[1] : null;
}

async function isAuthed(request: Request, env: Env): Promise<boolean> {
  const token = getSessionToken(request);
  if (!token) return false;
  const val = await env.KV.get(`session:${token}`);
  return val !== null;
}

async function safeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.byteLength !== bb.byteLength) return false;
  return crypto.subtle.timingSafeEqual(ab, bb);
}

function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? "unknown";
}

const ICON_PROSPECTS = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 5.75H18.25L23 10.5V25.25C23 26.35 22.1 27.25 21 27.25H9C7.9 27.25 7 26.35 7 25.25V7.75C7 6.65 7.9 5.75 9 5.75Z" stroke="#3d60f5" stroke-width="1.75" stroke-linejoin="round"/><path d="M18 5.75V10.75H23" stroke="#3d60f5" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 21L16 17L20 21" stroke="#3d60f5" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 17V24" stroke="#3d60f5" stroke-width="1.75" stroke-linecap="round"/><path d="M11.75 13.25H16" stroke="#3d60f5" stroke-width="1.75" stroke-linecap="round" opacity="0.45"/></svg>`;
const ICON_VISITS = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.75 16C7.35 11.7 11.2 9.5 16 9.5C20.8 9.5 24.65 11.7 27.25 16C24.65 20.3 20.8 22.5 16 22.5C11.2 22.5 7.35 20.3 4.75 16Z" stroke="#3d60f5" stroke-width="1.75" stroke-linejoin="round"/><circle cx="16" cy="16" r="3.75" stroke="#3d60f5" stroke-width="1.75"/><circle cx="16" cy="16" r="1.25" fill="#3d60f5" opacity="0.55"/></svg>`;
const ICON_OPENED = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 13.25L15.05 6.75C15.62 6.34 16.38 6.34 16.95 6.75L26 13.25V24.25C26 25.35 25.1 26.25 24 26.25H8C6.9 26.25 6 25.35 6 24.25V13.25Z" stroke="#3d60f5" stroke-width="1.75" stroke-linejoin="round"/><path d="M6.75 14L14.55 19.55C15.42 20.17 16.58 20.17 17.45 19.55L25.25 14" stroke="#3d60f5" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><path d="M11.25 25.5L15.1 21.95" stroke="#3d60f5" stroke-width="1.75" stroke-linecap="round" opacity="0.5"/><path d="M20.75 25.5L16.9 21.95" stroke="#3d60f5" stroke-width="1.75" stroke-linecap="round" opacity="0.5"/><path d="M13.25 13.1L15.2 15.05L19 11.25" stroke="#3d60f5" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function loginPage(error?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Spense Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;font-family:'Open Sans',system-ui,sans-serif;background:#f7f9fc}
.wrap{min-height:100%;display:flex;align-items:center;justify-content:center;padding:2rem}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:2.5rem 2rem;width:100%;max-width:360px}
.logo{font-family:'Montserrat',sans-serif;font-weight:700;font-size:22px;color:#3d60f5;margin-bottom:.25rem}
.sub{font-size:13px;color:#718096;margin-bottom:2rem}
.err{background:#fff5f5;border:1px solid #fc8181;color:#c53030;border-radius:6px;padding:10px 14px;font-size:13px;margin-bottom:1.25rem}
label{display:block;font-size:12px;font-weight:600;color:#4a5568;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
input[type=password]{width:100%;border:1px solid #e2e8f0;border-radius:7px;padding:10px 12px;font-size:14px;font-family:inherit;outline:none;transition:border .15s;margin-bottom:1rem}
input[type=password]:focus{border-color:#3d60f5;box-shadow:0 0 0 3px rgba(61,96,245,.1)}
button[type=submit]{width:100%;background:#3d60f5;color:#fff;border:none;border-radius:7px;padding:11px;font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;transition:background .15s}
button[type=submit]:hover{background:#2a47d4}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="logo">spense</div>
    <div class="sub">Prospect Dashboard</div>
    ${error ? `<div class="err">${esc(error)}</div>` : ""}
    <form method="POST" action="/login">
      <label for="pw">Password</label>
      <input type="password" id="pw" name="password" placeholder="Enter password" autofocus autocomplete="current-password">
      <button type="submit">Sign in</button>
    </form>
  </div>
</div>
</body>
</html>`;
}

function dashboardPage(prospects: Prospect[], auditEntries: AuditEntry[], reps: Rep[]): string {
  const totalVisits = prospects.reduce((s, p) => s + p.visitCount, 0);
  const opened = prospects.filter(p => p.visitCount > 0).length;

  const rows = prospects.map(p => {
    const hasVisit = p.visitCount > 0;
    const fullUrl = `${TRACKER_BASE}/${p.slug}`;
    const displayUrl = `spense-roi.results-calc.workers.dev/${p.slug}`;
    const visitCell = hasVisit
      ? `<span class="dot dot-on"></span>${fmtDate(p.lastVisitedAt)}<div class="ago">${timeAgo(p.lastVisitedAt)}</div>`
      : `<span class="dot dot-off"></span><span class="vnever">Not yet opened</span>`;
    const countCell = hasVisit
      ? `<button type="button" class="vcount-btn" data-slug="${esc(p.slug)}" title="View visit history">${p.visitCount}</button>`
      : `<span class="vnever">&mdash;</span>`;

    return `<tr id="r-${esc(p.slug)}">
      <td>
        <div class="pname">${esc(p.prospectName)}</div>
        <div class="purl-row">
          <span class="purl">${esc(displayUrl)}</span>
          <button type="button" class="copy-btn" data-url="${esc(fullUrl)}">Copy</button>
        </div>
      </td>
      <td class="rep">${esc(p.publishedBy)}</td>
      <td class="dcell">${fmtDate(p.createdAt)}</td>
      <td class="dcell">${visitCell}</td>
      <td style="text-align:center">${countCell}</td>
      <td><button type="button" class="del-btn" data-slug="${esc(p.slug)}" data-name="${esc(p.prospectName)}">Delete</button></td>
    </tr>`;
  }).join("");

  const tableOrEmpty = prospects.length > 0
    ? `<table>
      <thead>
        <tr>
          <th>Prospect</th>
          <th>Published by</th>
          <th>Date published</th>
          <th>Last visited</th>
          <th style="text-align:center">Visits</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
    : `<div class="empty"><div class="empty-icon">📭</div><p>No prospects published yet.</p></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Spense Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Open+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--blue:#3d60f5;--red:#e53e3e;--red-light:#fff5f5;--green:#2f9e6b;--text:#1a202c;--text2:#4a5568;--text3:#718096;--border:#e2e8f0;--bg:#f7f9fc;--white:#fff}
html,body{height:100%;font-family:'Open Sans',system-ui,sans-serif;background:var(--bg);color:var(--text);font-size:14px}
.header{background:var(--white);border-bottom:1px solid var(--border);padding:0 2rem;display:flex;align-items:center;justify-content:space-between;height:56px;position:sticky;top:0;z-index:10}
.header-left{display:flex;align-items:center;gap:1rem}
.logo{font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:var(--blue);letter-spacing:-.3px}
.hdiv{width:1px;height:20px;background:var(--border)}
.htitle{font-family:'Montserrat',sans-serif;font-weight:600;font-size:13px;color:var(--text2);letter-spacing:.3px;text-transform:uppercase}
.signout-btn{background:none;border:1px solid var(--border);border-radius:6px;padding:5px 12px;font-size:12px;color:var(--text2);cursor:pointer;font-family:inherit;transition:background .15s}
.signout-btn:hover{background:var(--bg)}
.main{max-width:1100px;margin:0 auto;padding:1.5rem 2rem}
.stats-row{display:flex;gap:1rem;margin-bottom:1.5rem}
.stat-card{background:var(--white);border:1px solid var(--border);border-radius:8px;padding:1.1rem 1.5rem;flex:1;display:flex;align-items:center;justify-content:space-between;gap:1rem}
.stat-icon{opacity:.75;flex-shrink:0}
.stat-label{font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:6px}
.stat-value{font-family:'Montserrat',sans-serif;font-size:28px;font-weight:700;color:var(--text);line-height:1}
.stat-sub{font-size:11px;color:var(--text3);margin-top:5px}
.table-card{background:var(--white);border:1px solid var(--border);border-radius:8px;overflow:hidden}
.table-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;border-bottom:1px solid var(--border)}
.table-title{font-family:'Montserrat',sans-serif;font-weight:600;font-size:14px}
.refresh-btn{background:none;border:1px solid var(--border);border-radius:6px;padding:6px 12px;font-size:12px;color:var(--text2);cursor:pointer;font-family:inherit;transition:background .15s}
.refresh-btn:hover{background:var(--bg)}
table{width:100%;border-collapse:collapse}
thead th{text-align:left;padding:10px 1.5rem;font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;background:var(--bg);border-bottom:1px solid var(--border)}
tbody tr{border-bottom:1px solid var(--border);transition:background .1s,opacity .3s}
tbody tr:last-child{border-bottom:none}
tbody tr:hover{background:#f8faff}
tbody td{padding:13px 1.5rem;vertical-align:middle}
.pname{font-weight:600}
.purl-row{display:grid;grid-template-columns:minmax(0,1fr) 68px;align-items:start;column-gap:12px;margin-top:3px}
.purl{font-size:11px;color:var(--blue);opacity:.75;font-family:monospace;min-width:0;overflow-wrap:anywhere;word-break:break-word}
.copy-btn{background:none;border:1px solid var(--border);border-radius:4px;padding:1px 7px;font-size:10px;color:var(--text3);cursor:pointer;font-family:inherit;transition:all .15s;line-height:1.8;white-space:nowrap;width:68px;justify-self:end}
.copy-btn:hover{background:var(--bg);color:var(--blue);border-color:var(--blue)}
.copy-btn.copied{color:var(--green);border-color:var(--green);background:#f0fdf6}
.rep{color:var(--text2)}
.dcell{color:var(--text2);white-space:nowrap}
.ago{font-size:11px;color:var(--text3);margin-top:2px;padding-left:13px}
.vcount{font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px}
.vnever{color:var(--text3);font-size:12px;font-style:italic}
.dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px;vertical-align:middle;position:relative;top:-1px}
.dot-on{background:var(--green)}.dot-off{background:#cbd5e0}
.del-btn{background:none;border:1px solid var(--border);border-radius:6px;padding:6px 14px;font-size:12px;color:var(--red);cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap}
.del-btn:hover{background:var(--red-light);border-color:#fc8181}
.fading{opacity:.3;pointer-events:none}
.empty{text-align:center;padding:4rem 2rem;color:var(--text3)}
.empty-icon{font-size:2.5rem;margin-bottom:1rem}
.overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;z-index:100;opacity:0;transition:opacity .18s;pointer-events:none}
.overlay.show{opacity:1;pointer-events:all}
.mbox{background:var(--white);border-radius:12px;padding:2rem;width:380px;box-shadow:0 24px 64px rgba(0,0,0,.18);transform:translateY(8px);transition:transform .18s}
.overlay.show .mbox{transform:translateY(0)}
.mtitle{font-family:'Montserrat',sans-serif;font-weight:700;font-size:16px;margin-bottom:.6rem}
.mbody{font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:1.5rem}
.mname{font-weight:600;color:var(--text)}
.mbtns{display:flex;gap:.75rem;justify-content:flex-end}
.mcancel{background:none;border:1px solid var(--border);border-radius:7px;padding:9px 18px;font-size:13px;cursor:pointer;font-family:inherit;color:var(--text2);transition:background .15s}
.mcancel:hover{background:var(--bg)}
.mconfirm{background:var(--red);border:none;border-radius:7px;padding:9px 18px;font-size:13px;cursor:pointer;font-family:inherit;color:#fff;font-weight:600;transition:background .15s}
.mconfirm:hover{background:#c53030}
.vcount-btn{background:none;border:none;font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:var(--text);cursor:pointer;padding:0;transition:color .15s;text-decoration:underline dotted var(--border)}
.vcount-btn:hover{color:var(--blue)}
.visit-detail td{padding:10px 1.5rem;background:#f8faff;border-bottom:1px solid var(--border)}
.visit-row{display:flex;gap:1rem;align-items:center;padding:4px 0;border-bottom:1px solid var(--border);font-size:12px}
.visit-row:last-child{border-bottom:none}
.visit-country{min-width:140px;color:var(--text)}
.visit-time{color:var(--text3)}
.toast{position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:#2d3748;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;opacity:0;transition:opacity .2s;pointer-events:none;white-space:nowrap}
.toast.show{opacity:1}
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <span class="logo">spense</span>
    <div class="hdiv"></div>
    <span class="htitle">Prospect Dashboard</span>
  </div>
  <form method="POST" action="/logout" style="display:inline">
    <button type="submit" class="signout-btn">Sign out</button>
  </form>
</div>

<div class="main">
  <div class="stats-row">
    <div class="stat-card">
      <div>
        <div class="stat-label">Published prospects</div>
        <div class="stat-value">${prospects.length}</div>
        <div class="stat-sub">across all reps</div>
      </div>
      <div class="stat-icon">${ICON_PROSPECTS}</div>
    </div>
    <div class="stat-card">
      <div>
        <div class="stat-label">Total visits</div>
        <div class="stat-value">${totalVisits}</div>
        <div class="stat-sub">prospect views recorded</div>
      </div>
      <div class="stat-icon">${ICON_VISITS}</div>
    </div>
    <div class="stat-card">
      <div>
        <div class="stat-label">Opened by prospect</div>
        <div class="stat-value">${opened}</div>
        <div class="stat-sub">of ${prospects.length} calculator${prospects.length !== 1 ? "s" : ""} sent</div>
      </div>
      <div class="stat-icon">${ICON_OPENED}</div>
    </div>
  </div>

  <div class="table-card">
    <div class="table-header">
      <div class="table-title">Published Calculators</div>
      <button type="button" class="refresh-btn" onclick="location.reload()">&#x21BB; Refresh</button>
    </div>
    ${tableOrEmpty}
  </div>

  <div class="table-card" style="margin-top:1.5rem">
    <div class="table-header">
      <div class="table-title">Sales Reps</div>
      <div style="display:flex;gap:.5rem;align-items:center">
        <input type="text" id="rep-name-input" placeholder="Full name" style="border:1px solid var(--border);border-radius:6px;padding:5px 10px;font-size:12px;font-family:inherit;outline:none;transition:border .15s;width:180px" onfocus="this.style.borderColor='var(--blue)'" onblur="this.style.borderColor='var(--border)'">
        <button type="button" class="refresh-btn" onclick="addRep()">+ Add</button>
      </div>
    </div>
    ${reps.length > 0
      ? `<table>
        <thead><tr><th>Name</th><th></th></tr></thead>
        <tbody id="reps-tbody">${reps.map(r => `<tr id="rep-${esc(r.id)}">
          <td class="pname">${esc(r.name)}</td>
          <td><button type="button" class="del-btn rep-del-btn" data-id="${esc(r.id)}" data-name="${esc(r.name)}" style="padding:4px 10px;font-size:11px">Delete</button></td>
        </tr>`).join("")}</tbody>
      </table>`
      : `<div class="empty" style="padding:2rem" id="reps-empty"><p>No reps configured yet.</p></div>`}
  </div>
</div>

<div class="overlay" id="modal">
  <div class="mbox">
    <div class="mtitle">Delete this prospect?</div>
    <div class="mbody"><span class="mname" id="mname"></span><br>Their calculator URL will stop working immediately. This cannot be undone.</div>
    <div class="mbtns">
      <button type="button" class="mcancel" onclick="cancelDel()">Cancel</button>
      <button type="button" class="mconfirm" onclick="confirmDel()">Delete</button>
    </div>
  </div>
</div>

<div class="audit-section" style="max-width:1100px;margin:1.5rem auto;padding:0 2rem">
  <div class="table-card">
    <div class="table-header">
      <div class="table-title">Recent Activity</div>
    </div>
    ${auditEntries.length > 0
      ? `<table>
        <thead><tr>
          <th>Time</th><th>Action</th><th>Prospect</th><th>By</th>
        </tr></thead>
        <tbody>${auditEntries.map(e => {
          const label = e.action === "delete" ? "Deleted" : "Overwritten";
          const detail = e.action === "overwrite" && e.previousProspectName
            ? `<div class="ago">was: ${esc(e.previousProspectName)}</div>` : "";
          return `<tr>
            <td class="dcell">${fmtDate(e.timestamp)}<div class="ago">${timeAgo(e.timestamp)}</div></td>
            <td><span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;color:${e.action === "delete" ? "var(--red)" : "var(--blue)"}">${esc(label)}</span></td>
            <td><div class="pname">${esc(e.prospectName)}</div>${detail}</td>
            <td class="rep">${esc(e.performedBy)}</td>
          </tr>`;
        }).join("")}</tbody>
      </table>`
      : `<div class="empty" style="padding:2rem"><p>No activity recorded yet.</p></div>`}
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
var pending = null;

document.querySelectorAll('.copy-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var url = this.getAttribute('data-url');
    var b = this;
    navigator.clipboard.writeText(url).then(function() {
      b.textContent = 'Copied!';
      b.classList.add('copied');
      setTimeout(function() { b.textContent = 'Copy'; b.classList.remove('copied'); }, 1600);
    }).catch(function() {
      b.textContent = 'Failed';
      setTimeout(function() { b.textContent = 'Copy'; }, 1600);
    });
  });
});

document.querySelectorAll('.del-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    pending = { slug: this.getAttribute('data-slug'), name: this.getAttribute('data-name') };
    document.getElementById('mname').textContent = pending.name;
    document.getElementById('modal').classList.add('show');
  });
});

function cancelDel() {
  pending = null;
  document.getElementById('modal').classList.remove('show');
}

function confirmDel() {
  if (!pending) return;
  var slug = pending.slug;
  var name = pending.name;
  pending = null;
  document.getElementById('modal').classList.remove('show');
  var row = document.getElementById('r-' + slug);
  if (row) row.classList.add('fading');
  fetch('/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: slug })
  }).then(function(r) {
    if (r.ok) {
      if (row) row.remove();
      addAuditRow('delete', name);
      showToast('Prospect deleted');
    } else {
      if (row) row.classList.remove('fading');
      showToast('Delete failed — please try again');
    }
  }).catch(function() {
    if (row) row.classList.remove('fading');
    showToast('Delete failed — please try again');
  });
}

function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2500);
}

var COUNTRY_NAMES_JS = {
  NO:'Norway',DK:'Denmark',SE:'Sweden',FI:'Finland',DE:'Germany',AT:'Austria',
  CH:'Switzerland',NL:'Netherlands',BE:'Belgium',FR:'France',IT:'Italy',
  ES:'Spain',PT:'Portugal',GB:'United Kingdom',IE:'Ireland',PL:'Poland',
  CZ:'Czech Republic',HU:'Hungary',RO:'Romania',HR:'Croatia',SK:'Slovakia',
  SI:'Slovenia',EE:'Estonia',LV:'Latvia',LT:'Lithuania',LU:'Luxembourg',
  GR:'Greece',BG:'Bulgaria',MT:'Malta',CY:'Cyprus',IS:'Iceland',
  US:'United States',CA:'Canada',AU:'Australia',NZ:'New Zealand',
  JP:'Japan',CN:'China',IN:'India',BR:'Brazil',MX:'Mexico',ZA:'South Africa',
};

function toFlagJs(code) {
  if (!code || code.length !== 2) return '🌍';
  var c = code.toUpperCase();
  return String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65) +
         String.fromCodePoint(0x1F1E6 + c.charCodeAt(1) - 65);
}

document.querySelectorAll('.vcount-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    toggleVisitHistory(this.getAttribute('data-slug'));
  });
});

function toggleVisitHistory(slug) {
  var detailId = 'vd-' + slug;
  var existing = document.getElementById(detailId);
  if (existing) { existing.remove(); return; }
  var row = document.getElementById('r-' + slug);
  if (!row) return;
  var detailRow = document.createElement('tr');
  detailRow.id = detailId;
  detailRow.className = 'visit-detail';
  detailRow.innerHTML = '<td colspan="6" style="padding:10px 1.5rem;background:#f8faff;font-size:12px;color:var(--text3)">Loading…</td>';
  row.parentNode.insertBefore(detailRow, row.nextSibling);
  fetch('/visits/' + slug).then(function(r) { return r.json(); }).then(function(visits) {
    var td = detailRow.querySelector('td');
    if (!visits.length) { td.textContent = 'No visit history recorded yet.'; return; }
    var html = '<div style="max-height:220px;overflow-y:auto">' +
      visits.slice().reverse().map(function(v) {
        var flag = toFlagJs(v.country);
        var name = (v.country && COUNTRY_NAMES_JS[v.country.toUpperCase()]) || v.country || 'Unknown';
        var d = v.timestamp ? new Date(v.timestamp) : null;
        var dateStr = d ? d.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + ' ' + d.getFullYear() + ', ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') : '—';
        return '<div class="visit-row"><span class="visit-country">' + flag + ' ' + name + '</span><span class="visit-time">' + dateStr + '</span></div>';
      }).join('') + '</div>';
    td.innerHTML = html;
  }).catch(function() {
    detailRow.querySelector('td').textContent = 'Failed to load visit history.';
  });
}

document.querySelectorAll('.rep-del-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    doDeleteRep(this.getAttribute('data-id'), this.getAttribute('data-name'));
  });
});

function addRep() {
  var input = document.getElementById('rep-name-input');
  var name = input.value.trim();
  if (!name) return;
  fetch('/reps/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name })
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (data.error) { showToast(data.error); return; }
    input.value = '';
    var newRep = data.reps[data.reps.length - 1];
    var row = document.createElement('tr');
    row.id = 'rep-' + newRep.id;
    var tdName = document.createElement('td');
    tdName.className = 'pname';
    tdName.textContent = name;
    var delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'del-btn rep-del-btn';
    delBtn.setAttribute('data-id', newRep.id);
    delBtn.setAttribute('data-name', name);
    delBtn.style.cssText = 'padding:4px 10px;font-size:11px';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', function() {
      doDeleteRep(this.getAttribute('data-id'), this.getAttribute('data-name'));
    });
    var tdDel = document.createElement('td');
    tdDel.appendChild(delBtn);
    row.appendChild(tdName);
    row.appendChild(tdDel);
    var tbody = document.getElementById('reps-tbody');
    if (tbody) {
      tbody.appendChild(row);
    } else {
      var card = document.querySelector('#reps-section') || document.querySelectorAll('.table-card')[1];
      var header = card ? card.querySelector('.table-header') : null;
      if (!card || !header) return;
      var table = document.createElement('table');
      table.innerHTML = '<thead><tr><th>Name</th><th></th></tr></thead>';
      var newTbody = document.createElement('tbody');
      newTbody.id = 'reps-tbody';
      newTbody.appendChild(row);
      table.appendChild(newTbody);
      while (card.lastChild !== header) card.removeChild(card.lastChild);
      card.appendChild(table);
    }
    showToast('Rep added');
  }).catch(function() { showToast('Failed to add rep'); });
}

function doDeleteRep(id, name) {
  if (!confirm('Remove ' + name + ' from the rep list?')) return;
  fetch('/reps/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: id })
  }).then(function(r) {
    if (r.ok) {
      var row = document.getElementById('rep-' + id);
      if (row) row.remove();
      showToast('Rep removed');
    } else {
      showToast('Delete failed');
    }
  }).catch(function() { showToast('Delete failed'); });
}

function addAuditRow(action, prospectName) {
  var now = new Date();
  var mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var dateStr = now.getDate() + ' ' + mo[now.getMonth()] + ' ' + now.getFullYear();
  var label = action === 'delete' ? 'Deleted' : 'Overwritten';
  var color = action === 'delete' ? 'var(--red)' : 'var(--blue)';
  var safe = prospectName.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  var row = document.createElement('tr');
  row.innerHTML = '<td class="dcell">' + dateStr + '<div class="ago">today</div></td>' +
    '<td><span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;color:' + color + '">' + label + '</span></td>' +
    '<td><div class="pname">' + safe + '</div></td>' +
    '<td class="rep">dashboard</td>';
  var section = document.querySelector('.audit-section');
  if (!section) return;
  var tbody = section.querySelector('tbody');
  if (tbody) {
    tbody.insertBefore(row, tbody.firstChild);
  } else {
    var card = section.querySelector('.table-card');
    var header = card ? card.querySelector('.table-header') : null;
    if (!card || !header) return;
    var table = document.createElement('table');
    table.innerHTML = '<thead><tr><th>Time</th><th>Action</th><th>Prospect</th><th>By</th></tr></thead>';
    var newTbody = document.createElement('tbody');
    newTbody.appendChild(row);
    table.appendChild(newTbody);
    while (card.lastChild !== header) card.removeChild(card.lastChild);
    card.appendChild(table);
  }
}
</script>
</body>
</html>`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const ip = clientIp(request);

    if (path === "/api/reps" && method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "https://mortenspense.github.io",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (path === "/api/reps" && method === "GET") {
      const reps = await getReps(env.BUCKET);
      return new Response(JSON.stringify(reps), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "https://mortenspense.github.io",
          "Cache-Control": "no-store",
        },
      });
    }

    if (path === "/login" && method === "GET") {
      return htmlRes(loginPage());
    }

    if (path === "/login" && method === "POST") {
      // Check lockout before anything else
      const lockKey = `lockout:${ip}`;
      const locked = await env.KV.get(lockKey);
      if (locked) {
        return htmlRes(loginPage("Too many failed attempts. Please try again in 15 minutes."), 429);
      }

      const form = await request.formData();
      const password = (form.get("password") as string) ?? "";
      const passwordMatch = await safeEqual(password, env.DASHBOARD_PASSWORD);

      if (!passwordMatch) {
        // Increment failure counter
        const failKey = `login_fail:${ip}`;
        const current = parseInt((await env.KV.get(failKey)) ?? "0", 10);
        const next = current + 1;
        if (next >= MAX_FAILED_ATTEMPTS) {
          await env.KV.delete(failKey);
          await env.KV.put(lockKey, "1", { expirationTtl: LOCKOUT_TTL });
          return htmlRes(loginPage("Too many failed attempts. Please try again in 15 minutes."), 429);
        }
        await env.KV.put(failKey, String(next), { expirationTtl: LOCKOUT_TTL });
        return htmlRes(loginPage("Incorrect password — try again."), 401);
      }

      // Successful login — clear failure counter, create session
      await env.KV.delete(`login_fail:${ip}`);
      const token = crypto.randomUUID();
      await env.KV.put(`session:${token}`, "1", { expirationTtl: SESSION_TTL });
      return redirect("/", { "Set-Cookie": sessionCookie(token) });
    }

    if (path === "/logout" && method === "POST") {
      const token = getSessionToken(request);
      if (token) await env.KV.delete(`session:${token}`);
      return redirect("/login", { "Set-Cookie": clearCookie() });
    }

    if (!(await isAuthed(request, env))) {
      return redirect("/login");
    }

    if (path === "/" && method === "GET") {
      const listing = await env.BUCKET.list({
        prefix: "slugs/",
        // @ts-expect-error include is supported at runtime but missing from this workers-types version
        include: ["customMetadata"],
      });

      const prospects: Prospect[] = listing.objects.map(obj => {
        const slug = obj.key.replace("slugs/", "").replace(".html", "");
        const meta = obj.customMetadata ?? {};
        return {
          slug,
          prospectName: meta.prospectName ?? slug,
          publishedBy: meta.publishedBy ?? "—",
          createdAt: meta.createdAt ?? "",
          visitCount: parseInt(meta.visitCount ?? "0", 10),
          lastVisitedAt: meta.lastVisitedAt ?? "",
        };
      });

      prospects.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

      const auditListing = await env.BUCKET.list({
        prefix: "logs/",
        // @ts-expect-error include is supported at runtime
        include: ["customMetadata"],
      });
      const auditEntries: AuditEntry[] = auditListing.objects
        .sort((a, b) => (b.key > a.key ? 1 : -1))
        .slice(0, 20)
        .map(obj => {
          const m = obj.customMetadata ?? {};
          return {
            action: m.action ?? "",
            slug: m.slug ?? "",
            prospectName: m.prospectName ?? "",
            performedBy: m.performedBy ?? "",
            timestamp: m.timestamp ?? "",
            previousProspectName: m.previousProspectName,
          };
        });

      const reps = await getReps(env.BUCKET);
      return htmlRes(dashboardPage(prospects, auditEntries, reps));
    }

    if (path === "/delete" && method === "POST") {
      const body = await request.json() as { slug?: string };
      const slug = body.slug ?? "";
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
        return new Response(JSON.stringify({ error: "Invalid slug" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const existing = await env.BUCKET.head(`slugs/${slug}.html`);
      const prospectName = existing?.customMetadata?.prospectName ?? slug;
      await env.BUCKET.delete(`slugs/${slug}.html`);
      await env.BUCKET.delete(`visits/${slug}.json`);
      await writeAuditLog(env.BUCKET, {
        action: "delete",
        slug,
        prospectName,
        performedBy: "dashboard",
        timestamp: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path.startsWith("/visits/") && method === "GET") {
      const slug = path.replace("/visits/", "");
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
        return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
      }
      const obj = await env.BUCKET.get(`visits/${slug}.json`);
      if (!obj) {
        return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
      }
      return new Response(await obj.text(), { headers: { "Content-Type": "application/json" } });
    }

    if (path === "/reps/add" && method === "POST") {
      const body = await request.json() as { name?: string };
      const name = (body.name ?? "").trim();
      if (!name) {
        return new Response(JSON.stringify({ error: "Name is required" }), {
          status: 400, headers: { "Content-Type": "application/json" },
        });
      }
      const id = repId(name);
      const reps = await getReps(env.BUCKET);
      if (reps.find(r => r.id === id)) {
        return new Response(JSON.stringify({ error: "A rep with that name already exists" }), {
          status: 409, headers: { "Content-Type": "application/json" },
        });
      }
      reps.push({ id, name });
      await putReps(env.BUCKET, reps);
      return new Response(JSON.stringify({ ok: true, reps }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/reps/delete" && method === "POST") {
      const body = await request.json() as { id?: string };
      const id = body.id ?? "";
      if (!id) {
        return new Response(JSON.stringify({ error: "ID is required" }), {
          status: 400, headers: { "Content-Type": "application/json" },
        });
      }
      const reps = await getReps(env.BUCKET);
      const filtered = reps.filter(r => r.id !== id);
      await putReps(env.BUCKET, filtered);
      return new Response(JSON.stringify({ ok: true, reps: filtered }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
