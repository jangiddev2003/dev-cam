import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Album data ───────────────────────────────────────────────────────────────
const ALBUMS = [
  {
    title: "Golden Hour",   subtitle: "Pre-Wedding · 2026",
    image: "/images/prewedding/WhatsApp%20Image%202026-07-27%20at%202.45.41%20PM%20(1).jpeg",
    bg: "#162B22", accent: "#52C497",
    moments: ["The sun dipped low", "Golden light on her face", "Walking into forever", "No words needed", "Just the two of them"],
  },
  {
    title: "Quiet Moment",  subtitle: "Pre-Wedding · 2026",
    image: "/images/prewedding/WhatsApp%20Image%202026-07-27%20at%202.45.41%20PM.jpeg",
    bg: "#1E1630", accent: "#9B72E0",
    moments: ["Before the world woke up", "A stillness between breaths", "Eyes that speak volumes", "Hidden in plain sight", "Ours alone"],
  },
  {
    title: "Together",      subtitle: "Pre-Wedding · 2026",
    image: "/images/prewedding/WhatsApp%20Image%202026-07-27%20at%202.45.42%20PM%20(1).jpeg",
    bg: "#2A1414", accent: "#E07070",
    moments: ["Side by side", "Matching steps", "Where one ends the other begins", "Two stories, one frame", "Always closer"],
  },
  {
    title: "In Between",    subtitle: "Pre-Wedding · 2026",
    image: "/images/prewedding/WhatsApp%20Image%202026-07-27%20at%202.45.42%20PM%20(2).jpeg",
    bg: "#121E2A", accent: "#6AAEE0",
    moments: ["The pause before a laugh", "Mid-sentence magic", "Candid and free", "Unscripted love", "The real moments"],
  },
  {
    title: "Candid Love",   subtitle: "Pre-Wedding · 2026",
    image: "/images/prewedding/WhatsApp%20Image%202026-07-27%20at%202.45.42%20PM.jpeg",
    bg: "#122A12", accent: "#6AE06A",
    moments: ["Unposed, unperfect, perfect", "Caught off guard", "That laugh again", "She didn't know", "Neither did he"],
  },
  {
    title: "Soft Light",    subtitle: "Pre-Wedding · 2026",
    image: "/images/prewedding/WhatsApp%20Image%202026-07-27%20at%202.45.43%20PM%20(1).jpeg",
    bg: "#2A2010", accent: "#E0B86A",
    moments: ["Window light, no filter", "The gentlest hour", "Warmth you can feel", "Slow and unhurried", "Bathed in amber"],
  },
  {
    title: "The Story",     subtitle: "Pre-Wedding · 2026",
    image: "/images/prewedding/WhatsApp%20Image%202026-07-27%20at%202.45.43%20PM%20(2).jpeg",
    bg: "#1A1028", accent: "#B86AE0",
    moments: ["Chapter one", "How it started", "The look across the room", "A beginning", "Their favourite memory"],
  },
  {
    title: "Held Forever",  subtitle: "Pre-Wedding · 2026",
    image: "/images/prewedding/WhatsApp%20Image%202026-07-27%20at%202.45.43%20PM.jpeg",
    bg: "#28101A", accent: "#E06AA0",
    moments: ["Time stood still", "Pressed into memory", "Nothing else mattered", "This exact second", "Kept forever"],
  },
  {
    title: "Us",            subtitle: "Pre-Wedding · 2026",
    image: "/images/prewedding/WhatsApp%20Image%202026-07-27%20at%202.45.44%20PM%20(1).jpeg",
    bg: "#101E28", accent: "#6ABCE0",
    moments: ["Just us", "No audience needed", "Our universe, our rules", "Complete", "Enough"],
  },
  {
    title: "Last Frame",    subtitle: "Pre-Wedding · 2026",
    image: "/images/prewedding/WhatsApp%20Image%202026-07-27%20at%202.45.44%20PM.jpeg",
    bg: "#101018", accent: "#8A90E0",
    moments: ["The final click", "End of the day", "Still smiling", "Tired but happy", "See you at the altar"],
  },
] as const;

type Album = typeof ALBUMS[number];
const N = ALBUMS.length;
const INIT = 4;  // half-integer — progress never lands on an integer, so no card is ever face-on at 0°

// Cover-flow geometry
const STEP_X  = typeof window !== "undefined" && window.innerWidth < 768 ? 110 : 190;  // px between card centres
// const ANGLE_STEP = 55;   // deg of rotateY per card from centre
// const MAX_ANGLE  = 70;   // clamp
const LERP_K     = 0.12;   // exponential ease-out per frame (≈ 0.4 s to settle)
const MIN_DELTA  = 0.0004;
const SCROLL_DIV = 90;   // px of wheel delta per one card step

function calcStyle(offset: number) {
  const abs  = Math.abs(offset);
  // const sign = Math.sign(offset);
  return {
    tx: offset * STEP_X,                               // translateX (px)
    // ry: sign * Math.min(abs * ANGLE_STEP, MAX_ANGLE),  // rotateY (deg)
    ry: -100,
    op: Math.max(1 - abs * 0.12, 0.22),
    br: Math.max(1 - abs * 0.09, 0.45),
    zi: Math.max(60 - Math.round(abs * 12), 0),
  };
}

// ─── Shelf (collapsed) view ───────────────────────────────────────────────────
function ShelfView({ onSelect }: { onSelect: (i: number) => void }) {
  const stageRef  = useRef<HTMLDivElement>(null);
  const cardsRef  = useRef<(HTMLDivElement | null)[]>([]);
  const dotsRef   = useRef<(HTMLButtonElement | null)[]>([]);

  // All animation state lives in refs — zero React re-renders per frame
  const target    = useRef(INIT);
  const current   = useRef(INIT);
  const rafId     = useRef(0);
  const inside    = useRef(false);
  const touchX    = useRef<number | null>(null);
  const touchY    = useRef<number | null>(null);  // track vertical swipe too
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clampAdd = useCallback((delta: number) => {
    // Clamp to half-integer range: progress never hits a whole integer,
    // so no card ever reaches offset=0 (face-on). Min |offset| = 0.5 → rotateY = ±27.5°.
    target.current = Math.max(0, Math.min(N - 1, target.current + delta));
  }, []);

  const snapToNearest = useCallback(() => {
  target.current = Math.round(target.current);
}, []);

  // ── rAF loop — updates DOM directly, no setState ──────────────────────────
  useEffect(() => {
    let prevCenter = INIT;

    const tick = () => {
      const diff = target.current - current.current;
      if (Math.abs(diff) > MIN_DELTA) current.current += diff * LERP_K;

      const prog   = current.current;
      const centre = Math.round(prog);

      cardsRef.current.forEach((el, i) => {
        if (!el) return;
        const off = i - prog;
        if (Math.abs(off) > 5.4) {
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
          return;
        }
        const s = calcStyle(off);
        el.style.transform     = `translateX(${s.tx}px) rotateY(${s.ry}deg)`;
        el.style.opacity       = String(s.op);
        el.style.filter        = `brightness(${s.br})`;
        el.style.zIndex        = String(s.zi);
        el.style.pointerEvents = "auto";
      });

      // Update dot highlight only when centre changes
      if (centre !== prevCenter) {
        dotsRef.current.forEach((dot, i) => {
          if (!dot) return;
          dot.className = `cf-dot${i === centre ? " cf-dot--active" : ""}`;
        });
        prevCenter = centre;
      }

      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  // ── Events — scoped to stage only, NO window-scroll listener ─────────────
  const onWheel = useCallback((e: WheelEvent) => {
  e.preventDefault(); e.stopPropagation();
  const raw = e.deltaMode === 1 ? e.deltaY * 32
            : e.deltaMode === 2 ? e.deltaY * window.innerHeight * 0.8
            : e.deltaY;
  clampAdd(raw / SCROLL_DIV);

  if (snapTimer.current) clearTimeout(snapTimer.current);
  snapTimer.current = setTimeout(snapToNearest, 150);
}, [clampAdd, snapToNearest]);

  const onTouchStart = useCallback((e: TouchEvent) => {
    inside.current = true;
    touchX.current = e.touches[0].clientX;
    touchY.current = e.touches[0].clientY;  // record start Y
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (touchX.current === null || touchY.current === null) return;

    const cx = e.touches[0].clientX;
    const cy = e.touches[0].clientY;

    const dx = touchX.current - cx;   // positive = swipe left  → next card
    const dy = touchY.current - cy;   // positive = swipe up

    touchX.current = cx;
    touchY.current = cy;

    if (Math.abs(dy) > Math.abs(dx)) {
      // Vertical swipe — let browser scroll the page normally
      return;
    }

    // Horizontal swipe — navigate carousel, block page scroll
    e.preventDefault(); e.stopPropagation();
    clampAdd(dx / (SCROLL_DIV * 0.45));
  }, [clampAdd]);


  const onTouchEnd = useCallback(() => {
    touchX.current = null;
    touchY.current = null;
    inside.current = false;
    snapToNearest();
  }, [snapToNearest]);

  useEffect(() => {
    const s = stageRef.current; if (!s) return;
    s.addEventListener("wheel",      onWheel,      { passive: false });
    s.addEventListener("touchstart", onTouchStart, { passive: false });
    s.addEventListener("touchmove",  onTouchMove,  { passive: false });
    s.addEventListener("touchend",   onTouchEnd);
    return () => {
      s.removeEventListener("wheel",      onWheel);
      s.removeEventListener("touchstart", onTouchStart);
      s.removeEventListener("touchmove",  onTouchMove);
      s.removeEventListener("touchend",   onTouchEnd);
    };
  }, [onWheel, onTouchStart, onTouchMove, onTouchEnd]);

  // Keyboard (arrow keys)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Only respond when shelf section is in view
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      if (e.key === "ArrowLeft")  { e.preventDefault(); clampAdd(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); clampAdd(1);  }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clampAdd]);

  return (
    <motion.div
      className="cf-shelf-wrap"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="cf-header">
        <p className="mono cf-tag">THE ALBUM</p>
        <h2 className="display cf-headline">
          Every glance,{" "}
          <em style={{ fontFamily: "Georgia,serif", fontStyle: "italic", fontWeight: 400 }}>
            held
          </em>{" "}
          in a frame.
        </h2>
        <p className="cf-sub">Scroll or swipe inside the shelf · Click any card to open</p>
      </div>

      {/* 3D Shelf stage */}
      <div
        ref={stageRef}
        className="cf-stage"
        onMouseEnter={() => { inside.current = true;  }}
        onMouseLeave={() => { inside.current = false; }}
      >
        <div className="cf-track">
          {ALBUMS.map((album, i) => {
            const initStyle = calcStyle(i - INIT);
            return (
              <div
                key={i}
                ref={el => { cardsRef.current[i] = el; }}
                className="cf-card"
                style={{
                  // Initial style — rAF overwrites each frame
                  transform: `translateX(${initStyle.tx}px) rotateY(${initStyle.ry}deg)`,
                  opacity:   initStyle.op,
                  filter:    `brightness(${initStyle.br})`,
                  zIndex:    initStyle.zi,
                }}
                onClick={() => onSelect(i)}
                role="button"
                tabIndex={0}
                aria-label={`Open ${album.title}`}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onSelect(i); }}
              >
                <div className="cf-card-inner">
                  <img
                    src={album.image}
                    alt={album.title}
                    className="cf-img"
                    draggable={false}
                    loading="lazy"
                  />
                  {/* Spine strip — reads title when card is angled */}
                  <div className="cf-spine">
                    <span className="cf-spine-text">{album.title} · {album.subtitle}</span>
                  </div>
                  {/* Bottom gradient + label */}
                  <div className="cf-card-info">
                    <span className="cf-card-title">{album.title}</span>
                    <span className="cf-card-sub">{album.subtitle}</span>
                  </div>
                  {/* Top-left gloss */}
                  <div className="cf-shine" />
                </div>
              </div>
            );
          })}
        </div>
      </div> 

      {/* Pill dot nav */}
      <div className="cf-dots" role="tablist">
        {ALBUMS.map((_, i) => (
          <button
            key={i}
            ref={el => { dotsRef.current[i] = el; }}
            role="tab"
            className={`cf-dot${i === INIT ? " cf-dot--active" : ""}`}
            onClick={() => { target.current = i; }}
            aria-label={`Photo ${i + 1}`}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Expanded (detail) view ───────────────────────────────────────────────────
function ExpandedView({ album, onClose }: { album: Album; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  return (
    <motion.div
      className="cf-expanded"
      style={{ background: album.bg }}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Back button */}
      <button className="cf-close-btn" onClick={onClose} aria-label="Back to shelf">
        ← Back
      </button>

      {/* Left panel */}
      <motion.div
        className="cf-panel-left"
        initial={{ x: -36, opacity: 0 }}
        animate={{ x: 0,   opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="cf-exp-img-wrap">
          <img src={album.image} alt={album.title} className="cf-exp-img" draggable={false} />
        </div>
        <h2 className="cf-exp-title">{album.title}</h2>
        <p className="cf-exp-sub">{album.subtitle}</p>
        <div className="cf-exp-actions">
          <button
            className="cf-pill-btn cf-pill-primary"
            style={{ background: album.accent, color: album.bg }}
            onClick={() => {
              onClose();                                      // close expanded view
              window.scrollTo({ top: 0, behavior: "smooth" }); // scroll to landing
            }}
          >
            ▶ View Gallery
          </button>

        </div>
      </motion.div>

      {/* Right panel — moment list */}
      <motion.div
        className="cf-panel-right"
        initial={{ x: 36, opacity: 0 }}
        animate={{ x: 0,  opacity: 1 }}
        transition={{ delay: 0.22, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="cf-exp-label mono" style={{ color: album.accent }}>MOMENTS</p>
        <ol className="cf-moment-list">
          {album.moments.map((m, i) => (
            <li key={i} className="cf-moment-item">
              <span className="cf-moment-num" style={{ color: album.accent }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="cf-moment-body">
                <span className="cf-moment-name">{m}</span>
                <span className="cf-moment-time mono">
                  0{i + 1}:{String(Math.round(Math.random() * 59)).padStart(2,"0")}
                </span>
              </div>
            </li>
          ))}
        </ol>
        <p className="cf-exp-footer mono">PREWEDDING FILM · 2026 · DEV JANGID</p>
      </motion.div>
    </motion.div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function CoverFlow() {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <section id="coverflow" className="coverflow-section section">
      <AnimatePresence mode="wait">
        {expanded === null ? (
          <ShelfView key="shelf" onSelect={setExpanded} />
        ) : (
          <ExpandedView key="expanded" album={ALBUMS[expanded]} onClose={() => setExpanded(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}
