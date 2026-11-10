/* ============================================================
   backend/server.js — OPTIONAL local backend (run with Docker)

   Same REST API as the Vercel functions (api/), so the website
   works with either one by just changing apiBase in config.js.

   Routes:
   GET  /api/availability?date=YYYY-MM-DD  (public, safe data)
   POST /api/bookings                      (public, overlap-checked)
   POST /api/bookings/:id/cancel           (public, id is the token)
   POST /api/mine        {ids:[...]}       (public, this device)
   GET  /api/bookings                     (ADMIN — x-admin-pin header)

   Start:    docker compose up -d      (from backend/)
   Config:   ADMIN_PIN env var (default 2468)
   Connect:  js/config.js → useRemoteApi:true,
             apiBase:"http://localhost:3000/api"
   ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || "2468";
const DATA_FILE = path.join(__dirname, "data", "bookings.json");

const CLOSED_DAYS = [0];                      // Sunday
const OPEN = 9 * 60, CLOSE = 20 * 60;         // minutes

/* --- tiny JSON file storage (survives restarts via volume) --- */
function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch { return []; }
}
function save(list) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}

function send(res, code, body) {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-pin",
  });
  res.end(JSON.stringify(body));
}

const overlap = (aS, aE, bS, bE) => aS < bE && bS < aE;
const toMin = (hhmm) => hhmm.split(":").reduce((a, t) => a * 60 + +t, 0);

function validate(b) {
  if (!b || !b.name || !b.phone || !b.date || !b.start || !b.serviceId || !b.duration) return "missing fields";
  if (!/^\d{10}$/.test(String(b.phone))) return "phone must be 10 digits";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date)) return "bad date";
  if (!/^\d{2}:\d{2}$/.test(b.start)) return "bad time format";
  const [y, m, d] = b.date.split("-").map(Number);
  if (CLOSED_DAYS.includes(new Date(y, m - 1, d).getDay())) return "shop closed on this day";
  const s = toMin(b.start), e = s + Number(b.duration);
  if (s < OPEN || e > CLOSE) return "outside working hours";
  return null;
}

const readBody = (req) => new Promise((r) => { let s = ""; req.on("data", (c) => (s += c)); req.on("end", () => r(s)); });

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});

  const u = new URL(req.url, `http://${req.headers.host}`);
  const p = u.pathname.replace(/\/+$/, "");         // /api/... only
  if (!p.startsWith("/api")) return send(res, 404, { error: "not found" });
  const seg = p.slice(4).split("/").filter(Boolean); // ["bookings", id, "cancel"]

  try {
    /* availability (public) */
    if (req.method === "GET" && seg[0] === "availability") {
      const date = u.searchParams.get("date");
      const intervals = load()
        .filter((b) => b.date === date && b.status !== "cancelled")
        .map(({ start, end }) => ({ start, end }));
      return send(res, 200, { intervals });
    }

    /* all bookings: admin only */
    if (req.method === "GET" && p === "/api/bookings") {
      if ((req.headers["x-admin-pin"] || "") !== ADMIN_PIN) return send(res, 401, { error: "Wrong admin PIN" });
      return send(res, 200, load());
    }

    /* create booking (public) */
    if (req.method === "POST" && p === "/api/bookings") {
      const b = JSON.parse(await readBody(req));
      const err = validate(b);
      if (err) return send(res, 400, { error: err });

      const clash = load().some(
        (x) => x.date === b.date && x.status !== "cancelled" &&
               overlap(toMin(b.start), toMin(b.end), toMin(x.start), toMin(x.end))
      );
      if (clash) return send(res, 409, { error: "Slot already booked. Choose another time." });

      b.id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      b.status = "confirmed";
      const list = load(); list.push(b); save(list);
      return send(res, 201, b);
    }

    /* my bookings for this device */
    if (req.method === "POST" && p === "/api/mine") {
      let ids = [];
      try { ids = (JSON.parse(await readBody(req)).ids || []).slice(0, 50); } catch {}
      return send(res, 200, { bookings: load().filter((b) => ids.includes(b.id)) });
    }

    /* cancel */
    let m = p.match(/^\/api\/bookings\/([^/]+)\/cancel$/);
    if (req.method === "POST" && m) {
      const id = decodeURIComponent(m[1]);
      save(load().map((x) => (x.id === id ? { ...x, status: "cancelled" } : x)));
      return send(res, 200, { ok: true });
    }

    send(res, 404, { error: "not found" });
  } catch (err) {
    send(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => console.log(`SharpEdge booking API on port ${PORT} (admin PIN: set ADMIN_PIN env)`));
