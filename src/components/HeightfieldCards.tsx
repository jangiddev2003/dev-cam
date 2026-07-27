import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { motion } from "framer-motion";
import gsap from "gsap";
import { PHOTOS } from "../data";

type Card = {
  id: string;
  label: string;
  description: string;
  src: string;
  category: string;
};

const PANEL_CARDS: Card[] = PHOTOS.slice(0, 7).map((photo) => ({
  id: photo.id,
  label: photo.label,
  description: photo.category,
  src: photo.src ?? "/images/photos/photo-1.jpg",
  category: photo.category,
}));

const TOTAL = PANEL_CARDS.length;
const ANGLE_STEP = (Math.PI * 2) / TOTAL;

/** Portrait plane (~2:3). */
const CARD_WIDTH = 0.72;
const CARD_HEIGHT = 1.08;

const PERSPECTIVE_PX = 2200;

type WheelState = {
  /** Entire cylinder rotation (radians). Camera stays fixed. */
  y: number;
  velocity: number;
  dragging: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastTime: number;
};

const CARD_GEOMETRY = (() => {
  const geometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT, 32, 1);
  const position = geometry.attributes.position;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    position.setZ(index, Math.cos((x / CARD_WIDTH) * Math.PI) * 0.03);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
})();

function normalizeAngle(angle: number) {
  let a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  return a;
}

function nearestCardIndex(rotationY: number) {
  // Front of cylinder faces +Z when (cardAngle + rotationY) ≈ 0.
  let best = 0;
  let bestScore = Infinity;
  for (let i = 0; i < TOTAL; i += 1) {
    const score = Math.abs(normalizeAngle(i * ANGLE_STEP + rotationY));
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

function useCardTexture(card: Card, index: number) {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1536;
    canvas.height = 2304;
    const context = canvas.getContext("2d");
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;

    if (!context) return texture;

    const corner = 72;
    const frame = 28;
    const imageArea = {
      x: frame,
      y: frame,
      width: canvas.width - frame * 2,
      height: canvas.height - frame * 2,
    };
    const roundedPath = (x: number, y: number, width: number, height: number, r: number) => {
      context.beginPath();
      context.moveTo(x + r, y);
      context.arcTo(x + width, y, x + width, y + height, r);
      context.arcTo(x + width, y + height, x, y + height, r);
      context.arcTo(x, y + height, x, y, r);
      context.arcTo(x, y, x + width, y, r);
      context.closePath();
    };

    const drawCard = (image?: HTMLImageElement) => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      roundedPath(0, 0, canvas.width, canvas.height, corner);
      context.clip();
      context.fillStyle = "#F8F5EF";
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.save();
      roundedPath(imageArea.x, imageArea.y, imageArea.width, imageArea.height, corner - frame / 2);
      context.clip();
      context.fillStyle = "#d8d1c8";
      context.fillRect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
      if (image?.naturalWidth && image.naturalHeight) {
        // object-fit: cover
        const scale = Math.max(imageArea.width / image.naturalWidth, imageArea.height / image.naturalHeight);
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        context.drawImage(
          image,
          imageArea.x + (imageArea.width - width) / 2,
          imageArea.y + (imageArea.height - height) / 2,
          width,
          height
        );
      }
      context.restore();

      context.strokeStyle = "rgba(123,105,83,0.28)";
      context.lineWidth = 3;
      roundedPath(10, 10, canvas.width - 20, canvas.height - 20, corner - 6);
      context.stroke();
      texture.needsUpdate = true;
    };

    drawCard();
    const image = new Image();
    image.decoding = "async";
    image.onload = () => drawCard(image);
    image.src = card.src;
    texture.needsUpdate = true;
    return texture;
  }, [card.src, index]);
}

/** Fixed polar seat on the cylinder — never repositioned by drag. */
function CylinderCard({
  card,
  index,
  radius,
  wheel,
}: {
  card: Card;
  index: number;
  radius: number;
  wheel: React.MutableRefObject<WheelState>;
}) {
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const texture = useCardTexture(card, index);
  const angle = index * ANGLE_STEP;
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(() => {
    if (!materialRef.current) return;
    // How close this seat is to the camera-facing front of the cylinder.
    const facing = 1 - Math.min(Math.abs(normalizeAngle(angle + wheel.current.y)) / Math.PI, 1);
    materialRef.current.opacity = 0.4 + facing * 0.6;
    materialRef.current.roughness = 0.36 - facing * 0.08;
    materialRef.current.clearcoat = 0.25 + facing * 0.2;
  });

  return (
    <group position={[x, 0, z]} rotation={[0, angle, 0]}>
      <mesh geometry={CARD_GEOMETRY} position={[0, 0, -0.025]} scale={[1.012, 1.012, 1]}>
        <meshPhysicalMaterial
          alphaMap={texture}
          transparent
          opacity={0.3}
          color="#241b14"
          roughness={0.72}
          metalness={0.04}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh geometry={CARD_GEOMETRY}>
        <meshPhysicalMaterial
          ref={materialRef}
          map={texture}
          transparent
          roughness={0.28}
          metalness={0.02}
          clearcoat={0.4}
          clearcoatRoughness={0.24}
          reflectivity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function CylinderScene({
  wheel,
  activeIndex,
  setActiveIndex,
}: {
  wheel: React.MutableRefObject<WheelState>;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { size, viewport } = useThree();
  const radius = THREE.MathUtils.clamp(Math.min(viewport.width, viewport.height) * 0.24, 1.15, 1.9);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // Apply cylinder rotation — cards stay fixed in local space.
    if (!wheel.current.dragging) {
      const autoSpeed = size.width < 640 ? 0.18 : 0.26;
      wheel.current.y += (autoSpeed + wheel.current.velocity) * delta;
      wheel.current.velocity *= Math.pow(0.92, delta * 60);
      if (Math.abs(wheel.current.velocity) < 0.002) wheel.current.velocity = 0;
    }

    group.rotation.y = wheel.current.y;

    const nextActive = nearestCardIndex(wheel.current.y);
    if (nextActive !== activeIndex) setActiveIndex(nextActive);

    // Fixed camera framing (only responds to resize).
    const targetFov = THREE.MathUtils.clamp(
      THREE.MathUtils.radToDeg(2 * Math.atan(size.height / (2 * PERSPECTIVE_PX))),
      20,
      34
    );
    const targetZ = radius + Math.max(viewport.height * 0.92, 3.6);
    const camera = state.camera as THREE.PerspectiveCamera;
    camera.position.set(0, 0.05, targetZ);
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <ambientLight intensity={1.7} />
      <directionalLight position={[2.8, 3.4, 5]} intensity={1.35} color="#fff0dc" />
      <directionalLight position={[-2.2, 1.2, 2]} intensity={0.35} color="#c9b8a2" />
      <group ref={groupRef}>
        {PANEL_CARDS.map((card, index) => (
          <CylinderCard key={card.id} card={card} index={index} radius={radius} wheel={wheel} />
        ))}
      </group>
    </>
  );
}

export default function HeightfieldCards() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const wheel = useRef<WheelState>({
    y: 0,
    velocity: 0,
    dragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastTime: 0,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const totalSlides = TOTAL;

  useEffect(() => {
    const context = gsap.context(() => {
      gsap.fromTo(".heightfield-intro", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, stagger: 0.08, ease: "power3.out" });
      gsap.fromTo(".heightfield-stage-shell", { y: 18, opacity: 0, scale: 0.985 }, { y: 0, opacity: 1, scale: 1, duration: 0.95, ease: "power3.out", delay: 0.05 });
    }, sectionRef);
    return () => context.revert();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      const focused = section.contains(document.activeElement);
      if (!inView && !focused) return;
      event.preventDefault();
      wheel.current.velocity += event.key === "ArrowLeft" ? 0.9 : -0.9;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function goToSlide(direction: -1 | 1) {
    wheel.current.velocity += direction * -0.9;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    wheel.current.dragging = true;
    wheel.current.velocity = 0;
    wheel.current.startX = event.clientX;
    wheel.current.startY = wheel.current.y;
    wheel.current.lastX = event.clientX;
    wheel.current.lastTime = performance.now();
    stageRef.current?.setPointerCapture(event.pointerId);
    document.body.style.cursor = "grabbing";
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!wheel.current.dragging || !stageRef.current) return;
    const width = Math.max(stageRef.current.getBoundingClientRect().width, 1);
    // Drag rotates the whole cylinder (not individual cards).
    const deltaX = event.clientX - wheel.current.startX;
    wheel.current.y = wheel.current.startY + (deltaX / width) * Math.PI * 1.25;

    const now = performance.now();
    const dt = Math.max(now - wheel.current.lastTime, 1);
    const instant = ((event.clientX - wheel.current.lastX) / width) * Math.PI * 1.25;
    wheel.current.velocity = THREE.MathUtils.clamp(instant / (dt / 1000), -3.2, 3.2);
    wheel.current.lastX = event.clientX;
    wheel.current.lastTime = now;
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (stageRef.current?.hasPointerCapture(event.pointerId)) {
      stageRef.current.releasePointerCapture(event.pointerId);
    }
    document.body.style.cursor = "default";
    if (!wheel.current.dragging) return;
    wheel.current.dragging = false;

    // GSAP inertia → snap to nearest card on the cylinder.
  }

  return (
    <>
      <section id="heightfield" className="section section-alt heightfield-section" ref={sectionRef}>
        <div className="heightfield-carousel-block">
          <nav className="heightfield-navbar heightfield-intro" aria-label="3D Gallery navigation">
            <span className="heightfield-navbar-brand">
              3D Gallery
              <span className="heightfield-navbar-badge" aria-hidden="true">#3</span>
            </span>
            <span className="heightfield-navbar-tagline mono">Drag • Swipe • Explore</span>
            <span className="heightfield-navbar-counter mono" aria-live="polite">
              {String(activeIndex + 1).padStart(2, "0")} / {String(totalSlides).padStart(2, "0")}
            </span>
          </nav>

          <motion.div
            className="heightfield-stage-shell heightfield-intro"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div
              ref={stageRef}
              className="heightfield-stage"
              tabIndex={0}
              role="region"
              aria-label="3D cylindrical photo carousel. Drag to rotate."
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <Canvas
                camera={{ position: [0, 0.05, 7.5], fov: 24, near: 0.1, far: 100 }}
                dpr={[1, 1.5]}
                style={{ width: "100%", height: "100%", display: "block", transform: "translateZ(0)" }}
                gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
                onCreated={({ gl }) => {
                  gl.setClearColor("#0F0B09", 1);
                  gl.toneMapping = THREE.ACESFilmicToneMapping;
                  gl.toneMappingExposure = 1.04;
                  gl.outputColorSpace = THREE.SRGBColorSpace;
                }}
              >
                <color attach="background" args={["#0F0B09"]} />
                <CylinderScene wheel={wheel} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
              </Canvas>
            </div>
          </motion.div>

          <div className="heightfield-nav-controls heightfield-intro">
            <button type="button" className="heightfield-nav-btn" onClick={() => goToSlide(-1)} aria-label="Previous slide">
              ◀ Previous
            </button>
            <button type="button" className="heightfield-nav-btn" onClick={() => goToSlide(1)} aria-label="Next slide">
              Next ▶
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
