/* ============================================================
   api/bookings/[id]/cancel.js
   POST /api/bookings/:id/cancel → mark a booking cancelled.
   The id is an unguessable token created at booking time
   (shown to the customer at confirmation), so no login needed.
   ============================================================ */
const db = require("../../lib/db.js");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
    return res.end();
  }
  if (req.method !== "POST") { res.statusCode = 405; return res.end(); }
  if (!db.ready()) { res.statusCode = 500; return res.end(JSON.stringify({ error: "backend not configured" })); }

  try {
    const id = (req.url.match(/\/api\/bookings\/([^/]+)\/cancel/) || [])[1];
    if (!id) { res.statusCode = 400; return res.end(JSON.stringify({ error: "missing id" })); }
    await db.cancelBooking(decodeURIComponent(id));
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message }));
  }
};
