/* ============================================================
   lib/db.js — shared Supabase REST helper for the Vercel API.
   Uses the SERVICE-ROLE key (server-side only, never exposed).
   Free DB: https://supabase.com → new project → run schema.sql

   IMPORTANT: mapField() whitelists EXACTLY the columns in
   schema.sql. Extra frontend fields (createdAt, etc.) must
   NEVER reach the API — PostgREST rejects unknown columns
   with PGRST204, which looks like a "stuck/pending" request.
   ============================================================ */
const BASE = process.env.SUPABASE_URL;           // https://xxxx.supabase.co
const KEY = process.env.SUPABASE_SERVICE_KEY;    // service_role key (secret!)

function ready() { return Boolean(BASE && KEY); }

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

module.exports = { ready, listBookings, listByIds, insertBooking, cancelBooking };
