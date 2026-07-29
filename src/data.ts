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
export const SPIRAL_GALLERY_IMAGES = [
  { src: "/images/photos/photo-1.jpg",  position: "center 20%" },
  { src: "/images/photos/photo-2.jpg",  position: "center 20%" },
  { src: "/images/photos/photo-3.jpg",  position: "center 20%" },
  { src: "/images/photos/photo-4.jpg",  position: "center 20%" },
  { src: "/images/photos/photo-5.jpg",  position: "center 20%" },
  { src: "/images/photos/photo-6.jpg",  position: "center 20%" },
  { src: "/images/photos/photo-7.jpg",  position: "center 20%" },
  { src: "/images/photos/photo-8.jpg",  position: "center 20%" },
  { src: "/images/photos/photo-9.jpg",  position: "center 20%" },
  { src: "/images/photos/photo-10.jpg", position: "center 20%" },
  { src: "/images/photos/photo-11.jpg", position: "center 20%" },
  { src: "/images/photos/photo-12.jpg", position: "center 20%" },
  { src: "/images/photos/photo-13.jpg", position: "center 20%" },
  { src: "/images/photos/photo-14.jpg", position: "center 20%" },
  { src: "/images/photos/photo-15.jpg", position: "center 20%" },
  { src: "/images/photos/photo-2.jpg",  position: "center 20%" },
  { src: "/images/photos/photo-4.jpg",  position: "center 20%" },
  { src: "/images/photos/photo-6.jpg",  position: "center 20%" },
  { src: "/images/photos/photo-9.jpg",  position: "center 20%" },
  { src: "/images/photos/photo-13.jpg", position: "center 20%" },
];

export const EDITORIAL_PROJECTS: EditorialProject[] = [
  {
    title: "Quiet\nPortraits.",
    description: "A study in stillness, soft contrast, and the small gestures that make a portrait feel entirely lived in.",
    quote: "The most honest image is often the one that leaves room to breathe.",
    metadata: "PORTRAIT SERIES  /  2025  /  NATURAL LIGHT",
  },
];
