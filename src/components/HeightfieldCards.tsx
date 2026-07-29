import { RoundedBox, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { SPIRAL_GALLERY_IMAGES } from "../data";

// ─── Constants ────────────────────────────────────────────────────────────────
const CARD_WIDTH = 0.58;
const CARD_HEIGHT = 0.92;
const SPIRAL_TURNS = 2.2;
const CAM_Z = 3.8;
const Y_SPREAD = 3.2;
const RADIUS_BASE = 0.9;

// Warm espresso placeholder tones — visible even before textures load
const PLACEHOLDER_COLORS = [
  "#5c3d2e", "#7a4f3a", "#4a2c1a", "#8a6040", "#3d2512",
  "#6b4c30", "#9a7050", "#2e1a0e", "#7c5535", "#4e3220",
  "#8e6645", "#3c2518", "#6e4d32", "#a07850", "#2a1a0c",
  "#704e35", "#5a3825", "#8c6448", "#3e2814", "#624030",
];

// ─── Per-card position/rotation computed every frame ─────────────────────────
function useSpiralFrame(
  index: number,
  count: number,
  cardDetails: { phase: number; tilt: number },
  scrollY: React.MutableRefObject<number>,
  groupRef: React.RefObject<THREE.Group | null>
) {
  const { camera } = useThree();

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const elapsed = state.clock.getElapsedTime();
    const scrollMotion = scrollY.current * 0.00022;
    const flow = elapsed * 0.032 + scrollMotion;

    const progress = ((index / count + flow) % 1 + 1) % 1;
    const y = (progress - 0.5) * Y_SPREAD;
    const edgeAmount = Math.min(Math.abs(y) / (Y_SPREAD * 0.5), 1.0);
    const radius = RADIUS_BASE + edgeAmount * 0.35;
    const angle = progress * Math.PI * 2 * SPIRAL_TURNS + cardDetails.phase;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    const depthScale = THREE.MathUtils.mapLinear(z, -radius, radius, 0.72, 1.1);

    group.position.x = THREE.MathUtils.damp(group.position.x, x, 6, delta);
    group.position.y = THREE.MathUtils.damp(group.position.y, y, 6, delta);
    group.position.z = THREE.MathUtils.damp(group.position.z, z, 6, delta);

    group.lookAt(camera.position.x, y * 0.12, camera.position.z);
    group.rotateZ(
      cardDetails.tilt + Math.sin(elapsed * 0.8 + cardDetails.phase) * 0.022
    );
    group.scale.setScalar(
      THREE.MathUtils.damp(group.scale.x, depthScale, 6, delta)
    );
  });
}

// ─── Placeholder card (coloured box — shown while textures load) ─────────────
function PlaceholderCard({
  index,
  count,
  cardDetails,
  scrollY,
}: {
  index: number;
  count: number;
  cardDetails: { phase: number; tilt: number };
  scrollY: React.MutableRefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  useSpiralFrame(index, count, cardDetails, scrollY, groupRef);

  return (
    <group ref={groupRef}>
      <RoundedBox args={[CARD_WIDTH, CARD_HEIGHT, 0.04]} radius={0.055} smoothness={4}>
        <meshStandardMaterial
          color={PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]}
          roughness={0.55}
          metalness={0.05}
        />
      </RoundedBox>
    </group>
  );
}

// ─── Textured card ────────────────────────────────────────────────────────────
function TexturedCard({
  src,
  index,
  count,
  cardDetails,
  scrollY,
}: {
  src: string;
  index: number;
  count: number;
  cardDetails: { phase: number; tilt: number };
  scrollY: React.MutableRefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  useSpiralFrame(index, count, cardDetails, scrollY, groupRef);

  // useTexture suspends until the single texture is loaded
  const texture = useTexture(src) as THREE.Texture;

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <group ref={groupRef}>
      <RoundedBox args={[CARD_WIDTH, CARD_HEIGHT, 0.04]} radius={0.055} smoothness={4} castShadow>
        <meshStandardMaterial map={texture} roughness={0.38} metalness={0.03} />
      </RoundedBox>
    </group>
  );
}

// ─── Scene lighting + helpers ─────────────────────────────────────────────────
function Lighting({ showHelpers }: { showHelpers: boolean }) {
  return (
    <>
      <ambientLight intensity={1.6} />
      <directionalLight position={[2.5, 3.5, 4]} intensity={1.9} color="#ffe8cf" />
      <pointLight position={[-2.2, -0.3, 2.8]} intensity={0.7} color="#b77543" distance={8} />
      {/* Temporary debug helpers — auto-removed after 2 s */}
      {showHelpers && <axesHelper args={[2]} />}
      {showHelpers && <gridHelper args={[6, 12, "#666", "#333"]} />}
    </>
  );
}

// ─── Camera parallax driven by page scroll ────────────────────────────────────
function CameraRig({ scrollY }: { scrollY: React.MutableRefObject<number> }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    const sm = scrollY.current * 0.00022;
    camera.position.x = THREE.MathUtils.damp(
      camera.position.x, Math.sin(sm * 1.6) * 0.14, 3, delta
    );
    camera.position.y = THREE.MathUtils.damp(
      camera.position.y, Math.cos(sm * 1.2) * 0.14, 3, delta
    );
    camera.position.z = THREE.MathUtils.damp(
      camera.position.z, CAM_Z + Math.sin(sm * 2.0) * 0.28, 3, delta
    );
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ─── Full gallery scene ───────────────────────────────────────────────────────
function GalleryScene({
  images,
  scrollY,
  showHelpers,
}: {
  images: readonly { src: string; position: string }[];
  scrollY: React.MutableRefObject<number>;
  showHelpers: boolean;
}) {
  const count = images.length;
  const cardDetails = useMemo(
    () =>
      images.map((_, i) => ({
        phase: i * 1.73,
        tilt: (i % 5 - 2) * 0.032,
      })),
    [images]
  );

  return (
    <>
      <CameraRig scrollY={scrollY} />
      <Lighting showHelpers={showHelpers} />
      {images.map((img, index) => (
        // Each card has its own Suspense boundary:
        // while the texture loads → show placeholder; once done → swap to textured.
        <Suspense
          key={`card-${index}`}
          fallback={
            <PlaceholderCard
              index={index}
              count={count}
              cardDetails={cardDetails[index]}
              scrollY={scrollY}
            />
          }
        >
          <TexturedCard
            src={img.src}
            index={index}
            count={count}
            cardDetails={cardDetails[index]}
            scrollY={scrollY}
          />
        </Suspense>
      ))}
    </>
  );
}

// ─── Canvas wrapper ───────────────────────────────────────────────────────────
function SpiralGallery({ images }: { images: readonly { src: string; position: string }[] }) {
  const scrollY = useRef(0);

  // Debug helpers visible for 2 s then removed — confirms scene is rendering
  const [showHelpers, setShowHelpers] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setShowHelpers(false), 2000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const update = () => { scrollY.current = window.scrollY; };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <Canvas
      className="heightfield-spiral-canvas"
      // fov 62° at z=3.8 → frustum half-height ≈ 2.2 → Y_SPREAD=3.2 (±1.6) fits
      camera={{ position: [0, 0, CAM_Z], fov: 62, near: 0.05, far: 25 }}
      dpr={[1, 1.5]}
      shadows
      gl={{
        alpha: false,             // opaque; dark clear colour set below
        antialias: true,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color("#0f0b09"), 1);
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
      }}
    >
      <GalleryScene
        images={images}
        scrollY={scrollY}
        showHelpers={showHelpers}
      />
    </Canvas>
  );
}

// ─── Section export ───────────────────────────────────────────────────────────
export default function HeightfieldCards() {
  return (
    <section id="heightfield" className="section section-alt heightfield-section">
      <div className="heightfield-carousel-block">
        <div className="heightfield-stage-shell">
          <div
            className="heightfield-stage"
            role="region"
            aria-label="Infinite 3D spiral photo gallery"
          >
            <SpiralGallery images={SPIRAL_GALLERY_IMAGES} />
          </div>
        </div>
      </div>
    </section>
  );
}
