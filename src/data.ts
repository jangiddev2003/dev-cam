import type { Category, EditorialProject, HeightfieldCard, StripFrame, Photo, Reel } from "./types";

export const SITE = {
  name: "Dev Jangid",
  role: "Photography / Videography / Editing",
  email: "jangiddev2003@gmail.com",
  phone: "6377853569",
  location: "Maharashtra, India",
};

export const CATEGORIES: Category[] = ["All", "Portraits", "Events", "Product", "Street"];

// Top film-strip: 10 slots. Add `src: "/images/strip/img-1.jpg"` once you have real shots.
export const STRIP: StripFrame[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `img-${i + 1}`,
  label: `IMG-${String(i + 1).padStart(2, "0")}`,
}));

// Photos grid — 15 shots. src paths point to /public/images/photos/.
const PHOTO_DATA: Array<{ label: string; category: Exclude<Category, "All">; src: string }> = [
  { label: "IMG 0805",              category: "Street",    src: "/images/photos/photo-1.jpg" },
  { label: "IMG 0870",              category: "Portraits", src: "/images/photos/photo-2.jpg" },
  { label: "IMG 0914",              category: "Events",    src: "/images/photos/photo-3.jpg" },
  { label: "IMG 0929",              category: "Product",   src: "/images/photos/photo-4.jpg" },
  { label: "IMG 1081",              category: "Street",    src: "/images/photos/photo-5.jpg" },
  { label: "IMG 2580",              category: "Portraits", src: "/images/photos/photo-6.jpg" },
  { label: "IMG 3029",              category: "Events",    src: "/images/photos/photo-7.jpg" },
  { label: "IMG 3131",              category: "Product",   src: "/images/photos/photo-8.jpg" },
  { label: "IMG 3805",              category: "Street",    src: "/images/photos/photo-9.jpg" },
  { label: "IMG 4965",              category: "Portraits", src: "/images/photos/photo-10.jpg" },
  { label: "IMG 5514",              category: "Events",    src: "/images/photos/photo-11.jpg" },
  { label: "IMG 20240201",          category: "Product",   src: "/images/photos/photo-12.jpg" },
  { label: "IMG 20251112",          category: "Street",    src: "/images/photos/photo-13.jpg" },
  { label: "IMG 20251123",          category: "Portraits", src: "/images/photos/photo-14.jpg" },
  { label: "IMG 20251124",          category: "Events",    src: "/images/photos/photo-15.jpg" },
];

export const PHOTOS: Photo[] = PHOTO_DATA.map((d, i) => ({
  id: `photo-${i + 1}`,
  ...d,
}));

// Reels grid. Add `src: "/images/reels/reel-1.mp4"` (or a thumbnail) per item.
export const REELS: Reel[] = [
  { id: "reel-1", label: "REEL-01", src: "/images/reels/reel-1.mp4" },
  { id: "reel-2", label: "REEL-02", src: "/images/reels/reel-2.mp4" },
  { id: "reel-3", label: "REEL-03", src: "/images/reels/reel-3.mp4" },
  { id: "reel-4", label: "REEL-04", src: "/images/reels/reel-4.mp4" },
  { id: "reel-5", label: "REEL-05", src: "/images/reels/reel-5.mp4" },
  { id: "reel-6", label: "REEL-06", src: "/images/reels/reel-6.mp4" },
  { id: "reel-7", label: "REEL-07", src: "/images/reels/reel-7.mp4" },
];

export const HEIGHTFIELD_CARDS: HeightfieldCard[] = [
  {
    id: "heightfield-01",
    label: "FRAME 01",
    description: "Carousel seat one — front-facing study on the cylinder.",
  },
  {
    id: "heightfield-02",
    label: "FRAME 02",
    description: "Carousel seat two — soft turn along the arc.",
  },
  {
    id: "heightfield-03",
    label: "FRAME 03",
    description: "Carousel seat three — mid-orbit depth and rotation.",
  },
  {
    id: "heightfield-04",
    label: "FRAME 04",
    description: "Carousel seat four — opposite side of the cylinder.",
  },
  {
    id: "heightfield-05",
    label: "FRAME 05",
    description: "Carousel seat five — returning along the curve.",
  },
  {
    id: "heightfield-06",
    label: "FRAME 06",
    description: "Carousel seat six — near-front approach.",
  },
  {
    id: "heightfield-07",
    label: "FRAME 07",
    description: "Carousel seat seven — closing the seven-image loop.",
  },
];

// Each gallery image is an object so we can carry a per-image `object-position`.
// Default `position` values set to "center 20%"; adjust per-image later.
// Pre-wedding shoot images — 10 unique shots, each used twice to fill 20 carousel slots
const PW = (f: string) => ({ src: `/images/prewedding/${encodeURIComponent(f)}`, position: "center center" });
export const SPIRAL_GALLERY_IMAGES = [
  // PW("WhatsApp Image 2026-07-27 at 2.45.41 PM (1).jpeg"),
  // PW("WhatsApp Image 2026-07-27 at 2.45.41 PM.jpeg"),
  // PW("WhatsApp Image 2026-07-27 at 2.45.42 PM (1).jpeg"),
  // PW("WhatsApp Image 2026-07-27 at 2.45.42 PM (2).jpeg"),
  // PW("WhatsApp Image 2026-07-27 at 2.45.42 PM.jpeg"),
  // PW("WhatsApp Image 2026-07-27 at 2.45.43 PM (1).jpeg"),
  // PW("WhatsApp Image 2026-07-27 at 2.45.43 PM (2).jpeg"),
  // PW("WhatsApp Image 2026-07-27 at 2.45.43 PM.jpeg"),
  // PW("WhatsApp Image 2026-07-27 at 2.45.44 PM (1).jpeg"),
  // PW("WhatsApp Image 2026-07-27 at 2.45.44 PM.jpeg"),
  PW("my_shoe.jpg"),
  PW("new-2.jpg"),
  PW("new-3.jpg"),
  PW("new-4.jpg"),
  PW("new-5.jpg"),
  PW("new-6.jpg"),
  PW("new-7.jpg"),
  PW("new-8.jpg"),
  
  // second pass — carousel loops smoothly with 20 total slots
  // PW("WhatsApp Image 2026-07-27 at 2.45.41 PM (1).jpeg"),
  // PW("WhatsApp Image 2026-07-27 at 2.45.41 PM.jpeg"),
  // PW("WhatsApp Image 2026-07-27 at 2.45.42 PM (1).jpeg"),
  // PW("WhatsApp Image 2026-07-27 at 2.45.42 PM (2).jpeg"),
  // PW("WhatsApp Image 2026-07-27 at 2.45.42 PM.jpeg"),
  // PW("WhatsApp Image 2026-07-27 at 2.45.43 PM (1).jpeg"),
  // PW("WhatsApp Image 2026-07-27 at 2.45.43 PM (2).jpeg"),
  // PW("WhatsApp Image 2026-07-27 at 2.45.43 PM.jpeg"),
  // PW("WhatsApp Image 2026-07-27 at 2.45.44 PM (1).jpeg"),
  // PW("WhatsApp Image 2026-07-27 at 2.45.44 PM.jpeg"),
  PW("my_shoe.jpg"),
  PW("new-2.jpg"),
  PW("new-3.jpg"),
  PW("new-4.jpg"),
  PW("new-5.jpg"),
  PW("new-6.jpg"),
  PW("new-7.jpg"),
  PW("new-8.jpg"),
];

export const EDITORIAL_PROJECTS: EditorialProject[] = [
  {
    title: "HELLO,\nI'M DEV",
    description: "Every frame tells a story.\n\nFrom portraits and travel films to cinematic edits and social content, I create visuals people remember.",
    quote: "PHOTOGRAPHER • VIDEOGRAPHER • EDITOR • CREATOR",
    metadata: "SPECIALIZED IN",
    specializations: ["PORTRAITS", "PRE-WEDDING SHOOT", "TRAVEL", "LIFESTYLE", "COMMERCIAL", "REELS", "COLOR GRADING"],
  },
];
