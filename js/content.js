/* ============================================================
   content.js — shared site content, rendered on index.html AND
   about.html. Edit portfolio items & reviews here once.
   (Replace placeholder blocks with real photos/videos at launch.)
   ============================================================ */
const CONTENT = {
  work: [
    { title: "Classic Taper Fade", tag: "hair", fill: "fill-hair",    note: "Skin-tight to textured top" },
    { title: "Full Beard Sculpt",  tag: "beard", fill: "fill-beard",  note: "Natural shape, line-up finish" },
    { title: "Glow Facial Result", tag: "skin",  fill: "fill-skin",   note: "After 1 session · visible glow" },
    { title: "Textured Crop",      tag: "hair", fill: "fill-hair",   note: "Low maintenance daily style" },
    { title: "Long Hair Trim",     tag: "hair", fill: "fill-hair",   note: "Layers + split-end removal" },
    { title: "De-Tan, Neck & Face",tag: "skin", fill: "fill-skin",   note: "2 sessions · even tone" },
    { title: "Corporate Clean Cut",tag: "hair", fill: "fill-hair",   note: "Interview-ready look" },
    { title: "Beard + Moustache Set", tag: "beard", fill: "fill-beard", note: "Wax & oil finish" },
  ],

  reviews: [
    { name: "Rahul M.", date: "2 weeks ago", stars: 5, text: "Best haircut in the area. Booked the 45-min slot and literally walked in at my time — zero waiting. The barber understood exactly what I wanted.", photo: "fill-hair", photoLabel: "Fade result — replace with real photo" },
    { name: "Aditya K.", date: "1 month ago", stars: 5, text: "Took the de-tan before my wedding. Results were visible the same day. Hygienic, professional, and the facial is very relaxing.", photo: "fill-skin", photoLabel: "De-tan result — replace with real photo" },
    { name: "Suresh V.", date: "3 weeks ago", stars: 4, text: "Hair + beard combo is worth it. 75 minutes of full attention. Slightly crowded on Saturdays so book early.", photo: null },
    { name: "Karthik P.", date: "5 days ago", stars: 5, text: "The glow facial is a must-try. My skin was glowing for days. Booking slots online is super easy and free.", photo: "fill-skin", photoLabel: "Facial result — replace with real photo" },
    { name: "Vikram S.", date: "2 months ago", stars: 5, text: "Been coming here for 2 years. They remember my style every visit. The hot towel beard finish is elite.", photo: null },
    { name: "Farhan A.", date: "1 week ago", stars: 5, text: "Clean tools, fresh towels every time. My son's first haircut was handled with so much patience. Highly recommend.", photo: "fill-hair", photoLabel: "First haircut — replace with real photo" },
  ],

  videos: [
    { label: "Customer video review — fade (replace: assets/videos/review1.mp4)", src: "https://www.w3schools.com/html/mov_bbb.mp4" },
    { label: "Customer video review — facial (replace: assets/videos/review2.mp4)", src: "https://www.w3schools.com/html/mov_bbb.mp4" },
  ],

  rating: { score: 4.8, count: "240+" },
};
