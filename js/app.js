/* ============================================================
   app.js — UI + booking engine (slot calendar, overlap checks)
   Elegant line-icon UI · resets itself after every booking.
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

/* ---------- Header nav ---------- */
const nav = $("#nav"), navToggle = $("#navToggle");
navToggle.innerHTML = icon("menu", "ico-menu") + icon("times", "ico-x");
navToggle.addEventListener("click", () => {
  nav.classList.toggle("open");
  navToggle.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(nav.classList.contains("open")));
});
nav.addEventListener("click", (e) => {
  if (e.target.tagName === "A") { nav.classList.remove("open"); navToggle.classList.remove("open"); }
});
$("#year").textContent = new Date().getFullYear();

/* hero contact lines / badges use inline icons */
document.querySelectorAll("[data-icon]").forEach((el) => { el.innerHTML = icon(el.dataset.icon, "sm"); });

/* live clock in hero */
(function tick() {
  const el = $("#heroClock");
  if (el) el.textContent = fmt12(`${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`);
  setTimeout(tick, 30000);
})();

/* ---------- Stars ---------- */
function starsHTML(score, tiny = false) {
  const full = Math.floor(score);
  const frac = score - full;
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += starIcon(i <= Math.round(score) ? "on" : "off");
  }
  return html;
}

/* ---------- Services ---------- */
function renderServices() {
  $("#servicesGrid").innerHTML = CONFIG.services.map((s) => `
    <div class="service-card">
      <span class="service-icon">${icon(s.icon || "scissors", "lg")}</span>
      <h3>${esc(s.name)}</h3>
      <p class="service-desc">${esc(s.desc)}</p>
      <div class="service-meta">
        <span class="service-time">${icon("clock", "sm")} ${s.duration} min</span>
        <span class="service-price">${esc(s.price)}</span>
      </div>
    </div>`).join("");

  $("#serviceChips").innerHTML = CONFIG.services.map((s) => `
    <button class="chip" data-id="${s.id}">
      ${icon(s.icon || "scissors", "sm")} ${esc(s.name)}
      <small>${s.duration} min</small>
    </button>`).join("");
}

$("#serviceChips").addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  state.service = CONFIG.services.find((s) => s.id === btn.dataset.id);
  resetSteps(true);
  document.querySelectorAll("#serviceChips .chip").forEach((c) => c.classList.toggle("active", c === btn));
  renderDatePicker();
});

/* ---------- Dates ---------- */
function isOpenDay(d) { return !CONFIG.closedDays.includes(d.getDay()); }

function renderDatePicker() {
  const row = $("#dateRow");
  if (!state.service) {
    row.innerHTML = `<p class="slot-status">Choose a service above to see dates.</p>`;
    return;
  }
  const today = new Date();
  let html = "";
  for (let i = 0; i < CONFIG.maxDaysAhead; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    if (!isOpenDay(d)) continue;
    const short = i === 0 ? "Today" : i === 1 ? "Tmrw" : dayNames[d.getDay()];
    html += `<button class="chip date-chip" data-date="${iso(d)}"><strong>${short}</strong><span>${d.getDate()} ${monNames[d.getMonth()]}</span></button>`;
  }
  row.innerHTML = html;
}

$("#dateRow").addEventListener("click", (e) => {
  const btn = e.target.closest(".date-chip");
  if (!btn) return;
  state.date = btn.dataset.date;
  state.time = null;
  state.avail = [];
  document.querySelectorAll("#dateRow .date-chip").forEach((c) => c.classList.toggle("active", c === btn));
  renderSlots();
  updateSummary(false);
});

/* ---------- Slots (overlap engine) ---------- */
function overlapsAny(startMin, endMin, intervals) {
  return intervals.some((iv) => startMin < toMin(iv.end) && toMin(iv.start) < endMin);
}

async function renderSlots() {
  const grid = $("#slotGrid"), status = $("#slotStatus");
  if (!state.service || !state.date) {
    status.textContent = "Select a date to see available times.";
    grid.innerHTML = "";
    return;
  }

  status.textContent = "Checking live availability…";
  let avail;
  try { avail = await Storage.getAvailability(state.date); }
  catch (err) { status.textContent = `Couldn't load availability: ${err.message}`; return; }
  state.avail = avail;
  status.textContent = "Tap one of the free times · struck-out = already booked";

  const isToday = iso(new Date()) === state.date;
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

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

/* ---------- Summary ---------- */
function currentSelection() {
  if (!state.service) return null;
  const s = state.service;
  const end = state.time ? toHHMM(toMin(state.time) + s.duration) : null;
  return { service: s, date: state.date, start: state.time, end };
}

function updateSummary(preserve = true) {
  const box = $("#selectionSummary"), btn = $("#bookBtn");
  const sel = currentSelection();
  if (!preserve || !sel || !sel.date || !sel.start) {
    if (!preserve) { box.textContent = "No slot selected yet."; box.classList.remove("ok"); btn.disabled = true; return; }
  }
  if (!sel || !sel.date || !sel.start) {
    box.textContent = "No slot selected yet."; box.classList.remove("ok"); btn.disabled = true; return;
  }
  const [yy, mm, dd] = sel.date.split("-").map(Number);
  const nice = `${dayNames[new Date(yy, mm - 1, dd).getDay()]}, ${dd} ${monNames[mm - 1]} ${yy}`;
  box.innerHTML = `<b>${esc(sel.service.name)}</b> (${sel.service.duration} min)<br>
    ${nice} · ${fmt12(sel.start)} – ${fmt12(sel.end)}<br>
    Pay ${esc(sel.service.price)} at the shop — booking is free.`;
  box.classList.add("ok");
  btn.disabled = false;
}

function resetSteps(keepService = false) {
  if (!keepService) state.service = null;
  state.date = null; state.time = null; state.avail = [];
  document.querySelectorAll("#dateRow .chip").forEach((c) => c.classList.remove("active"));
  $("#slotStatus").textContent = "Select a date to see available times.";
  $("#slotGrid").innerHTML = "";
  updateSummary(false);
}

/* full reset — used after each confirmed booking */
function resetBookingUI() {
  state.service = null; state.date = null; state.time = null; state.avail = [];
  document.querySelectorAll("#serviceChips .chip").forEach((c) => c.classList.remove("active"));
  document.querySelectorAll("#dateRow").forEach((r) => (r.innerHTML = ""));
  $("#dateRow").innerHTML = `<p class="slot-status">Choose a service above to see dates.</p>`;
  $("#slotStatus").textContent = "Select a service to begin.";
  $("#slotGrid").innerHTML = "";
  $("#bookingForm").reset();
  updateSummary(false);
}

/* ---------- Submit ---------- */
$("#bookingForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const sel = currentSelection();
  if (!sel || !sel.start) return;

  const name = $("#custName").value.trim();
  const phone = $("#custPhone").value.trim();
  if (!name || !/^\d{10}$/.test(phone)) { alert("Please enter your name and a valid 10-digit mobile number."); return; }

  const b = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: sel.date, start: sel.start, end: sel.end,
    serviceId: sel.service.id, serviceName: sel.service.name,
    duration: sel.service.duration, price: sel.service.price,
    name, phone, status: "confirmed", createdAt: new Date().toISOString(),
  };

  // final re-check
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
    resetBookingUI();
    showConfirm(b);
    updateSummary(false);
  } catch (err) {
    alert(err.message);
  } finally {
    $("#bookBtn").disabled = false;
  }
});

function showConfirm(b) {
  const [yy, mm, dd] = b.date.split("-").map(Number);
  $("#modalIcon").innerHTML = icon("check");
  $("#modalBody").innerHTML = `
    Service: <b>${esc(b.serviceName)}</b> (${b.duration} min)<br>
    Date: <b>${dd} ${monNames[mm - 1]} ${yy}</b><br>
    Time: <b>${fmt12(b.start)} – ${fmt12(b.end)}</b><br>
    Name: ${esc(b.name)} · ${esc(b.phone)}<br>
    Pay <b>${esc(b.price)}</b> at the shop.<br>
    Booking ID: <b>${esc(b.id.slice(-6).toUpperCase())}</b>
    <br><br><small>Keep this — it also appears under “My Bookings” on this device.</small>`;
  $("#modal").hidden = false;
}
$("#modalClose").addEventListener("click", () => {
  $("#modal").hidden = true;
  resetBookingUI();   // ← requested: everything resets after a booking
});

/* ---------- My bookings (this device) ---------- */
async function renderMyBookings() {
  let mine;
  try { mine = await Storage.getMine(); } catch { mine = []; }
  const list = $("#myBookingsList");
  mine = mine
    .filter((b) => b.status !== "cancelled")
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  if (!mine.length) {
    list.innerHTML = `<p class="empty-note">No bookings yet — make one above and it appears here instantly.</p>`;
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
      updateSummary(false);
    } catch (err) { alert("Could not cancel: " + err.message); }
  }
});
$("#refreshBookings").addEventListener("click", renderMyBookings);

/* ---------- Our work ---------- */
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
      <div class="work-thumb ${w.fill}" title="Replace with real photograph">
        ${icon("camera")}
        <span class="tag">${w.tag === "skin" ? "facial &amp; detan" : w.tag}</span>
      </div>
      <figcaption><span class="wt">${esc(w.title)}</span><small>${esc(w.note)}</small></figcaption>
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
  { name: "Rahul M.", date: "2 weeks ago", stars: 5, text: "Best haircut in the area. Booked the 45-min slot and literally walked in at my time — zero waiting. The barber understood exactly what I wanted.", photo: "fill-hair", photoLabel: "Fade result — replace with real photo" },
  { name: "Aditya K.", date: "1 month ago", stars: 5, text: "Took the de-tan before my wedding. Results were visible the same day. Hygienic, professional, and the facial is very relaxing.", photo: "fill-skin", photoLabel: "De-tan result — replace with real photo" },
  { name: "Suresh V.", date: "3 weeks ago", stars: 4, text: "Hair + beard combo is worth it. 75 minutes of full attention. Slightly crowded on Saturdays so book early.", photo: null },
  { name: "Karthik P.", date: "5 days ago", stars: 5, text: "The glow facial is a must-try. My skin was glowing for days. Booking slots online is super easy and free.", photo: "fill-skin", photoLabel: "Facial result — replace with real photo" },
  { name: "Vikram S.", date: "2 months ago", stars: 5, text: "Been coming here for 2 years. They remember my style every visit. The hot towel beard finish is elite.", photo: null },
  { name: "Farhan A.", date: "1 week ago", stars: 5, text: "Clean tools, fresh towels every time. My son's first haircut was handled with so much patience. Highly recommend.", photo: "fill-hair", photoLabel: "First haircut — replace with real photo" },
];

function renderReviews() {
  $("#ratingStars").innerHTML = starsHTML(4.8);
  $("#writtenTitle").innerHTML = `${icon("quote")} Written Reviews`;
  $("#videoTitle").innerHTML = `${icon("video")} Video Reviews`;

  $("#reviewGrid").innerHTML = REVIEWS.map((r) => `
    <div class="review-card">
      <div class="q">${icon("quote")}</div>
      <div class="review-top">
        <div class="avatar">${esc(r.name[0])}</div>
        <div>
          <div class="review-name">${esc(r.name)} <span class="verified">✓ verified visit</span></div>
          <div class="review-cover">
            <div class="review-stars">${starsHTML(r.stars)}</div>
            <span class="review-date">${esc(r.date)}</span>
          </div>
        </div>
      </div>
      <p class="review-text">${esc(r.text)}</p>
      ${r.photo ? `<div class="review-photo ${r.photo}"><span class="rp-label">${icon("camera")}${esc(r.photoLabel)}</span></div>` : ""}
    </div>`).join("");
}

const VIDEOS = [
  { label: "Customer video review — fade (replace: assets/videos/review1.mp4)", src: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { label: "Customer video review — facial (replace: assets/videos/review2.mp4)", src: "https://www.w3schools.com/html/mov_bbb.mp4" },
];

function renderVideos() {
  $("#videoGrid").innerHTML = VIDEOS.map((v) => `
    <div class="video-card">
      <video controls preload="none">
        <source src="${esc(v.src)}" type="video/mp4" />
        Your browser does not support video playback.
      </video>
      <div class="video-note">${icon("video", "sm")} ${esc(v.label)}</div>
    </div>`).join("");
}

/* ---------- Contact ---------- */
function renderContact() {
  $("#contactAddr").innerHTML = `${icon("pin")} ${esc(CONFIG.address)}`;
  $("#contactPhone").innerHTML = `${icon("phone")} ${esc(CONFIG.phone)}`;
  const closed = CONFIG.closedDays.map((d) => dayNames[d]).join(" & ");
  $("#contactHours").innerHTML = `${icon("clock")} Mon–Sat · ${CONFIG.openHour % 12 === 0 ? 12 : CONFIG.openHour % 12} AM – ${CONFIG.closeHour % 12 || 12} PM · ${closed} closed`;
}

/* ---------- Init ---------- */
(async function init() {
  configInit();
  renderServices();
  await renderMyBookings();
  renderWork();
  renderReviews();
  renderVideos();
  renderContact();
  updateSummary(false);

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();

function configInit() {
  document.title = `${CONFIG.shopName} – Book Your Slot Online`;
  document.querySelectorAll("meta[name='description']").forEach((m) => (m.content = `${CONFIG.shopName}: online slot booking. Haircut, beard, facial & de-tan. No payment needed.`));
  $(".brand-name") && ($(".brand-name").firstChild.textContent = CONFIG.shopName.split(" ").slice(0, 1).join(" "));
  document.querySelector(".brand-sub").textContent = CONFIG.shopName.split(" ").slice(1).join(" ") || "Barber Studio";
}
