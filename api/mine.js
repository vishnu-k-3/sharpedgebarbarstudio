/* ============================================================
   api/mine.js — POST /api/mine { ids: [...] }
   Returns only the bookings whose ids were created on this
   device (ids are unguessable tokens), so customers can see
   their own "My Bookings" list without an account.
   ============================================================ */
const db = require("../lib/db.js");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
    return res.end();
  }
  if (req.method !== "POST") { res.statusCode = 405; return res.end(); }
  if (!db.ready()) { res.statusCode = 500; return res.end(JSON.stringify({ bookings: [] })); }

  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", async () => {
    try {
      let ids = [];
      try { ids = (JSON.parse(body).ids || []).slice(0, 50); } catch {}
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
      res.end(JSON.stringify({ bookings: await db.listByIds(ids) }));
    } catch {
      res.statusCode = 500;
      res.end(JSON.stringify({ bookings: [] }));
    }
  });
};
