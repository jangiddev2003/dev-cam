import type { Category, HeightfieldCard, StripFrame, Photo, Reel } from "./types";

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
  { label: "BLACK BEACH",   category: "Street",    src: "/images/photos/photo-1.jpg" },
  { label: "AXE MAN",       category: "Portraits", src: "/images/photos/photo-2.jpg" },
  { label: "CITY RAIN",     category: "Street",    src: "/images/photos/photo-3.jpg" },
  { label: "SHADOW FACE",   category: "Portraits", src: "/images/photos/photo-4.jpg" },
  { label: "RIDGE HIKER",   category: "Street",    src: "/images/photos/photo-5.jpg" },
  { label: "FESTIVAL",      category: "Events",    src: "/images/photos/photo-6.jpg" },
  { label: "NOIR SCENT",    category: "Product",   src: "/images/photos/photo-7.jpg" },
  { label: "MISTY PINES",   category: "Street",    src: "/images/photos/photo-8.jpg" },
  { label: "ELDER",         category: "Portraits", src: "/images/photos/photo-9.jpg" },
  { label: "DUNE AERIAL",   category: "Street",    src: "/images/photos/photo-10.jpg" },
  { label: "BLUE DEEP",     category: "Street",    src: "/images/photos/photo-11.jpg" },
  { label: "LAST LIGHT",    category: "Events",    src: "/images/photos/photo-12.jpg" },
  { label: "SMOKE",         category: "Portraits", src: "/images/photos/photo-13.jpg" },
  { label: "RUINS",         category: "Street",    src: "/images/photos/photo-14.jpg" },
  { label: "MONSOON JOY",   category: "Street",    src: "/images/photos/photo-15.jpg" },
];

export const PHOTOS: Photo[] = PHOTO_DATA.map((d, i) => ({
  id: `photo-${i + 1}`,
  ...d,
}));

// Reels grid. Add `src: "/images/reels/reel-1.mp4"` (or a thumbnail) per item.
export const REELS: Reel[] = Array.from({ length: 6 }).map((_, i) => ({
  id: `reel-${i + 1}`,
  label: `REEL-${String(i + 1).padStart(2, "0")}`,
}));

export const HEIGHTFIELD_CARDS: HeightfieldCard[] = [
  {
    id: "heightfield-shells",
    label: "SHELLS",
    description: "Curved plates, soft highlights, and pearly texture shifts across a slow morph.",
  },
  {
    id: "heightfield-abalone",
    label: "ABALONE",
    description: "Iridescent layers with ocean-tone color drift and a wet reflective finish.",
  },
  {
    id: "heightfield-clouds",
    label: "CLOUDS",
    description: "Billowing forms, diffused edges, and a lifted sky-lit heightfield feel.",
  },
  {
    id: "heightfield-tide",
    label: "TIDE",
    description: "A spare slot for your future image set, kept in the carousel for drag depth.",
  },
  {
    id: "heightfield-opal",
    label: "OPAL",
    description: "A final placeholder for shimmering card rotation and layered card spacing.",
  },
];
