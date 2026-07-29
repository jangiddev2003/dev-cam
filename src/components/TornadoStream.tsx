import { useEffect, useRef, useState, useCallback } from "react";
import { SPIRAL_GALLERY_IMAGES } from "../data";

// ─── Config ────────────────────────────────────────────────────────────────────
/** Total cards visible in the stream at once (odd so centre card exists). */
const VISIBLE = 11;
/** Half-window around the centre card. */
const HALF = Math.floor(VISIBLE / 2);
/** How many images we cycle through (infinite loop). */
const IMAGES = SPIRAL_GALLERY_IMAGES as unknown as { src: string; position: string }[];
const TOTAL = IMAGES.length;

// ─── Geometry parameters (all in px relative to the 260 px-wide container) ─────
/** Vertical gap between adjacent card centres (px). */
const STEP_Y = 62;
/** Each step away from centre: how much to push left/right (spiral X offset). */
const STEP_X = 28;
/** Each step away: how much extra Z-translate (depth recession) — negative = away */
const STEP_Z = -48;
/** Rotation in Y per step (deg) — cards turn into the spiral */
const STEP_ROT_Y = 14;
/** Rotation in Z per step (deg) — slight clockwise tilt going upward */
const STEP_ROT_Z = 6;
/** Centre card width in px */
const CARD_W = 130;
/** Centre card height in px */
const CARD_H = 106;
/** Perspective for the 3D stage */
const PERSPECTIVE = 520;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function getCardStyle(
  offset: number,   // -HALF … +HALF (0 = centre card)
  mouseParallax: { x: number; y: number }
): React.CSSProperties {
  const absOffset = Math.abs(offset);

  // ── Spiral X: alternate sides each step, magnitude grows with distance ──────
  // offset=0 → x=0; offset=±1 → x=±STEP_X; offset=±2 → x=∓2*STEP_X etc.
  const sideSign = offset === 0 ? 0 : (Math.abs(offset) % 2 === 1 ? Math.sign(offset) : -Math.sign(offset));
  const x = sideSign * absOffset * STEP_X
    + mouseParallax.x * Math.max(0, 1 - absOffset / (HALF + 1)) * 0.5;

  // ── Y: vertical stack (positive offset → above centre) ─────────────────────
  const y = -offset * STEP_Y
    + mouseParallax.y * Math.max(0, 1 - absOffset / (HALF + 1)) * 0.25;

  // ── Z: recession — further from centre = further from viewer ───────────────
  const z = -absOffset * Math.abs(STEP_Z);

  // ── Rotations — cards tilt into the spiral ─────────────────────────────────
  const rotY = offset * STEP_ROT_Y;
  const rotZ = offset * STEP_ROT_Z;

  // ── Focus drop-off ──────────────────────────────────────────────────────────
  const focusFraction = Math.max(0, 1 - absOffset / (HALF + 1));
  const scale   = 0.4 + focusFraction * 0.6;          // 0.4 far → 1.0 centre
  const blur    = absOffset * 1.6;                      // px blur
  const opacity = 0.15 + focusFraction * 0.85;          // 0.15 far → 1.0 centre

  return {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: CARD_W,
    height: CARD_H,
    marginLeft: -CARD_W / 2,
    marginTop: -CARD_H / 2,
    transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translateZ(${z.toFixed(1)}px) scale(${scale.toFixed(3)}) rotateY(${rotY.toFixed(1)}deg) rotateZ(${rotZ.toFixed(1)}deg)`,
    filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : "none",
    opacity,
    willChange: "transform, filter, opacity",
    transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1), filter 0.4s ease, opacity 0.4s ease",
    borderRadius: 8,
    overflow: "hidden",
    boxShadow:
      absOffset < 0.5
        ? "0 16px 48px rgba(0,0,0,0.75), 0 2px 8px rgba(0,0,0,0.5)"
        : "0 4px 16px rgba(0,0,0,0.5)",
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
