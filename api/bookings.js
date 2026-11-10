/* ============================================================
   api/bookings.js
   POST /api/bookings  → create (public). Overlap-checked.
   GET  /api/bookings  → all bookings, x-admin-pin header required.

   NOTE: the response helper ALWAYS returns JSON — even on
   crashes — so the browser never hangs on a pending request.
   ============================================================ */

const CLOSED_DAYS = [0];                 // Sunday
const OPEN = 9 * 60, CLOSE = 20 * 60;    // minutes since midnight

module.exports = (req, res) => {
  // everything runs inside `run()` which absolutely answers `res`;
  // the promise is returned so the runtime waits for it too
  return run(req, res).catch((err) => answer(res, 500, { error: err && err.message ? err.message : String(err) }));
};

async function run(req, res) {
  if (req.method === "OPTIONS") return answer(res, 204, {});

  const db = require("../lib/db.js");
  if (!db.ready()) {
    return answer(res, 500, {
      error: "Backend not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY in Vercel → Settings → Environment Variables, then redeploy.",
    });
  }

  try {
    /* ---- ADMIN: read all (PIN checked on the server) ---- */
    if (req.method === "GET") {
      const pin = req.headers["x-admin-pin"] || "";
      const adminPin = process.env.ADMIN_PIN || "2468";
      if (!pin || pin !== adminPin) return answer(res, 401, { error: "Wrong admin PIN" });
      return answer(res, 200, await db.listBookings());
    }

    /* ---- PUBLIC: create ---- */
    if (req.method === "POST") {
      const body = await readBody(req);
      let b;
      try { b = JSON.parse(body); }
      catch { return answer(res, 400, { error: "bad json" }); }

      const err = validate(b);
      if (err) return answer(res, 400, { error: err });

      // conflict check against all confirmed bookings that date
      const existing = (await db.listBookings({ date: b.date })).filter((x) => x.status !== "cancelled");
      const s = toMin(b.start), e = s + Number(b.duration);
      if (existing.some((x) => overlap(s, e, toMin(x.start), toMin(x.end)))) {
        return answer(res, 409, { error: "Slot already booked. Choose another time." });
      }

      b.id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      b.status = "confirmed";
      const saved = await db.insertBooking(b);
      return answer(res, 201, saved);
    }

    answer(res, 405, { error: "method not allowed" });
  } catch (err) {
    answer(res, 500, {
      error: err && err.message
        ? `Booking failed: ${err.message} (check SUPABASE_URL / SUPABASE_SERVICE_KEY env vars and redeploy)`
        : "Booking failed: unknown server error",
    });
  }
}

/* ---------- helpers ---------- */

function answer(res, code, body) {
  try {
    res.statusCode = code;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-pin");
    res.end(JSON.stringify(body));
  } catch {
    /* response already sent — swallow (res can only be ended once) */
  }
}

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
    // safety net: if events never fire (runtime quirk), don't hang forever
    setTimeout(() => { if (!data) resolve(data); }, 4000);
  }).then((d) => d || "");

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
