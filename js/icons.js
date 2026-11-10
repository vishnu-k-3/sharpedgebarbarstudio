/* ============================================================
   icons.js — lightweight line icons (Lucide-style paths).
   Pure inline SVG: no CDN, no childlike emojis, works offline.
   Usage: icon("scissors") → <svg class="ico">…</svg>
   ============================================================ */
const ICONS = {
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>',
  comb: '<path d="M4 8h16v4H4z"/><path d="M6 12v9M10 12v7M14 12v9M18 12v7M7 8V4M12 8V4M17 8V4"/>',
  sparkles: '<path d="m12 3 1.9 5.7 5.8 1.9-5.8 1.9L12 18.2l-1.9-5.7-5.8-1.9 5.8-1.9z"/><path d="m19.5 15 .7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
  droplet: '<path d="M12 2.7s6.5 7 6.5 11.3a6.5 6.5 0 0 1-13 0C5.5 9.7 12 2.7 12 2.7z"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 10.5h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5l3.2 2"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7 13.5 13.5 0 0 0 .6 2.7 2 2 0 0 1-.5 2.1L8.1 9.7a16 16 0 0 0 6 6l1.2-1.1a2 2 0 0 1 2.1-.5 13.5 13.5 0 0 0 2.7.6 2 2 0 0 1 1.9 2.2z"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  star: '<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.5 9.4l6.6-.9z"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.2 2.4 2.4 4.8-5.2"/>',
  quote: '<path d="M10 11H6.5A2.5 2.5 0 0 1 4 8.5V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6.5A4.5 4.5 0 0 1 5.5 16"/><path d="M20 11h-3.5A2.5 2.5 0 0 1 14 8.5V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6.5A4.5 4.5 0 0 1 15.5 16"/>',
  camera: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H8l1.5-2h5L16 6h2.5A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z"/><circle cx="12" cy="13" r="3.5"/>',
  play: '<path d="m8 5.5 10 6.5-10 6.5z"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
  bag: '<path d="M6 8h12l1 12a1.5 1.5 0 0 1-1.5 1.7h-11A1.5 1.5 0 0 1 5 20z"/><path d="M9 10.5V6a3 3 0 0 1 6 0v4.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  times: '<path d="M18 6 6 18M6 6l12 12"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  refresh: '<path d="M20 8a9 9 0 1 0 .5 6"/><path d="M21 3v5h-5"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M15.5 15h2"/>',
};

/** icon("scissors", "lg") → inline svg string */
function icon(name, cls = "") {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    ${ICONS[name] || ICONS.check}</svg>`;
}

/** filled/empty star (for ratings) */
function starIcon(state = "on") {
  return `<svg class="star ${state}" viewBox="0 0 24 24" aria-hidden="true">${ICONS.star}</svg>`;
}
