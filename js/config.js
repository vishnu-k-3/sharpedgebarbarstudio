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
  // icon = key from js/icons.js (line icons, not emojis)
  services: [
    { id: "haircut",      name: "Hair Cut",            icon: "scissors",  duration: 45, price: "₹199",  desc: "Consultation, cut, wash & style." },
    { id: "hairbeard",    name: "Hair + Beard",        icon: "comb",      duration: 75, price: "₹349",  desc: "Full hair cut plus beard shape, line-up & wash." },
    { id: "beard",        name: "Beard Trim & Shape",  icon: "comb",      duration: 30, price: "₹149",  desc: "Beard sculpting, line-up and hot towel finish." },
    { id: "facial",       name: "Facial (Glow)",       icon: "sparkles",  duration: 60, price: "₹499",  desc: "Clean-up, massage & glow mask for men." },
    { id: "detan",        name: "De-Tan (Face/Neck)",  icon: "sun",       duration: 45, price: "₹399",  desc: "Removes sun tan & dullness, instant brightness." },
    { id: "cleanup",      name: "Face Clean-Up",       icon: "droplet",   duration: 30, price: "₹199",  desc: "Quick deep clean for busy days." },
  ],

  phone: "+91 98765 43210",        // << replace with real number
  address: "Cherupunkal, Pala, Kottayam, Kerala – 686572",

  // exact pin on the map (approx. Cherpunkal town — verify & fine-tune)
  coordinates: { lat: 9.67011, lon: 76.70425 },
  // one-tap directions link (opens Google Maps)
  mapsDirections: "https://www.google.com/maps/search/?api=1&query=Cherupunkal%2C%20Pala%2C%20Kottayam%2C%20Kerala%20686572",

  // ---- STORAGE MODE ----
  // false = demo mode, bookings stay in this browser only.
  // true  = live shared calendar. apiBase options:
  //   "http://localhost:3000/api" → local Docker backend (backend/ folder)
  //   "/api"                      → hosted on Vercel (api/ folder + free Supabase DB)
  useRemoteApi: true,
  apiBase: "/api",

  // ---- ADMIN PAGE PIN (owner view) ----
  // Change this before going live! In remote mode it must match the
  // ADMIN_PIN environment variable set on the server/Vercel.
  adminPin: "9501",
};
