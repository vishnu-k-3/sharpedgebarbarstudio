/* ============================================================
   api/availability.js — public safe data for the slot calendar.
   GET /api/availability?date=YYYY-MM-DD
   → { intervals: [{start,end}, ...] }  (no personal data)
   ============================================================ */
const db = require("../lib/db.js");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
    return res.end();
  }
  if (req.method !== "GET") { res.statusCode = 405; return res.end(); }
  if (!db.ready()) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
    return res.end(JSON.stringify({ intervals: [], error: "Backend not configured" }));
  }

  try {
    const date = (req.url.match(/date=(\d{4}-\d{2}-\d{2})/) || [])[1];
    const rows = (await db.listBookings({ date })).filter((b) => b.status !== "cancelled");
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
    res.end(JSON.stringify({ intervals: rows.map(({ start, end }) => ({ start, end })) }));
  } catch {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
    res.end(JSON.stringify({ intervals: [], error: "availability error" }));
  }
};
