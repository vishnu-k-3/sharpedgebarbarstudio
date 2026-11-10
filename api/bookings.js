/* ============================================================
   api/bookings.js
   POST /api/bookings  → create (public). Overlap-checked.
   GET  /api/bookings  → all bookings, x-admin-pin header required.
   ============================================================ */
const db = require("../lib/db.js");

const CLOSED_DAYS = [0];                 // Sunday
const OPEN = 9 * 60, CLOSE = 20 * 60;    // minutes since midnight

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-admin-pin",
};

const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
  res.end(JSON.stringify(body));
};

const overlap = (aS, aE, bS, bE) => aS < bE && bS < aE;
const toMin = (hhmm) => hhmm.split(":").reduce((a, t) => a * 60 + +t, 0);

function validate(b) {
  if (!b || !b.name || !b.phone || !b.date || !b.start || !b.serviceId || !b.duration) return "missing fields";
  if (!/^\d{10}$/.test(String(b.phone))) return "phone must be 10 digits";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date)) return "bad date";
  if (!/^\d{2}:\d{2}$/.test(b.start)) return "bad time format";
  const [y, m, d] = b.date.split("-").map(Number);
  if (CLOSED_DAYS.includes(new Date(Date.UTC(y, m - 1, d)).getUTCDay())) return "shop closed on this day";
  const s = toMin(b.start), e = s + Number(b.duration);
  if (s < OPEN || e > CLOSE) return "outside working hours";
  return null;
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") return json(res, 204, {});
  if (!db.ready()) return json(res, 500, { error: "Backend not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in Vercel → Settings → Environment Variables." });

  try {
    /* ---- ADMIN: read all (PIN check on server) ---- */
    if (req.method === "GET") {
      const pin = req.headers["x-admin-pin"] || "";
      const adminPin = process.env.ADMIN_PIN || "2468";
      if (!pin || pin !== adminPin) return json(res, 401, { error: "Wrong admin PIN" });
      return json(res, 200, await db.listBookings());
    }

    /* ---- PUBLIC: create ---- */
    if (req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        let b;
        try { b = JSON.parse(body); } catch { return json(res, 400, { error: "bad json" }); }

        const err = validate(b);
        if (err) return json(res, 400, { error: err });

        // conflict check against all confirmed bookings that date
        const existing = (await db.listBookings({ date: b.date })).filter((x) => x.status !== "cancelled");
        const s = toMin(b.start), e = s + Number(b.duration);
        if (existing.some((x) => overlap(s, e, toMin(x.start), toMin(x.end)))) {
          return json(res, 409, { error: "Slot already booked. Choose another time." });
        }

        b.id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        b.status = "confirmed";
        const saved = await db.insertBooking(b);
        return json(res, 201, saved);
      });
      return;
    }

    json(res, 405, { error: "method not allowed" });
  } catch (err) {
    json(res, 500, { error: err.message });
  }
};
