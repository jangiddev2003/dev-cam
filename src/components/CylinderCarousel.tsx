import { RoundedBox, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// ─── Config ───────────────────────────────────────────────────────────────────
// Images in user-specified display order.
// aspect  = measured pixel w/h (for correct UV cover crop).
// focalY  = 0–1 fraction from top of image where the subject sits
//           (mirrors CSS object-position vertical %).
const CAROUSEL_IMAGES: { src: string; aspect: number; focalY: number }[] = [
  { src: "/images/carousel/IMG_3046.jpg",            aspect: 574  / 765, focalY: 0.20 }, // motorbike/palms
  { src: "/images/carousel/IMG_0738.JPG",            aspect: 1140 / 765, focalY: 0.30 }, // boat paddling
  { src: "/images/carousel/IMG_5354.jpg",            aspect: 430  / 765, focalY: 0.25 }, // shikara boat
  { src: "/images/carousel/IMG_5458.JPG",            aspect: 430  / 765, focalY: 0.15 }, // red beanie, snow
  { src: "/images/carousel/IMG_20250606_011628.jpg", aspect: 1020 / 765, focalY: 0.30 }, // mountaintop
  { src: "/images/carousel/IMG-20251002-WA0093.jpg", aspect: 574  / 765, focalY: 0.40 }, // night skyline
  { src: "/images/carousel/IMG_5790.jpg",            aspect: 431  / 765, focalY: 0.30 }, // street walking
];

const COUNT      = CAROUSEL_IMAGES.length;
const RADIUS     = 0.85;  // closer cards; chord = 2×0.85×sin(25.7°) = 0.737 > CARD_W ✓
const CARD_W     = 0.62;
const CARD_H     = 0.88;
const CARD_DEPTH = 0.032;
const CAM_Z      = 2.55;  // front-card distance = 1.7 → cards fill more of frame
const FOV        = 50;
const DRAG_SENS  = 0.006;
const MOMENTUM   = 0.90;  // velocity decay per frame

// placeholder warm tones while textures load
// const WARM_TONES = [
//   "#5c3d2e","#7a4f3a","#4a2c1a","#8a6040",
//   "#6b4c30","#9a7050","#7c5535","#4e3220",
// ];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function frontness(angle: number): number {
  return (Math.cos(angle) + 1) / 2; // 0 = back, 1 = front
}
function smoothstep(x: number): number {
  return x * x * (3 - 2 * x);
}

// ─── Rounded-rect geometry with UV [0,1]×[0,1] ────────────────────────────────
// ShapeGeometry from a rounded-rect Shape gives a single-face mesh where the
// UV exactly covers [0,1]×[0,1] after we remap from shape coordinates.
// This matches the card frame's rounded outline, eliminating square-corner bleed.
// function makeRoundedRectGeo(w: number, h: number, r: number, segs = 8) {
//   const hw = w / 2, hh = h / 2;
//   const shape = new THREE.Shape();
//   shape.moveTo(-hw + r, -hh);
//   shape.lineTo( hw - r, -hh);
//   shape.quadraticCurveTo( hw, -hh,  hw, -hh + r);
//   shape.lineTo( hw,  hh - r);
//   shape.quadraticCurveTo( hw,  hh,  hw - r,  hh);
//   shape.lineTo(-hw + r,  hh);
//   shape.quadraticCurveTo(-hw,  hh, -hw,  hh - r);
//   shape.lineTo(-hw, -hh + r);
//   shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

//   const geo = new THREE.ShapeGeometry(shape, segs);

//   // Remap UV: shape coords are in [-hw,hw] × [-hh,hh]; map to [0,1]×[0,1]
//   const pos  = geo.attributes.position as THREE.BufferAttribute;
//   const uvArr = new Float32Array(pos.count * 2);
//   for (let i = 0; i < pos.count; i++) {
//     uvArr[i * 2]     = pos.getX(i) / w + 0.5;  // x: [-hw,hw] → [0,1]
//     uvArr[i * 2 + 1] = pos.getY(i) / h + 0.5;  // y: [-hh,hh] → [0,1]
//   }
//   geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
//   return geo;
// }
// ─── Curved phone-screen geometry ───────────────────────────────────────────────
// PlaneGeometry with the outer BEND_FRAC portion of each side bent backward
// along a smooth cosine arc. computeVertexNormals() after deformation gives
// the correct surface normals so the directional front-light darkens the curved
// edges and produces a bright specular highlight right at the bend — the
// "waterfall display" look of a curved phone screen.
function makeCurvedScreenGeo(
  w: number,
  h: number,
  bendFrac = 0.22,   // fraction of half-width that bends (each side)
  bendDepth = 0.024, // how far back the tip bends (world units)
  xSegs = 72,
  ySegs = 4
): THREE.BufferGeometry {
  const hw = w / 2;
  const xStart = hw * (1 - bendFrac); // x from centre where bend begins
  const geo = new THREE.PlaneGeometry(w, h, xSegs, ySegs);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const absX = Math.abs(pos.getX(i));
    if (absX > xStart) {
      // t ∈ [0,1]: 0 = bend start, 1 = edge tip
      const t = (absX - xStart) / (hw - xStart);
      // Cosine easing: smooth quarter-arc, z goes from 0 to −bendDepth
      pos.setZ(i, -bendDepth * (1 - Math.cos(t * Math.PI * 0.5)));
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals(); // normals point sideways on the curved portion
  return geo;
}

// ─── Image plane (rounded rect) ──────────────────────────────────────────────
function TexturePlane({
  src,
  imgAspect,
  focalY,
}: {
  src: string;
  imgAspect: number;
  focalY: number;
}) {
  const tex = useTexture(src) as THREE.Texture;

  // Curved phone-screen geometry: flat centre, edges bend backward.
  // High xSegs gives a smooth arc; normals auto-computed by makeCurvedScreenGeo.
  const geo = useMemo(
    () => makeCurvedScreenGeo(CARD_W, CARD_H),
    []
  );

  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;

    const cardAspect = CARD_W / CARD_H;
    const focalOffset = (focalUV: number, scale: number) =>
      Math.max(0, Math.min(1 - scale, focalUV - scale / 2));

    if (imgAspect > cardAspect) {
      const scale = cardAspect / imgAspect;
      tex.repeat.set(scale, 1);
      tex.offset.set(focalOffset(0.5, scale), 0);
    } else {
      const scale = imgAspect / cardAspect;
      tex.repeat.set(1, scale);
      tex.offset.set(0, focalOffset(1 - focalY, scale));
    }
    tex.needsUpdate = true;
  }, [tex, imgAspect, focalY]);

  return (
    <mesh geometry={geo} position={[0, 0, CARD_DEPTH / 2 + 0.002]}>
      {/* Higher metalness gives a glass-like specular pop on the curved edge */}
      <meshStandardMaterial map={tex} roughness={0.12} metalness={0.18} />
    </mesh>
  );
}



// ─── Single card ──────────────────────────────────────────────────────────────
function CylinderCard({
  index,
  rotRef,
  src,
  imgAspect,
  focalY,
}: {
  index: number;
  rotRef: React.RefObject<number>;
  src: string;
  imgAspect: number;
  focalY: number;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const scaleRef = useRef(1);
  const tintRef  = useRef(new THREE.Color(1, 1, 1));

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    const baseAngle = (index / COUNT) * Math.PI * 2;
    const angle     = baseAngle + rotRef.current;

    g.position.x = Math.sin(angle) * RADIUS;
    g.position.z = Math.cos(angle) * RADIUS;
    g.position.y = 0;
    g.rotation.y = angle;

    const f  = frontness(angle);
    const sf = smoothstep(f);

    // scale: front=1.0, back=0.55 — smoothly animated
    const targetScale = THREE.MathUtils.lerp(0.55, 1.0, sf);
    scaleRef.current  = THREE.MathUtils.lerp(scaleRef.current, targetScale, 1 - Math.pow(0.012, delta));
    g.scale.setScalar(scaleRef.current);

    const lum = 1.0;
    tintRef.current.lerp(new THREE.Color(lum, lum, lum), 1 - Math.pow(0.012, delta));

    g.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.userData.noTint) return;   // skip shadow/special meshes
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat) return;
      mat.color.copy(tintRef.current);
      const e = THREE.MathUtils.lerp(0, 0.04, sf);
      mat.emissive.setRGB(e * 0.9, e * 0.6, e * 0.2);
    });
  });

  return (
    <group ref={groupRef}>
      {/* Card frame — tight radius = phone bezel, not big decorative corner */}
      <RoundedBox args={[CARD_W, CARD_H, CARD_DEPTH]} radius={0.022} smoothness={6} castShadow receiveShadow>
        <meshStandardMaterial color="#ede6da" roughness={0.35} metalness={0.08} />
      </RoundedBox>

      {/* Photo on a plane so cover-UV repeat/offset works correctly */}
      <Suspense fallback={null}>
        <TexturePlane src={src} imgAspect={imgAspect} focalY={focalY} />
      </Suspense>

      {/* subtle ground shadow — noTint keeps the black opacity intact */}
      <RoundedBox
        args={[CARD_W, CARD_H * 0.28, CARD_DEPTH * 0.5]}
        radius={0.04}
        smoothness={2}
        position={[0, -(CARD_H / 2 + CARD_H * 0.14 + 0.01), 0]}
        rotation={[Math.PI, 0, 0]}
        renderOrder={-1}
        userData={{ noTint: true }}
      >
        <meshStandardMaterial color="#000000" opacity={0.22} transparent roughness={0.9} />
      </RoundedBox>
    </group>
  );
}

// ─── Ground plane ─────────────────────────────────────────────────────────────
function GroundMirror() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -CARD_H / 2 - 0.05, 0]} receiveShadow>
      <planeGeometry args={[12, 8]} />
      <meshStandardMaterial color="#050403" roughness={0.05} metalness={0.8} opacity={0.55} transparent />
    </mesh>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function CylinderScene({
  rotRef,
  isDraggingRef,
  velRef,
  parallaxRef,
}: {
  rotRef: React.RefObject<number>;
  isDraggingRef: React.RefObject<boolean>;
  velRef: React.RefObject<number>;
  parallaxRef: React.RefObject<{ x: number; y: number }>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 0, CAM_Z); // y=0: perfectly centred, no downward tilt
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useFrame((_, delta) => {
    if (!isDraggingRef.current) {
      // Smooth per-frame velocity decay and rotation
      velRef.current *= Math.pow(MOMENTUM, delta * 60);
      rotRef.current += velRef.current * delta;
    }

    // Parallax camera nudge from external cursor (when mouse outside box)
    const px = parallaxRef.current.x; // -1…+1
    const py = parallaxRef.current.y;
    const targetX = px * 0.18;
    const targetY = py * 0.10;        // no y bias — resting position is y=0 (centred)
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.06);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.06);
    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <ambientLight intensity={0.18} color="#fff5e8" />
      <directionalLight
        position={[0, 1.5, 5]}
        intensity={2.4}
        color="#fff8f0"
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-bias={-0.001}
      />
      <pointLight position={[-3.5, 1, 1.5]} intensity={0.45} color="#c8844a" distance={12} />
      <pointLight position={[0, 0.5, -3]} intensity={0.2} color="#8ab4d4" distance={10} />

      <GroundMirror />

      {CAROUSEL_IMAGES.map((entry, i) => (
        <CylinderCard key={i} index={i} rotRef={rotRef}
          src={entry.src} imgAspect={entry.aspect} focalY={entry.focalY}
        />
      ))}
    </>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────
export default function CylinderCarousel() {
  const rootRef        = useRef<HTMLDivElement>(null);
  const rotRef         = useRef(0);
  const isDraggingRef  = useRef(false);
  const lastXRef       = useRef(0);
  const velRef         = useRef(0);
  const insideRef      = useRef(false);          // is mouse currently over the box?
  const parallaxRef    = useRef({ x: 0, y: 0 }); // normalised cursor offset for camera tilt
  const [isGrabbing, setIsGrabbing] = useState(false);

  // ── Scroll isolation: wheel inside box rotates carousel, not page ──────────
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!insideRef.current) return;   // only intercept when cursor is inside
      e.preventDefault();               // block page scroll
      e.stopPropagation();
      // Smooth per-frame: inject deltaY as angular velocity (rad/s)
      velRef.current += e.deltaY * 0.004;
    };

    // Must be non-passive to call preventDefault
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Track cursor inside/outside; apply parallax when OUTSIDE ─────────────
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      insideRef.current = inside;

      if (!inside) {
        // Map cursor position to -1…+1 relative to viewport centre
        parallaxRef.current = {
          x: (e.clientX / window.innerWidth  - 0.5) * 2,
          y: (e.clientY / window.innerHeight - 0.5) * -2,
        };
      } else {
        // Inside box: fade parallax back toward neutral
        parallaxRef.current = { x: 0, y: 0 };
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  // ── Drag ──────────────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = true;
    lastXRef.current = e.clientX;
    velRef.current = 0;
    setIsGrabbing(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    velRef.current = dx * DRAG_SENS * 60; // rad/s
    rotRef.current += dx * DRAG_SENS;
  }, []);

  const onPointerUp = useCallback(() => {
    isDraggingRef.current = false;
    setIsGrabbing(false);
    velRef.current *= 0.55; // bleed into momentum on release
  }, []);

  return (
    <div
      ref={rootRef}
      className="cylinder-carousel-root"
      style={{ cursor: isGrabbing ? "grabbing" : "grab" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <Canvas
        camera={{ position: [0, 0.08, CAM_Z], fov: FOV, near: 0.1, far: 40 }}
        dpr={[1, 1.5]}
        shadows
        gl={{
          alpha: false,
          antialias: true,
          powerPreference: "high-performance",
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color("#080706"), 1);
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.12;
        }}
      >
        <CylinderScene
          rotRef={rotRef}
          isDraggingRef={isDraggingRef}
          velRef={velRef}
          parallaxRef={parallaxRef}
        />
      </Canvas>

      <div className="cylinder-drag-hint mono">DRAG TO SPIN</div>
    </div>
  );
}
