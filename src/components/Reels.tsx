import { useRef } from "react";
import { REELS } from "../data";

export default function Reels() {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    const track = trackRef.current;
    if (!track) return;
    const cardWidth = track.querySelector<HTMLElement>(".video-card")?.offsetWidth ?? 180;
    const gap = 14;
    const step = (cardWidth + gap) * 2;
    track.scrollBy({ left: dir === "right" ? step : -step, behavior: "smooth" });
  };

  return (
    <>
      <div className="section-divider" />
      <section id="reels" className="section">
      <p className="mono eyebrow">
        <span style={{ display: "inline-block", width: 24, height: 1, background: "var(--accent)", marginRight: 8, verticalAlign: "middle" }} />
        02 — MOTION
      </p>
      <h2 className="display section-title" style={{ marginBottom: 24 }}>
        REELS / VIDEOS
      </h2>

      <div className="carousel-wrapper">
        <div className="carousel-track reel-track" ref={trackRef}>
          {REELS.map((r) => (
            <div
              className="video-card carousel-reel-card"
              key={r.id}
              style={r.src && !r.src.endsWith(".mp4") ? { backgroundImage: `url(${r.src})` } : undefined}
            >
              {r.src?.endsWith(".mp4") ? (
                <video
                  className="reel-video"
                  src={r.src}
                  muted
                  loop
                  playsInline
                  autoPlay
                  preload="metadata"
                />
              ) : null}
              <div className="card-overlay" />
              <span className="tag mono">{r.label}</span>
              <div className="play-dot">
                <div className="play-triangle" />
              </div>
              <div className="reel-hover-info">
                <span className="mono">{r.label}</span>
                <span className="mono reel-play-label">▶ PLAY</span>
              </div>
            </div>
          ))}
        </div>

        <button
          className="carousel-arrow carousel-arrow-left"
          onClick={() => scroll("left")}
          aria-label="Scroll left"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          className="carousel-arrow carousel-arrow-right"
          onClick={() => scroll("right")}
          aria-label="Scroll right"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
      </div>
      </section>
    </>
  );
}
