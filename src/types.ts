export type Category = "All" | "Portraits" | "Events" | "Product" | "Street";

export interface StripFrame {
  id: string;
  label: string;
  /** Path under /public, e.g. "/images/strip/img-1.jpg". Empty = placeholder. */
  src?: string;
}

export interface Photo {
  id: string;
  label: string;
  category: Exclude<Category, "All">;
  /** Path under /public, e.g. "/images/photos/photo-1.jpg". Empty = placeholder. */
  src?: string;
}

export interface Reel {
  id: string;
  label: string;
  /** Path under /public, e.g. "/images/reels/reel-1.mp4" (video) or a thumbnail image. */
  src?: string;
}

export interface HeightfieldCard {
  id: string;
  label: string;
  description: string;
  /** Path under /public, e.g. "/images/heightfield/card-1.jpg". Empty = placeholder. */
  src?: string;
}

export interface HireMeForm {
  name: string;
  email: string;
  phone: string;
}
