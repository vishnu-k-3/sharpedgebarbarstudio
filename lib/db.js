/* ============================================================
   lib/db.js — shared Supabase REST helper for the Vercel API.
   Uses the SERVICE-ROLE key (server-side only, never exposed).
   Free DB: https://supabase.com → new project → run schema.sql
   ============================================================ */
const BASE = process.env.SUPABASE_URL;           // https://xxxx.supabase.co
const KEY = process.env.SUPABASE_SERVICE_KEY;    // service_role key (secret!)

function ready() { return Boolean(BASE && KEY); }

function headers() {
  return {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
  };
}

/* Postgres row  →  frontend booking object */
function mapRow(r) {
  if (!r) return r;
  const { start_time, end_time, ...rest } = r;
  return { ...rest, start: start_time, end: end_time };
}

/* frontend booking object → Postgres row */
function mapField(b) {
  const { start, end, ...rest } = b;
  return { ...rest, start_time: start, end_time: end };
}

async function listBookings({ date } = {}) {
  let path = `/rest/v1/bookings?select=*&order=date.asc,start_time.asc`;
  if (date) path += `&date=eq.${date}`;
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`DB error ${res.status}`);
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
  return mapRow((await res.json())[0]);
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
