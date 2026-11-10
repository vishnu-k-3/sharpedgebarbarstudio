/* ============================================================
   config.js — Shop settings. EDIT THIS FILE ONLY for handover.
   ============================================================ */
const CONFIG = {
  shopName: "SharpEdge Barber Studio",

  // Opening hours (24h format). Sunday (day 0) is closed.
  openHour: 9,            // 9:00 AM
  closeHour: 20,          // 8:00 PM
  closedDays: [0],        // 0 = Sunday
  slotStepMinutes: 15,    // slots offered every 15 min
  maxDaysAhead: 30,       // booking window
  chairs: 1,              // number of parallel seats/barbers

  // ---- SERVICES ----
  // duration = slot minutes reserved on the calendar (REQUIRED for overlap checks)
  services: [
    { id: "haircut",      name: "Hair Cut",            emoji: "✂️", duration: 45, price: "₹199",  desc: "Consultation, cut, wash & style." },
    { id: "hairbeard",    name: "Hair + Beard",        emoji: "🧔", duration: 75, price: "₹349",  desc: "Full hair cut plus beard shape, line-up & wash." },
    { id: "beard",        name: "Beard Trim & Shape",  emoji: "🪒", duration: 30, price: "₹149",  desc: "Beard sculpting, line-up and hot towel finish." },
    { id: "facial",       name: "Facial (Glow)",       emoji: "✨", duration: 60, price: "₹499",  desc: "Clean-up, massage & glow mask for men." },
    { id: "detan",        name: "De-Tan (Face/Neck)",  emoji: "🌞", duration: 45, price: "₹399",  desc: "Removes sun tan & dullness, instant brightness." },
    { id: "cleanup",      name: "Face Clean-Up",       emoji: "🧖", duration: 30, price: "₹199",  desc: "Quick deep clean for busy days." },
  ],

  phone: "+91 98765 43210",        // << replace with real number
  address: "12, Main Street, MG Road", // << replace with real address

  // ---- STORAGE MODE ----
  // false = demo mode, bookings stay in this browser only.
  // true  = live shared calendar. apiBase options:
  //   "http://localhost:3000/api" → local Docker backend (backend/ folder)
  //   "/api"                      → hosted on Vercel (api/ folder + free Supabase DB)
  useRemoteApi: false,
  apiBase: "http://localhost:3000/api",

  // ---- ADMIN PAGE PIN (owner view) ----
  // Change this before going live! In remote mode it must match the
  // ADMIN_PIN environment variable set on the server/Vercel.
  adminPin: "2468",
};
