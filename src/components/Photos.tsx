import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORIES, PHOTOS } from "../data";
import type { Category } from "../types";

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({
  photo,
  onClose,
}: {
  photo: { src?: string; label: string; category: string };
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="lightbox-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo: ${photo.label}`}
    >
      <div className="lightbox-box" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close mono" onClick={onClose} aria-label="Close">
          ✕
        </button>
        {photo.src ? (
          <img src={photo.src} alt={photo.label} className="lightbox-img" />
        ) : (
          <div className="lightbox-placeholder mono">{photo.label}</div>
        )}
        <div className="lightbox-meta">
          <span className="mono lightbox-label">{photo.label}</span>
          <span className="mono lightbox-cat">{photo.category}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Centre-Stage Carousel ─────────────────────────────────────────────────────
const THUMBNAIL = "/images/photos/thumbnail.jpg";
const VISIBLE = 2; // cards each side of centre

export default function Photos() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const photos = activeCategory === "All"
    ? PHOTOS
    : PHOTOS.filter((p) => p.category === activeCategory);

  const total = photos.length;

  // reset to first card when category changes
  useEffect(() => { setActiveIdx(0); }, [activeCategory]);

  const next = useCallback(() => {
    setActiveIdx((i) => (i + 1) % total);
  }, [total]);

  const prev = () => setActiveIdx((i) => (i - 1 + total) % total);

  // auto-advance
  useEffect(() => {
    autoRef.current = setInterval(next, 3500);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [next]);

  const pauseAuto = () => { if (autoRef.current) clearInterval(autoRef.current); };
  const resumeAuto = () => { autoRef.current = setInterval(next, 3500); };

  // Compute card positions: centre=0, left=-1,-2, right=1,2
  function getSlot(idx: number) {
    let d = ((idx - activeIdx) % total + total) % total;
    if (d > total / 2) d -= total;
    return d; // -N … 0 … N
  }

  return (
    <section id="photos" className="section">
      {/* Header */}
      <div className="section-head">
        <div>
          <p className="mono eyebrow">
            <span style={{ display: "inline-block", width: 24, height: 1, background: "var(--accent)", marginRight: 8, verticalAlign: "middle" }} />
            01 — STILLS
          </p>
          <h2 className="display section-title">PHOTOS</h2>
        </div>
        <div className="tabs">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`tab-btn mono ${activeCategory === c ? "active" : ""}`}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Stage */}
      <div
        className="stage-wrapper"
        onMouseEnter={pauseAuto}
        onMouseLeave={resumeAuto}
      >
        {/* Arrows */}
        <button className="stage-arrow stage-arrow-left" onClick={prev} aria-label="Previous photo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button className="stage-arrow stage-arrow-right" onClick={next} aria-label="Next photo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>

        {/* Cards */}
        <div className="stage-track">
          {photos.map((photo, idx) => {
            const slot = getSlot(idx);
            const abs = Math.abs(slot);

            if (abs > VISIBLE) return null;

            const isActive = slot === 0;
            const depth = abs * 0.08;
            const xPercent = slot * 52; // horizontal spread %
            const scale = isActive ? 1 : Math.max(0.55, 1 - abs * 0.175);
            const opacity = isActive ? 1 : Math.max(0.35, 1 - abs * 0.28);
            const zIndex = 10 - abs;

            return (
              <div
                key={photo.id}
                className={`stage-card ${isActive ? "stage-card--active" : ""}`}
                style={{
                  transform: `translateX(${xPercent}%) scale(${scale}) perspective(800px) rotateY(${-slot * 10}deg) translateZ(${-depth * 100}px)`,
                  opacity,
                  zIndex,
                }}
                onClick={() => isActive && setLightbox(idx)}
                role={isActive ? "button" : undefined}
                tabIndex={isActive ? 0 : -1}
                onKeyDown={(e) => isActive && e.key === "Enter" && setLightbox(idx)}
                aria-label={isActive ? `Open photo ${photo.label}` : undefined}
              >
                {/* thumbnail image (common bg) */}
                <div
                  className="stage-card-thumb"
                  style={{ backgroundImage: `url(${THUMBNAIL})` }}
                />
                {/* actual photo shown when active, revealed via clip */}
                {isActive && photo.src && (
                  <div
                    className="stage-card-photo"
                    style={{ backgroundImage: `url(${photo.src})` }}
                  />
                )}
                <div className="stage-card-gradient" />
                {!isActive && (
                  <span className="mono stage-card-label">{photo.label}</span>
                )}
                {isActive && (
                  <div className="stage-card-info">
                    <span className="mono stage-card-info-label">{photo.label}</span>
                    <span className="mono stage-card-info-cat">{photo.category}</span>
                    <span className="mono stage-card-info-hint">CLICK TO OPEN</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Dots */}
        <div className="stage-dots" role="tablist" aria-label="Photo navigation">
          {photos.map((p, i) => (
            <button
              key={p.id}
              className={`stage-dot ${i === activeIdx ? "stage-dot--active" : ""}`}
              onClick={() => setActiveIdx(i)}
              aria-label={`Go to photo ${i + 1}`}
              role="tab"
              aria-selected={i === activeIdx}
            />
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <Lightbox
          photo={photos[lightbox]}
          onClose={() => setLightbox(null)}
        />
      )}
    </section>
  );
}
