import { useEffect, useRef, useState, useCallback } from "react";
import { SPIRAL_GALLERY_IMAGES } from "../data";

// ─── Config ────────────────────────────────────────────────────────────────────
const VISIBLE = 15;
const HALF    = Math.floor(VISIBLE / 2);   // 7
const IMAGES  = SPIRAL_GALLERY_IMAGES as unknown as { src: string; position: string }[];
const TOTAL   = IMAGES.length;

// ─── Helix geometry — tuned for the 260 × 560 px tornado-box ──────────────────
/** Larger portrait card — image sits smaller inside for a Polaroid-frame look */
const CARD_W = 185;
const CARD_H = 265;
/** Camera perspective */
const PERSPECTIVE = 620;
/**
 * Total arc angle the helix sweeps (radians).
 * 1.15π ≈ 207° gives a clean S-curve: centre → right peak → back left.
 * Negative offsets mirror this to create the full tornado spiral.
 */
const ANGLE_SPAN = Math.PI * 1.15;
/** Horizontal radius of the helix arc (px). Peak x ≈ 130 px < 200 px half-width. */
const SPIRAL_X_R = 130;
/** How deep the arc recedes (px). z = -(1-cosα)×R/2 → 0 at centre, −max at edges. */
const SPIRAL_Z_R = 560;
/** Vertical spacing. ±7×46=±322 px < 340 half-height of the 680 px box. */
const STEP_Y = 46;
/** Maximum Y-axis card rotation (deg) — cards angle into the spiral tangent. */
const ROT_Y_MAX = 42;
/**
 * Pixels of scroll that equal one full card-step.
 * 120 px feels deliberate but responsive.
 */
const SCROLL_PER_STEP = 120;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * Computes the CSS style for a card given its float visual offset from centre.
 * offset = 0   → front/centre card (largest, sharpest, brightest)
 * offset = ±7  → furthest cards (smallest, blurriest, darkest)
 * Accepts float offsets so positions interpolate continuously per-pixel.
 */
function getCardStyle(
  offset: number,
  mouseParallax: { x: number; y: number }
): React.CSSProperties {
  const absOffset = Math.abs(offset);
  const t         = HALF > 0 ? offset / HALF : 0;  // normalised −1 … +1
  const angle     = t * ANGLE_SPAN;                  // helix angle

  // ── Sinusoidal X — creates the S-curve / tornado shape ──────────────────────
  const x = Math.sin(angle) * SPIRAL_X_R
    + mouseParallax.x * Math.max(0, 1 - absOffset / (HALF + 1)) * 0.38;

  // ── Linear Y — vertical stack ────────────────────────────────────────────────
  const y = -offset * STEP_Y
    + mouseParallax.y * Math.max(0, 1 - absOffset / (HALF + 1)) * 0.22;

  // ── Cosine Z — smooth depth recession; 0 at centre, deepest at edges ─────────
  const z = -(1 - Math.cos(angle)) * (SPIRAL_Z_R / 2);

  // ── Y-rotation — cards face the spiral tangent ────────────────────────────────
  const rotY = -Math.sin(angle) * ROT_Y_MAX;

  // ── Z-roll — subtle lean into the spiral ────────────────────────────────────
  const rotZ = t * 6;

  // ── Depth-based focus drop-off ───────────────────────────────────────────────
  const focusFraction = Math.max(0, 1 - absOffset / (HALF + 1));
  const scale      = 0.30 + focusFraction * 0.70;
  const blur       = absOffset * 1.4;                // softer blur — details stay readable
  const opacity    = 0.12 + focusFraction * 0.88;
  const brightness = 0.38 + focusFraction * 0.62;   // 0.38 far → 1.00 centre (moody not invisible)

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
    // No CSS transition — positions are driven frame-by-frame via rAF lerp,
    // so CSS transitions would fight the animation and cause double-easing.
    borderRadius: 10,
    overflow: "hidden",
    background: "#000",          // black fill — no white bleeds through on any image
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
  // ── Continuous float progress ─────────────────────────────────────────────────
  // targetProgressRef  → raw accumulated scroll (updated on every wheel event)
  // currentProgressRef → lerped value chasing target each rAF tick
  // renderProgress     → React state that schedules re-renders
  const targetProgressRef  = useRef(0);
  const currentProgressRef = useRef(0);
  const rafRef             = useRef<number>(0);
  const [renderProgress, setRenderProgress] = useState(0);

  const boxRef    = useRef<HTMLDivElement>(null);
  const insideRef = useRef(false);
  const [mouseParallax, setMouseParallax] = useState({ x: 0, y: 0 });

  // ── rAF lerp loop ─────────────────────────────────────────────────────────────
  // Runs every frame. Closes 9% of remaining distance per tick →
  // ~160 ms settle at 60 fps — fast enough to feel responsive, slow enough to
  // look cinematic. Stops scheduling renders once settled (MIN_DELTA guard).
  useEffect(() => {
    const LERP      = 0.09;
    const MIN_DELTA = 0.0004;

    const tick = () => {
      const target = targetProgressRef.current;
      const cur    = currentProgressRef.current;
      const diff   = target - cur;

      if (Math.abs(diff) > MIN_DELTA) {
        const next = cur + diff * LERP;
        currentProgressRef.current = next;
        setRenderProgress(next);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Wheel handler ─────────────────────────────────────────────────────────────
  // Listener is scoped to the box element, so it only fires over the box —
  // no need for an insideRef guard here.
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta =
      e.deltaMode === 1 ? e.deltaY * 32 :
      e.deltaMode === 2 ? e.deltaY * window.innerHeight * 0.8 :
      e.deltaY;
    targetProgressRef.current += delta / SCROLL_PER_STEP;
  }, []);

  // ── Touch handlers ────────────────────────────────────────────────────────────
  // Same progress logic as wheel — swipe up = advance, swipe down = go back.
  // Rolling Y update on each touchmove gives a per-frame delta (not cumulative),
  // which feels identical to wheel deltaY and feeds the same rAF lerp.
  const touchStartYRef = useRef<number | null>(null);

  const onTouchStart = useCallback((e: TouchEvent) => {
    insideRef.current = true;
    touchStartYRef.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();        // stops page from scrolling while swiping inside box
    e.stopPropagation();
    if (touchStartYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    // positive delta = finger moved up = advance forward through cards
    const deltaY   = touchStartYRef.current - currentY;
    touchStartYRef.current = currentY;   // rolling update → per-frame delta
    targetProgressRef.current += deltaY / (SCROLL_PER_STEP * 0.45);
  }, []);

  const onTouchEnd = useCallback(() => {
    touchStartYRef.current = null;
    insideRef.current = false;
  }, []);

  // ── Single useEffect — register all input events on the box ──────────────────
  // All listeners use { passive: false } so preventDefault() is allowed.
  // touch-action: none; is already set in CSS on .tornado-box.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.addEventListener("wheel",      onWheel,      { passive: false });
    box.addEventListener("touchstart", onTouchStart, { passive: false });
    box.addEventListener("touchmove",  onTouchMove,  { passive: false });
    box.addEventListener("touchend",   onTouchEnd);
    return () => {
      box.removeEventListener("wheel",      onWheel);
      box.removeEventListener("touchstart", onTouchStart);
      box.removeEventListener("touchmove",  onTouchMove);
      box.removeEventListener("touchend",   onTouchEnd);
    };
  }, [onWheel, onTouchStart, onTouchMove, onTouchEnd]);


  // ── Mouse enter / leave ───────────────────────────────────────────────────────
  const onMouseEnter = useCallback(() => { insideRef.current = true; }, []);
  const onMouseLeave = useCallback(() => {
    insideRef.current = false;
    setMouseParallax({ x: 0, y: 0 });
  }, []);

  // ── Global page-scroll sync ───────────────────────────────────────────────────
  // When the user scrolls the PAGE (outside the box), images inside the box
  // move in the same direction at the same pace — like a parallax film strip.
  // When inside the box (insideRef=true) the box-scoped wheel/touch handler
  // drives progress instead, so we skip here to avoid double-counting.
  useEffect(() => {
    let lastScrollY = window.scrollY;

    const onPageScroll = () => {
      if (insideRef.current) return;          // box-scroll takes over when inside
      const currentY = window.scrollY;
      const delta    = currentY - lastScrollY;
      lastScrollY    = currentY;
      // Same pixel→progress conversion as the wheel handler
      targetProgressRef.current += delta / SCROLL_PER_STEP;
    };

    window.addEventListener("scroll", onPageScroll, { passive: true });
    return () => window.removeEventListener("scroll", onPageScroll);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (insideRef.current) return;
      const box = boxRef.current;
      if (!box) return;
      const rect = box.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = (e.clientX - cx) / window.innerWidth;
      const dy   = (e.clientY - cy) / window.innerHeight;
      setMouseParallax({ x: dx * 18, y: dy * 12 });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // ── Build fractional card slots ───────────────────────────────────────────────
  // Wrap renderProgress into [0, TOTAL) for valid image indexing.
  const wrapped   = ((renderProgress % TOTAL) + TOTAL) % TOTAL;
  const baseIndex = Math.floor(wrapped);  // image "home" at frac = 0
  const frac      = wrapped - baseIndex;  // 0–1: fractional step in progress

  /**
   * VISIBLE+2 candidate slots — one extra on each end covers the transition
   * zone so cards appear before they scroll into the visible window.
   * Each slot receives a *float* visualOffset so getCardStyle can interpolate
   * transform/filter/opacity continuously rather than snapping.
   *
   * How it works:
   *   visualOffset = slotIdx − frac
   *   When frac = 0:   visualOffset is integer (stable)
   *   When frac = 0.5: every card is halfway between two integer positions
   *   When frac → 1:   cards approach next integer; at boundary baseIndex++
   *                    and frac resets to 0 — seamless wrap.
   *
   * Image content swaps only at integer boundaries, at which point the
   * outgoing card is already far off-centre (small & dark), so the swap
   * is visually invisible.
   */
  const slots = (
    Array.from({ length: VISIBLE + 2 }, (_, i) => {
      const slotIdx      = i - HALF - 1;       // –HALF–1 … HALF+1
      const visualOffset = slotIdx - frac;      // float offset from visual centre
      if (Math.abs(visualOffset) > HALF + 0.51) return null;
      const imgIndex = mod(baseIndex + slotIdx, TOTAL);
      return { key: slotIdx, visualOffset, imgIndex };
    }).filter(Boolean)
  ) as { key: number; visualOffset: number; imgIndex: number }[];

  // Counter shows whichever image is closest to the visual centre.
  const displayIndex = mod(Math.round(renderProgress), TOTAL);

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
                {slots.map(({ key, visualOffset, imgIndex }) => (
                  <div
                    key={`slot-${key}`}
                    style={getCardStyle(visualOffset, mouseParallax)}
                    aria-hidden={Math.abs(visualOffset) > 0.5}
                  >
                    <img
                      src={IMAGES[imgIndex].src}
                      alt={Math.abs(visualOffset) < 0.5 ? `Photo ${imgIndex + 1}` : ""}
                      draggable={false}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center 25%",
                        // scale(0.88): image smaller than card → dark border frame shows around photo
                        transform: "scale(0.88)",
                        display: "block",
                        userSelect: "none",
                      }}
                      loading="lazy"
                    />
                    {/* Subtle vignette on the card closest to centre */}
                    {Math.abs(visualOffset) < 0.5 && (
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
              {String(displayIndex + 1).padStart(2, "0")} /{" "}
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
