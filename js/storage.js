/* ============================================================
   storage.js — booking data layer.

   TWO interchangeable modes (set in js/config.js):

   1) LOCAL  (useRemoteApi:false) → bookings in this browser's
      localStorage. Good for demo / one-device use.

   2) REMOTE (useRemoteApi:true) → REST API backend.
      apiBase examples:
        "http://localhost:3000/api"  → local Docker backend
        "/api"                       → Vercel (same site hosts the API)
      Works with backend/server.js AND the Vercel functions in api/.

   No UI code needs to change when you switch — same interface.
   ============================================================ */
const Storage = (() => {
  const LS_KEY = "sharpedge_bookings_v1";  // local demo data
  const MY_KEY = "sharpedge_my_ids_v1";    // ids booked from THIS device (remote mode)

  /* ---------- localStorage helpers ---------- */
  function lsAll() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch { return []; }
  }
  function lsSave(list) { localStorage.setItem(LS_KEY, JSON.stringify(list)); }
  function myIds() {
    try { return JSON.parse(localStorage.getItem(MY_KEY)) || []; }
    catch { return []; }
  }
  function rememberId(id) {
    const ids = myIds(); ids.push(id);
    localStorage.setItem(MY_KEY, JSON.stringify([...new Set(ids)]));
  }

  /* ================= LOCAL MODE ================= */
  async function lsAvailability(date) {
    return lsAll()
      .filter((b) => b.date === date && b.status !== "cancelled")
      .map(({ start, end }) => ({ start, end }));
  }
  async function lsMine()       { return lsAll(); } // on this device, everything is "mine"
  async function lsAdd(b)       { const l = lsAll(); l.push(b); lsSave(l); rememberId(b.id); return b; }
  async function lsCancel(id)   { lsSave(lsAll().map((b) => (b.id === id ? { ...b, status: "cancelled" } : b))); return true; }
  async function lsGetAll()     { return lsAll(); }

  /* ================= REMOTE MODE ================= */
  async function call(path, opts = {}, adminPin = null) {
    const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    if (adminPin) headers["x-admin-pin"] = adminPin;
    const res = await fetch(`${CONFIG.apiBase}${path}`, { ...opts, headers });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { msg = (await res.json()).error || msg; } catch {}
      throw new Error(msg);
    }
    return res.status === 204 ? {} : res.json();
  }

  async function apiAvailability(date) {
    const data = await call(`/availability?date=${date}`);
    return data.intervals || [];
  }
  async function apiMine() {
    const data = await call("/mine", { method: "POST", body: JSON.stringify({ ids: myIds() }) });
    return data.bookings || [];
  }
  async function apiAdd(b) {
    const saved = await call("/bookings", { method: "POST", body: JSON.stringify(b) });
    rememberId(saved.id || b.id);
    return saved;
  }
  async function apiCancel(id)        { await call(`/bookings/${id}/cancel`, { method: "POST" }); return true; }
  async function apiGetAll(adminPin)  { return call("/bookings", {}, adminPin); }

  /* ---------- Public API (used by app.js / admin.js) ---------- */
  return {
    mode: () => (CONFIG.useRemoteApi ? "remote" : "local"),

    /** [{start:"HH:MM", end:"HH:MM"}] booked intervals for that date */
    async getAvailability(date) {
      return CONFIG.useRemoteApi ? apiAvailability(date) : lsAvailability(date);
    },
    /** bookings made from this device */
    async getMine() {
      return CONFIG.useRemoteApi ? apiMine() : lsMine();
    },
    /** every booking (ADMIN) — needs the admin PIN in remote mode */
    async getAll(adminPin) {
      return CONFIG.useRemoteApi ? apiGetAll(adminPin) : lsGetAll();
    },
    /** create a booking; rejects with the server's error message */
    async add(b)     { return CONFIG.useRemoteApi ? apiAdd(b) : lsAdd(b); },
    async cancel(id) { return CONFIG.useRemoteApi ? apiCancel(id) : lsCancel(id); },
  };
})();
