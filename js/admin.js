/* ============================================================
   admin.js — Owner dashboard for admin.html

   Works in BOTH modes:
   - local  : shows bookings made in THIS browser (demo)
   - remote : shows ALL bookings from the live backend
              (unlocked with the admin PIN checked by the API)
   ============================================================ */

const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, "0");
const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt12 = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); const ap = h >= 12 ? "PM" : "AM"; return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${ap}`; };
const toMin = (hhmm) => hhmm.split(":").reduce((a, t) => a * 60 + +t, 0);
const money = (s) => Number(String(s || "").replace(/[^\d]/g, "")) || 0;

const els = {
  gate: $("#pinGate"), panel: $("#adminPanel"),
  pinIn: $("#pinInput"), pinBtn: $("#pinBtn"), pinErr: $("#pinError"),
  badge: $("#modeBadge"), rows: $("#rows"), note: $("#adminNote"),
};

let allBookings = [];
let unlocked = false;
let pinOK = null; // validated pin (remote mode)

/* ---------- labels ---------- */
if (CONFIG.useRemoteApi) {
  els.badge.textContent = `● LIVE backend · ${CONFIG.apiBase}`;
  $("#modeBadge2").textContent = "Enter the admin PIN to view the live booking calendar";
} else {
  els.badge.textContent = "● Local demo mode (this browser only)";
  $("#modeBadge2").textContent = "Local demo mode: bookings made in this browser. Connect the backend to see all customers.";
}
$("#shopName").textContent = CONFIG.shopName;

/* ---------- unlock ---------- */
async function unlock() {
  const pin = els.pinIn.value.trim();
  if (!pin) { els.pinErr.textContent = "Enter the admin PIN."; return; }

  if (CONFIG.useRemoteApi) {
    // PIN is verified by the server (ADMIN_PIN env var)
    try {
      allBookings = await Storage.getAll(pin);
    } catch (err) {
      els.pinErr.textContent = err.message.includes("401") || /pin/i.test(err.message) ? "Wrong PIN." : err.message;
      return;
    }
    pinOK = pin;
  } else {
    if (pin !== String(CONFIG.adminPin)) { els.pinErr.textContent = "Wrong PIN."; return; }
    allBookings = await Storage.getAll();
  }

  unlocked = true;
  sessionStorage.setItem("sharpedge_admin_unlocked", "1");
  els.gate.hidden = true;
  els.panel.hidden = false;
  render();
  setInterval(() => unlocked && load(), 60000); // auto-refresh every minute
}

els.pinBtn.addEventListener("click", unlock);
els.pinIn.addEventListener("keydown", (e) => e.key === "Enter" && unlock());
$("#logoutBtn").addEventListener("click", () => {
  unlocked = false; sessionStorage.removeItem("sharpedge_admin_unlocked");
  els.panel.hidden = true; els.gate.hidden = false; els.pinIn.value = "";
});
$("#refreshBtn").addEventListener("click", async () => { await load(); render(); });

/* ---------- data ---------- */
async function load() {
  if (CONFIG.useRemoteApi) {
    try { allBookings = await Storage.getAll(pinOK); }
    catch (err) { els.note.textContent = `Refresh failed: ${err.message}`; }
  } else {
    allBookings = await Storage.getAll();
  }
}

/* ---------- filters ---------- */
const RANGE = { value: "upcoming", date: "" };
document.querySelectorAll(".toolbar [data-range]").forEach((b) =>
  b.addEventListener("click", () => {
    document.querySelectorAll(".toolbar [data-range]").forEach((x) => x.classList.toggle("active", x === b));
    RANGE.value = b.dataset.range;
    render();
  })
);
$("#dateFilter").addEventListener("change", (e) => {
  RANGE.date = e.target.value;
  $("#clearDate").style.display = RANGE.date ? "" : "none";
  render();
});
$("#clearDate").addEventListener("click", () => {
  RANGE.date = ""; $("#dateFilter").value = ""; $("#clearDate").style.display = "none"; render();
});

function visibleBookings() {
  const today = isoToday();
  let list = allBookings;
  if (RANGE.date) list = list.filter((b) => b.date === RANGE.date);
  else if (RANGE.value === "today") list = list.filter((b) => b.date === today);
  else if (RANGE.value === "upcoming") list = list.filter((b) => b.date > today || (b.date === today && toMin(b.end) > new Date().getHours() * 60 + new Date().getMinutes()));
  return list.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

/* ---------- render ---------- */
const mons = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const niceDate = (d) => { const [y, m, dd] = d.split("-").map(Number); return `${dd} ${mons[m - 1]}`; };

function render() {
  if (!unlocked) return;
  const list = visibleBookings();
  const today = isoToday();
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  // stats (all bookings, not filtered)
  const up = allBookings.filter((b) => b.status !== "cancelled" && (b.date > today || (b.date === today && toMin(b.end) > nowMin)));
  $("#statToday").textContent = allBookings.filter((b) => b.date === today && b.status !== "cancelled").length;
  $("#statUpcoming").textContent = up.length;
  $("#statRevenue").textContent = up.reduce((s, b) => s + money(b.price), 0) ? `₹${up.reduce((s, b) => s + money(b.price), 0)}` : "₹0";
  $("#statTotal").textContent = allBookings.filter((b) => b.status !== "cancelled").length;

  els.rows.innerHTML = !list.length
    ? `<tr><td colspan="7" class="empty-row">${RANGE.date ? "No bookings on this date." : "No bookings to show."}</td></tr>`
    : list.map((b) => `
      <tr>
        <td>${niceDate(b.date)}</td>
        <td><b>${fmt12(b.start)}</b> – ${fmt12(b.end)}</td>
        <td>${esc(b.serviceName)}<br><span class="selling">${esc(b.price)}</span></td>
        <td class="who">${esc(b.name)}</td>
        <td><a href="tel:${esc(b.phone)}">${esc(b.phone)}</a></td>
        <td><span class="status-pill st-${esc(b.status)}">${esc(b.status)}</span></td>
        <td>${b.status === "cancelled" ? "" : `<button class="cell-cancel" data-id="${esc(b.id)}" data-phone="${esc(b.phone)}">cancel</button>`}</td>
      </tr>`).join("");

  els.note.textContent = CONFIG.useRemoteApi
    ? `Live data from ${CONFIG.apiBase}. Refreshes automatically every 60 s while this page is open.`
    : `Demo mode: these are bookings stored in THIS browser only. Connect the backend (README → Phase 2) to see every customer.`;
}

/* cancel with re-confirmation on the customer's phone number */
els.rows.addEventListener("click", async (e) => {
  const btn = e.target.closest(".cell-cancel");
  if (!btn) return;
  const last4 = btn.dataset.phone.slice(-4);
  if (prompt(`Cancel this booking?\nType the LAST 4 digits of the customer's phone (${last4}) to confirm:`) !== last4) {
    alert("Not cancelled — phone digits didn't match.");
    return;
  }
  try {
    await Storage.cancel(btn.dataset.id);
    await load(); render();
  } catch (err) { alert("Cancel failed: " + err.message); }
});

/* auto-reopen if unlocked in this session */
if (sessionStorage.getItem("sharpedge_admin_unlocked") === "1") {
  // local mode can auto-open; remote mode always re-asks for the PIN
  if (!CONFIG.useRemoteApi && String(CONFIG.adminPin)) {
    els.pinIn.value = String(CONFIG.adminPin);
    unlock();
  }
}
