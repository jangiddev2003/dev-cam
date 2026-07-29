import { useEffect, useRef, useState, useCallback } from "react";
import { SPIRAL_GALLERY_IMAGES } from "../data";

// ─── Config ────────────────────────────────────────────────────────────────────
const VISIBLE = 15;
const HALF    = Math.floor(VISIBLE / 2);   // 7
const IMAGES  = SPIRAL_GALLERY_IMAGES as unknown as { src: string; position: string }[];
const TOTAL   = IMAGES.length;

// ─── Helix geometry — tuned for the 260 × 560 px tornado-box ──────────────────
/** Portrait card dimensions at scale = 1 (centre card) */
const CARD_W = 106;
const CARD_H = 148;
/** Camera perspective */
const PERSPECTIVE = 620;
/**
 * Total arc angle the helix sweeps (radians).
 * 1.15π ≈ 207° gives a clean S-curve: centre → right peak → back left.
 * Negative offsets mirror this to create the full tornado spiral.
 */
const ANGLE_SPAN = Math.PI * 1.15;
/** Horizontal radius of the helix arc (px).
 *  sin peaks at ~1 midway → peak x ≈ 88 px, well inside 130 px half-width. */
const SPIRAL_X_R = 88;
/** How deep the arc recedes (px).
 *  z = -(1 − cos(angle)) × SPIRAL_Z_R/2  →  0 at centre, −max at edges. */
const SPIRAL_Z_R = 560;
/** Vertical spacing between adjacent card centres (px).
 *  ±7 × 38 = ±266 px < 280 px half-height → fits inside the box. */
const STEP_Y = 38;
/** Maximum Y-axis card rotation (deg) — cards angle into the spiral tangent. */
const ROT_Y_MAX = 42;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function getCardStyle(
  offset: number,
  mouseParallax: { x: number; y: number }
): React.CSSProperties {
  const absOffset = Math.abs(offset);
  /** Normalised position along the helix: −1 … 0 … +1 */
  const t = HALF > 0 ? offset / HALF : 0;
  /** Helix angle for this card */
  const angle = t * ANGLE_SPAN;

  // ── Sinusoidal X — creates the S-curve / tornado shape ──────────────────────
  // sin(0)=0 (centre), sin peaks ~mid-arc, wraps back as arc continues.
  const x = Math.sin(angle) * SPIRAL_X_R
    + mouseParallax.x * Math.max(0, 1 - absOffset / (HALF + 1)) * 0.38;

  // ── Linear Y — vertical stack ────────────────────────────────────────────────
  const y = -offset * STEP_Y
    + mouseParallax.y * Math.max(0, 1 - absOffset / (HALF + 1)) * 0.22;

  // ── Cosine Z — cards recede smoothly; 0 at centre, deepest at edges ─────────
  // z = −(1 − cosα) × R/2  →  0 at α=0, −R at α=π, −(1−cosα)×R/2 elsewhere
  const z = -(1 - Math.cos(angle)) * (SPIRAL_Z_R / 2);

  // ── Y-rotation — cards face the spiral tangent (like pages of a fan) ────────
  // cos(angle) gives the tangent direction: +1 at centre → no tilt, ±0 at peak.
  // We use −sin(angle) so the face always turns toward the viewer along the arc.
  const rotY = -Math.sin(angle) * ROT_Y_MAX;

  // ── Z-roll — subtle lean into the spiral ────────────────────────────────────
  const rotZ = t * 6;

  // ── Depth-based focus drop-off ───────────────────────────────────────────────
  const focusFraction = Math.max(0, 1 - absOffset / (HALF + 1));
  const scale      = 0.30 + focusFraction * 0.70;   // 0.30 far → 1.00 centre
  const blur       = absOffset * 1.9;                // px blur per step
  const opacity    = 0.08 + focusFraction * 0.92;   // 0.08 far → 1.00 centre
  const brightness = 0.22 + focusFraction * 0.78;   // 0.22 far → 1.00 centre

  const filterParts: string[] = [];
  if (blur > 0.25) filterParts.push(`blur(${blur.toFixed(1)}px)`);
  filterParts.push(`brightness(${brightness.toFixed(2)})`);

  return {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: CARD_W,
    height: CARD_H,
    marginLeft: -CARD_W / 2,
    marginTop: -CARD_H / 2,
    transform: [
      `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`,
      `translateZ(${z.toFixed(1)}px)`,
      `scale(${scale.toFixed(3)})`,
      `rotateY(${rotY.toFixed(1)}deg)`,
      `rotateZ(${rotZ.toFixed(1)}deg)`,
    ].join(" "),
    filter: filterParts.join(" "),
    opacity,
    willChange: "transform, filter, opacity",
    transition:
      "transform 0.42s cubic-bezier(0.22,1,0.36,1), filter 0.42s ease, opacity 0.42s ease",
    borderRadius: 9,
    overflow: "hidden",
    boxShadow:
      absOffset < 0.5
        ? "0 20px 56px rgba(0,0,0,0.85), 0 4px 14px rgba(0,0,0,0.65)"
        : "0 4px 18px rgba(0,0,0,0.55)",
    zIndex: Math.round(100 - absOffset * 10),
    pointerEvents: offset === 0 ? "auto" : "none",
  };
}


// ─── Component ────────────────────────────────────────────────────────────────
export default function TornadoStream() {
  const [activeIndex, setActiveIndex] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const insideRef = useRef(false);
  const scrollAccRef = useRef(0);
  const [mouseParallax, setMouseParallax] = useState({ x: 0, y: 0 });

  // ── Scroll isolation ────────────────────────────────────────────────────────
  const onWheel = useCallback((e: WheelEvent) => {
    if (!insideRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    // Accumulate scroll delta (normalise between wheel modes)
    const delta = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
    scrollAccRef.current += delta;

    // Snap per 80 px of accumulated scroll — one frame per tick
    const threshold = 80;
    while (Math.abs(scrollAccRef.current) >= threshold) {
      if (scrollAccRef.current > 0) {
        setActiveIndex((i) => mod(i + 1, TOTAL));
        scrollAccRef.current -= threshold;
      } else {
        setActiveIndex((i) => mod(i - 1, TOTAL));
        scrollAccRef.current += threshold;
      }
    }
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    // Must use { passive: false } to allow preventDefault inside the box
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  // ── Mouse enter/leave for scroll isolation ───────────────────────────────────
  const onMouseEnter = useCallback(() => {
    insideRef.current = true;
  }, []);
  const onMouseLeave = useCallback(() => {
    insideRef.current = false;
    setMouseParallax({ x: 0, y: 0 });
  }, []);

  // ── Parallax from cursor outside box ─────────────────────────────────────────
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (insideRef.current) return;
      const box = boxRef.current;
      if (!box) return;
      const rect = box.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / window.innerWidth;
      const dy = (e.clientY - cy) / window.innerHeight;
      setMouseParallax({ x: dx * 18, y: dy * 12 });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // ── Build the visible card list ───────────────────────────────────────────────
  const slots = Array.from({ length: VISIBLE }, (_, i) => {
    const offset = i - HALF; // -HALF … +HALF
    const imgIndex = mod(activeIndex + offset, TOTAL);
    return { offset, imgIndex };
  });

  return (
    <>
      <div className="section-divider" />
      <section id="tornado-stream" className="section tornado-section">
        {/* Section label */}
        <p className="mono eyebrow">
          <span
            style={{
              display: "inline-block",
              width: 24,
              height: 1,
              background: "var(--accent)",
              marginRight: 8,
              verticalAlign: "middle",
            }}
          />
          03 — SPIRAL GALLERY
        </p>
        <h2 className="display section-title" style={{ marginBottom: 32 }}>
          FILM STREAM
        </h2>

        {/* Two-column layout: stream box on left, label on right */}
        <div className="tornado-layout">
          {/* ── The black box ──────────────────────────────────────────────── */}
          <div
            ref={boxRef}
            className="tornado-box"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            role="region"
            aria-label="3D spiral card stream — scroll to browse"
          >
            {/* 3D stage */}
            <div
              className="tornado-stage"
              style={{ perspective: PERSPECTIVE }}
            >
              <div className="tornado-stage-inner">
                {slots.map(({ offset, imgIndex }) => (
                  <div
                    key={`slot-${offset}`}
                    style={getCardStyle(offset, mouseParallax)}
                    aria-hidden={offset !== 0}
                  >
                    <img
                      src={IMAGES[imgIndex].src}
                      alt={offset === 0 ? `Photo ${imgIndex + 1}` : ""}
                      draggable={false}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: IMAGES[imgIndex].position,
                        display: "block",
                        userSelect: "none",
                      }}
                      loading="lazy"
                    />
                    {/* Subtle vignette on centre card */}
                    {offset === 0 && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.35) 100%)",
                          pointerEvents: "none",
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Scroll hint */}
            <div className="tornado-hint mono">SCROLL TO BROWSE</div>

            {/* Index counter */}
            <div className="tornado-counter mono">
              {String(activeIndex + 1).padStart(2, "0")} /{" "}
              {String(TOTAL).padStart(2, "0")}
            </div>
          </div>

          {/* ── Right: description ─────────────────────────────────────────── */}
          <div className="tornado-copy">
            <p className="mono tornado-tag">3D CARD STREAM</p>
            <h3 className="display tornado-headline">
              Every frame<br />in depth.
            </h3>
            <p className="tornado-body">
              A spiral of photographs receding into space. Scroll
              inside the frame to step through the archive — one shot
              at a time — while the rest of the page stays still.
            </p>
            <div className="tornado-meta mono">
              <span>
                <span className="tornado-meta-label">IMAGES</span>
                <span className="tornado-meta-value">{TOTAL}</span>
              </span>
              <span className="tornado-meta-divider" />
              <span>
                <span className="tornado-meta-label">DEPTH</span>
                <span className="tornado-meta-value">3D CSS</span>
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
