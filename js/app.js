/* ============================================================
   app.js — UI + booking engine (slot calendar, overlap checks)
   Works in BOTH storage modes (local demo / remote API).
   ============================================================ */

/* ---------- Helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const pad = (n) => String(n).padStart(2, "0");
const toMin = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const fmt12 = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${ampm}`;
};
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- State ---------- */
const state = { service: null, date: null, time: null, avail: [] };

/* ---------- Nav / footer ---------- */
const nav = $("#nav"), navToggle = $("#navToggle");
navToggle.addEventListener("click", () => {
  nav.classList.toggle("open");
  navToggle.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(nav.classList.contains("open")));
});
nav.addEventListener("click", (e) => {
  if (e.target.tagName === "A") { nav.classList.remove("open"); navToggle.classList.remove("open"); }
});
$("#year").textContent = new Date().getFullYear();

/* live clock in hero */
(function tick() {
  const el = $("#heroClock");
  if (el) el.textContent = fmt12(`${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`);
  setTimeout(tick, 30000);
})();

/* ---------- Services ---------- */
function renderServices() {
  $("#servicesGrid").innerHTML = CONFIG.services.map((s) => `
    <div class="service-card">
      <span class="service-emoji">${s.emoji}</span>
      <h3>${esc(s.name)}</h3>
      <p class="service-desc">${esc(s.desc)}</p>
      <div class="service-meta">
        <span class="service-time">🕐 ${s.duration} min slot</span>
        <span class="service-price">${esc(s.price)}</span>
      </div>
    </div>`).join("");

  $("#serviceChips").innerHTML = CONFIG.services.map((s) => `
    <button class="chip" data-id="${s.id}">
      ${s.emoji} ${esc(s.name)}
      <small>${s.duration} min · free booking</small>
    </button>`).join("");
}

/* service + date clicks ( wired ONCE ) */
$("#serviceChips").addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  state.service = CONFIG.services.find((s) => s.id === btn.dataset.id);
  state.time = null;
  document.querySelectorAll("#serviceChips .chip").forEach((c) => c.classList.toggle("active", c === btn));
  renderDatePicker();
});

$("#dateRow").addEventListener("click", (e) => {
  const btn = e.target.closest(".date-chip");
  if (!btn) return;
  state.date = btn.dataset.date;
  state.time = null;
  document.querySelectorAll("#dateRow .date-chip").forEach((c) => c.classList.toggle("active", c === btn));
  renderSlots();
});

/* ---------- Dates ---------- */
function isOpenDay(d) { return !CONFIG.closedDays.includes(d.getDay()); }

function renderDatePicker() {
  const row = $("#dateRow");
  if (!state.service) {
    row.innerHTML = `<p class="slot-status" style="color:#8a9099">⬆️ Pick a service above to see dates.</p>`;
    return;
  }
  const today = new Date();
  let html = "";
  for (let i = 0; i < CONFIG.maxDaysAhead; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    if (!isOpenDay(d)) continue;
    const short = i === 0 ? "Today" : i === 1 ? "Tomorrow" : dayNames[d.getDay()];
    const detail = i < 2 ? `${d.getDate()} ${monNames[d.getMonth()]}` : `${d.getDate()} ${monNames[d.getMonth()]}`;
    html += `<button class="chip date-chip" data-date="${iso(d)}"><strong>${short}</strong><span>${detail}</span></button>`;
  }
  row.innerHTML = html;
}

/* ---------- Slots (overlap engine) ---------- */
function overlapsAny(startMin, endMin, intervals) {
  return intervals.some((iv) => startMin < toMin(iv.end) && toMin(iv.start) < endMin);
}

async function renderSlots() {
  const grid = $("#slotGrid"), status = $("#slotStatus");
  if (!state.service || !state.date) {
    status.textContent = state.service ? "Select a date to see available times." : "Select a service first.";
    grid.innerHTML = "";
    return;
  }

  status.textContent = "Checking live availability…";
  let avail;
  try { avail = await Storage.getAvailability(state.date); }
  catch (err) { status.textContent = `Couldn't load availability: ${err.message}`; return; }
  state.avail = avail;
  status.textContent = "Lit-up = free · struck-out = already booked";

  const [y, m, d] = state.date.split("-").map(Number);
  const isToday = iso(new Date()) === state.date;
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  // soonest free start for THIS service
  const sorted = [...avail].sort((a, b) => toMin(a.start) - toMin(b.start));
  let nextFree = null;
  {
    let cursor = CONFIG.openHour * 60;
    for (const iv of sorted) {
      if (toMin(iv.start) - cursor >= state.service.duration) { nextFree = toHHMM(cursor); break; }
      cursor = Math.max(cursor, toMin(iv.end));
    }
    if (!nextFree && cursor + state.service.duration <= CONFIG.closeHour * 60) nextFree = toHHMM(cursor);
  }
  if (nextFree && nextFree < toHHMM(Math.max(CONFIG.openHour * 60, isToday ? nowMin : 0))) nextFree = null;

  let html = "";
  for (let t = CONFIG.openHour * 60; t + state.service.duration <= CONFIG.closeHour * 60; t += CONFIG.slotStepMinutes) {
    const busy = overlapsAny(t, t + state.service.duration, avail) || (isToday && t < nowMin);
    html += `<button class="slot-btn" data-time="${toHHMM(t)}" ${busy ? "disabled" : ""}>${fmt12(toHHMM(t))}</button>`;
  }
  grid.innerHTML = html;
}

$("#slotGrid").addEventListener("click", (e) => {
  const btn = e.target.closest(".slot-btn");
  if (!btn || btn.disabled) return;
  state.time = btn.dataset.time;
  document.querySelectorAll("#slotGrid .slot-btn").forEach((c) => c.classList.toggle("active", c === btn));
  updateSummary();
});

/* ---------- Summary + submit ---------- */
function currentSelection() {
  if (!state.service) return null;
  const s = state.service;
  const end = state.time ? toHHMM(toMin(state.time) + s.duration) : null;
  return { service: s, date: state.date, start: state.time, end };
}

function updateSummary() {
  const box = $("#selectionSummary"), btn = $("#bookBtn");
  const sel = currentSelection();
  if (!sel || !sel.date || !sel.start) {
    box.textContent = "No slot selected yet.";
    box.classList.remove("ok");
    btn.disabled = true;
    return;
  }
  const [yy, mm, dd] = sel.date.split("-").map(Number);
  const nice = `${dayNames[new Date(yy, mm - 1, dd).getDay()]}, ${dd} ${monNames[mm - 1]} ${yy}`;
  box.innerHTML = `✅ <b>${esc(sel.service.name)}</b> (${sel.service.duration} min)<br>
    📅 ${nice} · 🕐 ${fmt12(sel.start)} → ${fmt12(sel.end)}<br>
    💳 Pay ${esc(sel.service.price)} at the shop — booking is FREE.`;
  box.classList.add("ok");
  btn.disabled = false;
}

$("#bookingForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const sel = currentSelection();
  if (!sel || !sel.start) return;

  const name = $("#custName").value.trim();
  const phone = $("#custPhone").value.trim();
  if (!name || !/^\d{10}$/.test(phone)) { alert("Please enter your name and a valid 10-digit phone number."); return; }

  const b = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: sel.date, start: sel.start, end: sel.end,
    serviceId: sel.service.id, serviceName: sel.service.name,
    duration: sel.service.duration, price: sel.service.price,
    name, phone, status: "confirmed", createdAt: new Date().toISOString(),
  };

  // final re-check (in case this screen was open a while)
  if (overlapsAny(toMin(b.start), toMin(b.end), state.avail || [])) {
    alert("Sorry, this slot was just booked. Please choose another time.");
    await renderSlots(); return;
  }

  $("#bookBtn").disabled = true;
  try {
    const saved = await Storage.add(b);
    b.id = saved.id || b.id;
    state.time = null;
    await renderSlots();
    await renderMyBookings();
    updateSummary();
    showConfirm(b);
  } catch (err) {
    alert("Could not save booking: " + err.message);
  } finally {
    $("#bookBtn").disabled = false;
  }
});

function showConfirm(b) {
  const [yy, mm, dd] = b.date.split("-").map(Number);
  $("#modalBody").innerHTML = `
    🧔 Service: <b>${esc(b.serviceName)}</b> (${b.duration} min)<br>
    📅 Date: <b>${dd} ${monNames[mm - 1]} ${yy}</b><br>
    🕐 Time: <b>${fmt12(b.start)} → ${fmt12(b.end)}</b><br>
    👤 Name: ${esc(b.name)}<br>
    📱 Phone: ${esc(b.phone)}<br>
    💳 Pay <b>${esc(b.price)}</b> at the shop.<br>
    🔖 Booking ID: <b>${esc(b.id.slice(-6).toUpperCase())}</b>
    <br><br><small>💡 Screenshot this or keep it in “My Bookings” below.</small>`;
  $("#modal").hidden = false;
}
$("#modalClose").addEventListener("click", () => { $("#modal").hidden = true; });

/* ---------- My bookings (this device) ---------- */
async function renderMyBookings() {
  let mine;
  try { mine = await Storage.getMine(); } catch { mine = []; }
  const list = $("#myBookingsList");
  mine = mine
    .filter((b) => b.status !== "cancelled")
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  if (!mine.length) {
    list.innerHTML = `<p class="empty-note">No bookings yet on this device. Make one above — it appears here instantly. 👆</p>`;
    return;
  }
  list.innerHTML = mine.map((b) => {
    const [yy, mm, dd] = b.date.split("-").map(Number);
    return `<div class="booking-item">
      <div><b>${fmt12(b.start)}</b> · ${fmt12(b.end)}<br>${dd} ${monNames[mm - 1]} ${yy} · ${esc(b.serviceName)}</div>
      <div>${esc(b.name)} · ${esc(b.price)}<br>
        <button class="booking-cancel" data-id="${b.id}">Cancel</button></div>
    </div>`;
  }).join("");
}

$("#myBookingsList").addEventListener("click", async (e) => {
  const btn = e.target.closest(".booking-cancel");
  if (!btn) return;
  if (confirm("Cancel this booking? The slot becomes free for others.")) {
    try {
      await Storage.cancel(btn.dataset.id);
      await renderSlots();
      await renderMyBookings();
      updateSummary();
    } catch (err) { alert("Could not cancel: " + err.message); }
  }
});
$("#refreshBookings").addEventListener("click", renderMyBookings);

/* ---------- Our work (portfolio / previous projects) ---------- */
const WORK_ITEMS = [
  { title: "Classic Taper Fade", tag: "hair", fill: "fill-hair",    note: "Skin-tight to textured top" },
  { title: "Full Beard Sculpt",  tag: "beard", fill: "fill-beard",  note: "Natural shape, line-up finish" },
  { title: "Glow Facial Result", tag: "skin",  fill: "fill-skin",   note: "After 1 session · visible glow" },
  { title: "Textured Crop",      tag: "hair", fill: "fill-hair",   note: "Low maintenance daily style" },
  { title: "Long Hair Trim",     tag: "hair", fill: "fill-hair",   note: "Layers + split-end removal" },
  { title: "De-Tan, Neck & Face",tag: "skin", fill: "fill-skin",   note: "2 sessions · even tone" },
  { title: "Corporate Clean Cut",tag: "hair", fill: "fill-hair",   note: "Interview-ready look" },
  { title: "Beard + Moustache Set", tag: "beard", fill: "fill-beard", note: "Wax & oil finish" },
];

function renderWork(filter = "all") {
  const items = WORK_ITEMS.filter((w) => filter === "all" || w.tag === filter);
  $("#workGrid").innerHTML = items.map((w) => `
    <figure class="work-card">
      <div class="work-thumb ${w.fill}" title="Replace with real photo">
        <span style="font-size:2.2rem">📷</span>
        <span class="tag">${w.tag === "skin" ? "facial & detan" : w.tag}</span>
      </div>
      <figcaption>${esc(w.title)}<small>${esc(w.note)}</small></figcaption>
    </figure>`).join("");
}
$("#workFilter").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll("#workFilter .chip").forEach((c) => c.classList.toggle("active", c === chip));
  renderWork(chip.dataset.filter);
});

/* ---------- Reviews ---------- */
const REVIEWS = [
  { name: "Rahul M.", date: "2 weeks ago", stars: 5, text: "Best haircut in the area. Booked the 45-min slot and literally walked in at my time — zero waiting. Barber understood exactly what I wanted.", photo: "fill-hair", photoLabel: "📸 Fade result (replace with real customer photo)" },
  { name: "Aditya K.", date: "1 month ago", stars: 5, text: "Took the de-tan before my wedding. Results were visible the same day. Hygienic, professional, and the facial is very relaxing.", photo: "fill-skin", photoLabel: "📸 De-tan result (replace with real customer photo)" },
  { name: "Suresh V.", date: "3 weeks ago", stars: 4, text: "Hair + beard combo is worth it. 75 minutes of full attention. Slightly crowded on Saturdays so book early.", photo: null },
  { name: "Karthik P.", date: "5 days ago", stars: 5, text: "The glow facial is a must-try. My skin was glowing for days. Booking slots online is super easy and free.", photo: "fill-skin", photoLabel: "📸 Facial result (replace with real customer photo)" },
  { name: "Vikram S.", date: "2 months ago", stars: 5, text: "Been coming here for 2 years. They remember my style every visit. The hot towel beard finish is elite.", photo: null },
  { name: "Farhan A.", date: "1 week ago", stars: 5, text: "Clean tools, fresh towels every time. My son's first haircut was handled with so much patience. Highly recommend.", photo: "fill-hair", photoLabel: "📸 First haircut (replace with real customer photo)" },
];

function renderReviews() {
  $("#reviewGrid").innerHTML = REVIEWS.map((r) => `
    <div class="review-card">
      <div class="review-top">
        <div class="avatar">${esc(r.name[0])}</div>
        <div>
          <div class="review-name">${esc(r.name)} <span class="verified">✔ verified visit</span></div>
          <div class="review-stars">${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)}</div>
          <div class="review-date">${esc(r.date)}</div>
        </div>
      </div>
      <p class="review-text">${esc(r.text)}</p>
      ${r.photo ? `<div class="review-photo ${r.photo}">${esc(r.photoLabel)}</div>` : ""}
    </div>`).join("");
}

const VIDEOS = [
  { label: "Customer video review — fade (replace file: assets/videos/review1.mp4)", src: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { label: "Customer video review — facial (replace file: assets/videos/review2.mp4)", src: "https://www.w3schools.com/html/mov_bbb.mp4" },
];

function renderVideos() {
  $("#videoGrid").innerHTML = VIDEOS.map((v) => `
    <div class="video-card">
      <video controls preload="none" poster="">
        <source src="${esc(v.src)}" type="video/mp4" />
        Your browser does not support video playback.
      </video>
      <div class="video-note">🎥 ${esc(v.label)}</div>
    </div>`).join("");
}

/* ---------- Init ---------- */
(async function init() {
  configInit();
  renderServices();
  await renderMyBookings();
  renderWork();
  renderReviews();
  renderVideos();

  // PWA (service worker) — only when served over http/https
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();

function configInit() {
  document.title = `${CONFIG.shopName} – Book Your Slot Online`;
  document.querySelectorAll("meta[name='description']").forEach((m) => (m.content = `${CONFIG.shopName}: online slot booking. Haircut, beard, facial & de-tan. No payment needed.`));
  $(".brand-name").firstChild.textContent = CONFIG.shopName.split(" ").slice(0, 1).join(" ") + " ";
  document.querySelector(".brand-sub").textContent = CONFIG.shopName.split(" ").slice(1).join(" ") || "Barber Studio";
  document.querySelectorAll(".contact-line")[0].textContent = `📍 ${CONFIG.address}`;
  document.querySelectorAll(".contact-line")[1].textContent = `📞 ${CONFIG.phone}`;
}
