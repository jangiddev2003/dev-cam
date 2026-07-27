import { scrollToId } from "../utils";

export default function Hero() {
  return (
    <div className="hero-wrapper">
      <div className="hero">
        {/* Left: main copy */}
        <div className="hero-left">
          <div className="hero-eyebrow mono">
            <span className="hero-eyebrow-line" />
            <span style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.14em" }}>
              PHOTOGRAPHY / VIDEOGRAPHY / EDITING
            </span>
          </div>

          <h1 className="display">
            FRAMES THAT
            <br />
            HOLD STILL,
            <br />
            <span style={{ color: "var(--accent)" }}>CUTS THAT MOVE.</span>
          </h1>

          <p className="hero-desc">
            Portraits, events, product and street photography — shot, graded and edited by Dev
            Jangid. A short reel or a still frame, same eye behind both.
          </p>

          <div className="hero-actions">
            <button className="btn btn-accent mono" onClick={() => scrollToId("photos")}>
              View Photos
            </button>
            <button className="btn btn-outline mono" onClick={() => scrollToId("reels") }>
              View Reels
            </button>
          </div>
        </div>

        {/* Right: stat block (desktop only) */}
        <aside className="hero-stats" aria-hidden="true">
          <div>
            <div className="display hero-stat-num">15+</div>
            <div className="mono hero-stat-label">Photo Projects</div>
          </div>
          <div>
            <div className="display hero-stat-num">6</div>
            <div className="mono hero-stat-label">Reel Cuts</div>
          </div>
          <div>
            <div className="display hero-stat-num">5</div>
            <div className="mono hero-stat-label">Specialisms</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
