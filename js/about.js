/* ============================================================
   about.js — renders services, our-work and reviews for
   about.html using the shared CONTENT data in js/content.js.
   ============================================================ */

const pad = (n) => String(n).padStart(2, "0");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function starsHTML(score) {
  let html = "";
  for (let i = 1; i <= 5; i++) html += starIcon(i <= Math.round(score) ? "on" : "off");
  return html;
}

/* ---------- services ---------- */
document.getElementById("servicesGrid").innerHTML = CONFIG.services.map((s) => `
  <div class="service-card">
    <span class="service-icon">${icon(s.icon || "scissors", "lg")}</span>
    <h3>${esc(s.name)}</h3>
    <p class="service-desc">${esc(s.desc)}</p>
    <div class="service-meta">
      <span class="service-time">${icon("clock", "sm")} ${s.duration} min</span>
      <span class="service-price">${esc(s.price)}</span>
    </div>
  </div>`).join("");

/* ---------- our work ---------- */
function renderWork(filter = "all") {
  document.getElementById("workGrid").innerHTML = CONTENT.work
    .filter((w) => filter === "all" || w.tag === filter)
    .map((w) => `
      <figure class="work-card">
        <div class="work-thumb ${w.fill}" title="Replace with real photograph">
          ${icon("camera")}
          <span class="tag">${w.tag === "skin" ? "facial &amp; detan" : w.tag}</span>
        </div>
        <figcaption><span class="wt">${esc(w.title)}</span><small>${esc(w.note)}</small></figcaption>
      </figure>`).join("");
}
renderWork();

document.getElementById("workFilter").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll("#workFilter .chip").forEach((c) => c.classList.toggle("active", c === chip));
  renderWork(chip.dataset.filter);
});

/* ---------- reviews ---------- */
document.getElementById("ratingBig").textContent = CONTENT.rating.score;
document.getElementById("ratingStars").innerHTML = starsHTML(CONTENT.rating.score);
document.getElementById("ratingCount").textContent = `Based on ${CONTENT.rating.count} customer reviews`;

document.getElementById("writtenTitle").innerHTML = `${icon("quote")} Written Reviews`;
document.getElementById("reviewGrid").innerHTML = CONTENT.reviews.map((r) => `
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

document.getElementById("videoTitle").innerHTML = `${icon("video")} Video Reviews`;
document.getElementById("videoGrid").innerHTML = CONTENT.videos.map((v) => `
  <div class="video-card">
    <video controls preload="none">
      <source src="${esc(v.src)}" type="video/mp4" />
      Your browser does not support video playback.
    </video>
    <div class="video-note">${icon("video", "sm")} ${esc(v.label)}</div>
  </div>`).join("");

/* ---------- footer ---------- */
document.getElementById("year").textContent = new Date().getFullYear();
document.getElementById("shopName").textContent = CONFIG.shopName;
document.title = `${CONFIG.shopName} · Services, Work & Reviews`;
