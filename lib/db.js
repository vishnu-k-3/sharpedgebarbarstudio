/* ============================================================
   lib/db.js — shared Supabase REST helper for the Vercel API.
   Uses the SERVICE-ROLE key (server-side only, never exposed).
   Free DB: https://supabase.com → new project → run schema.sql

   IMPORTANT: mapField() whitelists EXACTLY the columns in
   schema.sql. Extra frontend fields (createdAt, etc.) must
   NEVER reach the API — PostgREST rejects unknown columns
   with PGRST204, which looks like a "stuck/pending" request.
   ============================================================ */
const RAW_BASE = process.env.SUPABASE_URL;       // https://xxxx.supabase.co
const KEY = String(process.env.SUPABASE_SERVICE_KEY || "").trim().replace(/^["']|["']$/g, "");

/* Users often paste the URL with a trailing slash, quotes or an
   appended /rest/v1 path — any of these makes Supabase answer
   "Invalid path specified in request URL". Clean it defensively. */
function normBase(u) {
  let s = String(u || "").trim().replace(/^["']+|["']+$/g, "");
  s = s.split("/rest/v1")[0]; // if the full REST endpoint was pasted, cut it
  s = s.replace(/\/+$/, "");
  return s;
}
const BASE = normBase(RAW_BASE);

function ready() {
  return Boolean(BASE && KEY && /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(BASE));
}

/* Friendly hint about WHY the env vars look wrong */
function diag() {
  if (!RAW_BASE) return "SUPABASE_URL is empty — add it in Vercel → Settings → Environment Variables.";
  if (BASE !== RAW_BASE) return `SUPABASE_URL was fixed automatically: '${RAW_BASE.slice(0, 40)}…' → '${BASE}'`;
  if (!/^https:\/\//i.test(BASE)) return `SUPABASE_URL must start with https:// (got '${BASE.slice(0, 30)}…')`;
  if (!/\.supabase\.(co|in)$/i.test(BASE)) return `SUPABASE_URL should look like https://xxxx.supabase.co (got '${BASE.slice(0, 40)}…')`;
  if (!KEY) return "SUPABASE_SERVICE_KEY is empty — copy the secret_role key from Supabase → Settings → API Keys.";
  return "";
}

function headers() {
  return { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
}

/* Postgres row → frontend booking object */
function mapRow(r) {
  if (!r) return r;
  const { start_time, end_time, ...rest } = r;
  return {
    ...rest,
    start: start_time != null ? start_time : rest.start,
    end: end_time != null ? end_time : rest.end,
  };
}

/* frontend booking object → clean Postgres row (whitelist!) */
function mapField(b) {
  return {
    id: String(b.id || ""),
    date: b.date,
    start_time: b.start,
    end_time: b.end || "",
    service_id: String(b.serviceId || ""),
    service_name: b.serviceName || "",
    duration: Number(b.duration) || 0,
    price: b.price || "",
    name: String(b.name || ""),
    phone: String(b.phone || ""),
    status: b.status || "confirmed",
  };
}

async function listBookings({ date } = {}) {
  let path = `/rest/v1/bookings?select=*&order=date.asc,start_time.asc`;
  if (date) path += `&date=eq.${date}`;
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  if (!res.ok) {
    let detail = `DB error ${res.status}`;
    try { detail = (await res.json()).message || detail; } catch {}
    throw new Error(detail.includes("SUPABASE") ? detail : `${detail} — check SUPABASE_URL / SUPABASE_SERVICE_KEY`);
  }
  const rows = await res.json();
  return rows.map(mapRow);
}

async function listByIds(ids) {
  if (!ids.length) return [];
  const inClause = `(${ids.join(",")})`;
  const res = await fetch(
    `${BASE}/rest/v1/bookings?select=*&id=in.${encodeURIComponent(inClause)}&order=date.asc,start_time.asc`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`DB error ${res.status}`);
  return (await res.json()).map(mapRow);
}

async function insertBooking(b) {
  const res = await fetch(`${BASE}/rest/v1/bookings`, {
    method: "POST",
    headers: { ...headers(), Prefer: "return=representation" },
    body: JSON.stringify(mapField(b)),
  });
  if (!res.ok) {
    let detail = `DB error ${res.status}`;
    try { detail = (await res.json()).message || detail; } catch {}
    throw new Error(detail);
  }
  const rows = await res.json();
  return mapRow(rows[0]) || { id: b.id, date: b.date, start: b.start, end: b.end, serviceId: b.serviceId, status: "confirmed" };
}

async function cancelBooking(id) {
  const res = await fetch(`${BASE}/rest/v1/bookings?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...headers(), Prefer: "return=representation" },
    body: JSON.stringify({ status: "cancelled" }),
  });
  if (!res.ok) throw new Error(`DB error ${res.status}`);
  return true;
}

module.exports = { ready, diag, listBookings, listByIds, insertBooking, cancelBooking };
