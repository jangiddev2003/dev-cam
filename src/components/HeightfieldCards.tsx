import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, shaderMaterial } from "@react-three/drei";
import { motion } from "framer-motion";
import gsap from "gsap";
import { HEIGHTFIELD_CARDS } from "../data";

type Card = (typeof HEIGHTFIELD_CARDS)[number];

const PALETTES = [
  ["#f8f3ec", "#e8d7c3", "#b67a42"],
  ["#f4eadf", "#dcc2a4", "#c9975d"],
  ["#f7efe6", "#e1c9af", "#9f6840"],
  ["#f1e2d1", "#d4b896", "#7a624f"],
  ["#fbf7f2", "#e6d0b8", "#a96f3f"],
];

const FRAME_ASPECT = 1.1 / 1.56;
const CARD_GEOMETRY = new THREE.PlaneGeometry(1.18, 1.67, 100, 100);

const vertexShader = `
  precision highp float;

  uniform float uTime;
  uniform float uCurve;
  uniform float uLift;
  uniform float uBreath;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vNoise;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i + vec2(0.0, 0.0));
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vUv = uv;
    vec3 displaced = position;

    float centerWeight = 1.0 - abs(uv.x - 0.5) * 2.0;
    float crossWeight = 1.0 - abs(uv.y - 0.5) * 2.0;
    float shellCurve = cos((uv.x - 0.5) * 3.14159265) * 0.055;
    float bandCurve = cos((uv.y - 0.5) * 3.14159265) * 0.02;
    float breath = sin(uTime * 0.65 + uv.y * 6.0) * 0.5 + 0.5;
    float organic = fbm(uv * vec2(2.8, 4.2) + vec2(uTime * 0.02, -uTime * 0.018));
    float wave = sin(uv.x * 4.5 + uTime * 0.45) * 0.012 + cos(uv.y * 5.0 - uTime * 0.38) * 0.01;

    displaced.z += (shellCurve + bandCurve) * uCurve;
    displaced.z += (1.0 - abs(uv.x - 0.5) * 2.0) * uLift * 0.75;
    displaced.z += (organic - 0.5) * 0.01;
    displaced.z += wave * 0.5;
    displaced.y += crossWeight * uLift * 0.42;
    displaced.y += (breath - 0.5) * uBreath * centerWeight;

    vPosition = displaced;
    vNormal = normalize(normalMatrix * normal);
    vNoise = organic;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uFocus;
  uniform float uOpacity;
  uniform float uBrightness;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform float uImageAspect;
  uniform float uFrameAspect;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vNoise;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i + vec2(0.0, 0.0));
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  vec3 palette(float t, vec3 a, vec3 b, vec3 c) {
    return a + b * cos(6.28318 * (c * t + vec3(0.0, 0.33, 0.67)));
  }

  vec2 coverUv(vec2 uv, float imageAspect, float frameAspect) {
    vec2 centered = uv - 0.5;
    float ratio = imageAspect / frameAspect;
    if (ratio > 1.0) {
      centered.x *= ratio;
    } else {
      centered.y /= ratio;
    }
    return centered + 0.5;
  }

  float roundedRectSdf(vec2 p, vec2 size, float radius) {
    vec2 q = abs(p) - size + vec2(radius);
    return length(max(q, 0.0)) - radius + min(max(q.x, q.y), 0.0);
  }

  void main() {
    vec2 uv = vUv;
    vec2 organicWarp = vec2(
      fbm(uv * 3.0 + vec2(uTime * 0.04, uTime * 0.02)),
      fbm(uv * 3.0 - vec2(uTime * 0.03, uTime * 0.015))
    ) - 0.5;

    uv += organicWarp * 0.008;

    vec2 sampledUv = coverUv(uv, uImageAspect, uFrameAspect);
    vec4 tex = texture2D(uMap, sampledUv);

    float organic = fbm(uv * 2.6 + vec2(uTime * 0.02, -uTime * 0.017) + vNoise * 1.25);
    vec3 colorField = palette(organic, uColorA, uColorB, uColorC);
    vec3 base = mix(colorField, tex.rgb, 0.7);

    vec3 N = normalize(vNormal);
    vec3 L = normalize(vec3(-0.18, 0.82, 0.54));
    vec3 V = normalize(vec3(0.0, 0.0, 1.0));

    float diffuse = max(dot(N, L), 0.0);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 2.3);
    float spec = pow(max(dot(reflect(-L, N), V), 0.0), 24.0);
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    float reflection = smoothstep(0.15, 0.9, sampledUv.y);

    vec3 lighting = base * (0.24 + diffuse * 0.72);
    lighting += vec3(1.0, 0.98, 0.95) * spec * 0.32;
    lighting += fresnel * mix(vec3(0.12, 0.2, 0.3), vec3(0.95, 0.98, 1.0), reflection) * 0.28;
    lighting += vec3(0.06, 0.07, 0.09) * organic;
    lighting *= uBrightness;
    lighting = pow(max(lighting, 0.0), vec3(1.0 / 2.2));

    float corner = roundedRectSdf(uv - 0.5, vec2(0.5 - 0.045), 0.11);
    float alpha = smoothstep(0.01, -0.01, corner) * uOpacity;
    alpha *= smoothstep(1.1, 0.2, length(vPosition.xy) + 0.15);

    gl_FragColor = vec4(lighting, alpha);
  }
`;

const HeightfieldMaterial = shaderMaterial(
  {
    uTime: 0,
    uMap: new THREE.Texture(),
    uColorA: new THREE.Color("#f8f3ec"),
    uColorB: new THREE.Color("#d4b896"),
    uColorC: new THREE.Color("#7a624f"),
    uCurve: 0.2,
    uLift: 0.018,
    uBreath: 0.012,
    uFocus: 0,
    uOpacity: 1,
    uBrightness: 1,
    uImageAspect: 1,
    uFrameAspect: FRAME_ASPECT,
  },
  vertexShader,
  fragmentShader
);

extend({ HeightfieldMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    heightfieldMaterial: any;
  }
}

type CarouselState = {
  progress: number;
  target: number;
  velocity: number;
  dragging: boolean;
  startX: number;
  startTarget: number;
  lastX: number;
  lastTime: number;
  mouse: THREE.Vector2;
};

function createFallbackTexture(index: number, label: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;

  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture(canvas);

  const palette = PALETTES[index % PALETTES.length];
  const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
  gradient.addColorStop(0, palette[0]);
  gradient.addColorStop(0.5, palette[1]);
  gradient.addColorStop(1, palette[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 1024);

  for (let i = 0; i < 18; i += 1) {
    const x = 120 + ((i * 173 + index * 71) % 780);
    const y = 110 + ((i * 127 + index * 43) % 820);
    const radius = 110 + ((i * 29 + index * 37) % 180);
    const blob = ctx.createRadialGradient(x, y, 0, x, y, radius);
    blob.addColorStop(0, "rgba(255,250,244,0.44)");
    blob.addColorStop(0.5, "rgba(182,122,66,0.18)");
    blob.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = blob;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.14;
  ctx.strokeStyle = "rgba(122,98,79,0.9)";
  ctx.lineWidth = 2;
  for (let y = 0; y < 1024; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(y * 0.015 + index) * 10);
    ctx.bezierCurveTo(260, y - 16, 620, y + 18, 1024, y + Math.cos(y * 0.012 + index) * 12);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "rgba(75,52,37,0.8)";
  ctx.font = '900 112px "Anton", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 512, 900);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function useCardTexture(card: Card, index: number) {
  return useMemo(() => {
    if (card.src) {
      const loader = new THREE.TextureLoader();
      const texture = loader.load(card.src);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      return texture;
    }

    return createFallbackTexture(index, card.label);
  }, [card.label, card.src, index]);
}

function wrapDistance(index: number, progress: number, total: number) {
  let distance = index - progress;
  distance = ((distance % total) + total) % total;
  if (distance > total / 2) distance -= total;
  return distance;
}

function CardMesh({
  card,
  index,
  carousel,
}: {
  card: Card;
  index: number;
  carousel: React.MutableRefObject<CarouselState>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);
  const texture = useCardTexture(card, index);
  const { size, viewport } = useThree();
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const targetScale = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;

    const total = HEIGHTFIELD_CARDS.length;
    const distance = wrapDistance(index, carousel.current.progress, total);
    const absDistance = Math.abs(distance);
    const focus = 1 - Math.min(absDistance / 2.35, 1);

    const arcAngle = distance * 0.38;
    const arcRadius = size.width < 640 ? 3.15 : size.width < 1024 ? 3.45 : 3.9;
    const x = Math.sin(arcAngle) * arcRadius;
    const z = -(1 - Math.cos(arcAngle)) * arcRadius * 1.7 - absDistance * 0.1;
    const y = Math.sin(arcAngle * 0.45) * 0.14;
    const mouseX = carousel.current.mouse.x * (1 - focus) * 0.18;
    const mouseY = carousel.current.mouse.y * (1 - focus) * 0.08;

    targetPosition.set(x + mouseX, y + mouseY, z);
    mesh.position.lerp(targetPosition, Math.min(1, delta * 8.5));
    mesh.rotation.y += ((-arcAngle * 0.95) - mesh.rotation.y) * Math.min(1, delta * 9.5);
    mesh.rotation.z += ((-Math.sin(arcAngle) * 0.06) - mesh.rotation.z) * Math.min(1, delta * 9.5);

    const cardHeight = viewport.height * 0.4;
    const scaleBase = cardHeight / 1.67;
    const nextScale = scaleBase * (0.84 + focus * 0.32);
    targetScale.set(nextScale, nextScale, 1);
    mesh.scale.lerp(targetScale, Math.min(1, delta * 8));

    material.uTime = state.clock.elapsedTime;
    material.uCurve = 0.16 + focus * 0.05;
    material.uLift = 0.01 + focus * 0.008;
    material.uBreath = 0.008 + focus * 0.006;
    material.uFocus = focus;
    material.uOpacity = 0.42 + focus * 0.58;
    material.uBrightness = 0.62 + focus * 0.42;
    material.uMap = texture;
    material.uImageAspect = texture.image?.width && texture.image?.height ? texture.image.width / texture.image.height : 1;
    material.uFrameAspect = FRAME_ASPECT;
  });

  return (
    <mesh ref={meshRef} geometry={CARD_GEOMETRY} castShadow receiveShadow>
      <heightfieldMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        toneMapped
        uMap={texture}
        uColorA={new THREE.Color(PALETTES[index % PALETTES.length][0])}
        uColorB={new THREE.Color(PALETTES[index % PALETTES.length][1])}
        uColorC={new THREE.Color(PALETTES[index % PALETTES.length][2])}
      />
    </mesh>
  );
}

function HeightfieldScene({
  carousel,
  activeIndex,
  setActiveIndex,
}: {
  carousel: React.MutableRefObject<CarouselState>;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { size } = useThree();

  useFrame((state, delta) => {
    const current = carousel.current;

    if (!current.dragging) {
      current.target += current.velocity * delta * 60;
      current.velocity *= Math.pow(0.9, delta * 60);
      if (Math.abs(current.velocity) < 0.00004) current.velocity = 0;
    }

    current.progress += (current.target - current.progress) * Math.min(1, delta * 7.2);

    const wrapped = ((Math.round(current.progress) % HEIGHTFIELD_CARDS.length) + HEIGHTFIELD_CARDS.length) % HEIGHTFIELD_CARDS.length;
    if (wrapped !== activeIndex) setActiveIndex(wrapped);

    if (groupRef.current) {
      groupRef.current.rotation.y = current.mouse.x * 0.08;
      groupRef.current.rotation.x = -current.mouse.y * 0.03;
    }

    const targetZoom = size.width < 640 ? 8.55 : size.width < 1024 ? 8.95 : 9.25;
    state.camera.position.z += (targetZoom - state.camera.position.z) * 0.05;
    state.camera.position.x += (0 - state.camera.position.x) * 0.05;
    state.camera.position.y += (0.04 - state.camera.position.y) * 0.05;
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={groupRef}>
      {HEIGHTFIELD_CARDS.map((card, index) => (
        <CardMesh key={card.id} card={card} index={index} carousel={carousel} />
      ))}

      <ambientLight intensity={1.75} />
      <directionalLight position={[2.5, 3.2, 4.8]} intensity={1.35} color="#fff0dc" castShadow />
      <Environment preset="sunset" background={false} />
      <ContactShadows position={[0, -2.05, 0]} opacity={0.35} scale={18} blur={2.8} far={4.2} resolution={512} color="#8a5b35" />
    </group>
  );
}

export default function HeightfieldCards() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const activeLabelRef = useRef<HTMLSpanElement>(null);
  const carousel = useRef<CarouselState>({
    progress: 0,
    target: 0,
    velocity: 0,
    dragging: false,
    startX: 0,
    startTarget: 0,
    lastX: 0,
    lastTime: 0,
    mouse: new THREE.Vector2(),
  });
  const [activeIndex, setActiveIndex] = useState(0);

  const activeCard = HEIGHTFIELD_CARDS[activeIndex];

  useEffect(() => {
    const context = gsap.context(() => {
      gsap.fromTo(
        ".heightfield-intro",
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.75, stagger: 0.08, ease: "power3.out" }
      );
      gsap.fromTo(
        ".heightfield-stage-shell",
        { y: 18, opacity: 0, scale: 0.985 },
        { y: 0, opacity: 1, scale: 1, duration: 0.95, ease: "power3.out", delay: 0.05 }
      );
    }, sectionRef);

    return () => context.revert();
  }, []);

  useEffect(() => {
    if (!activeLabelRef.current) return;
    gsap.fromTo(
      activeLabelRef.current,
      { y: 8, opacity: 0.35 },
      { y: 0, opacity: 1, duration: 0.28, ease: "power2.out" }
    );
  }, [activeIndex]);

  function updateMouse(clientX: number, clientY: number) {
    const stage = stageRef.current;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    carousel.current.mouse.x = THREE.MathUtils.clamp((x - 0.5) * 2, -1, 1);
    carousel.current.mouse.y = THREE.MathUtils.clamp((0.5 - y) * 2, -1, 1);
  }

  function snapToNearest() {
    const current = carousel.current;
    const snapped = Math.round(current.target);
    current.dragging = false;
    current.velocity = 0;
    gsap.to(current, {
      target: snapped,
      duration: 0.85,
      ease: "power4.out",
      overwrite: true,
    });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const stage = stageRef.current;
    if (!stage) return;

    carousel.current.dragging = true;
    carousel.current.startX = event.clientX;
    carousel.current.startTarget = carousel.current.target;
    carousel.current.lastX = event.clientX;
    carousel.current.lastTime = performance.now();
    updateMouse(event.clientX, event.clientY);
    stage.setPointerCapture(event.pointerId);
    document.body.style.cursor = "grabbing";
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    updateMouse(event.clientX, event.clientY);
    if (!carousel.current.dragging) return;

    const stage = stageRef.current;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    const delta = event.clientX - carousel.current.startX;
    const sensitivity = Math.max(rect.width * 0.55, 340);
    carousel.current.target = carousel.current.startTarget - delta / sensitivity;

    const now = performance.now();
    const deltaTime = Math.max(now - carousel.current.lastTime, 1);
    const dragVelocity = (event.clientX - carousel.current.lastX) / deltaTime;
    carousel.current.velocity = THREE.MathUtils.clamp(-dragVelocity / 96, -0.15, 0.15);
    carousel.current.lastX = event.clientX;
    carousel.current.lastTime = now;
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const stage = stageRef.current;
    if (stage && stage.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }
    document.body.style.cursor = "default";
    snapToNearest();
  }

  function handlePointerLeave() {
    if (!carousel.current.dragging) {
      carousel.current.mouse.x *= 0.72;
      carousel.current.mouse.y *= 0.72;
    }
  }

  return (
    <>
      <div className="section-divider" />
      <section id="heightfield" className="section section-alt" ref={sectionRef}>
        <div className="section-head heightfield-head">
          <div>
            <p className="mono eyebrow heightfield-intro">
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
              03 — WEBGL
            </p>
            <h2 className="display section-title heightfield-intro">HEIGHTFIELD CARDS</h2>
          </div>
          <p className="heightfield-kicker mono heightfield-intro">
            CURVED SHADERS / DRAG INERTIA / SOFT BLOOM / RESPONSIVE LAYOUT
          </p>
        </div>

        <div className="heightfield-shell">
          <div className="heightfield-copy heightfield-intro">
            <p className="heightfield-lead">
              A WebGL heightfield carousel with curved cards, subtle organic surface motion,
              reduced parallax, and smooth drag inertia.
            </p>
            <p className="heightfield-note">
              The cards stay centered, keep their original proportions, and can be swapped with
              your future shell, abalone, and cloud images without changing the interaction.
            </p>
            <div className="heightfield-meta">
              <span className="mono heightfield-meta-label">ACTIVE</span>
              <span ref={activeLabelRef} className="mono heightfield-meta-value">
                {activeCard.label}
              </span>
            </div>
            <div className="heightfield-tags">
              {[
                "React Three Fiber",
                "Three.js",
                "GSAP",
                "Framer Motion",
              ].map((tag) => (
                <span key={tag} className="mono heightfield-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <motion.div
            className="heightfield-stage-shell"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div
              ref={stageRef}
              className="heightfield-stage"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerLeave}
            >
              <Canvas
                shadows
                camera={{ position: [0, 0.03, 9.1], fov: 27, near: 0.1, far: 50 }}
                dpr={[1, 1.75]}
                gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
                onCreated={({ gl }) => {
                  gl.setClearColor("#F8F3EC", 1);
                  gl.toneMapping = THREE.ACESFilmicToneMapping;
                  gl.toneMappingExposure = 1.03;
                  gl.outputColorSpace = THREE.SRGBColorSpace;
                  gl.shadowMap.enabled = true;
                  gl.shadowMap.type = THREE.PCFSoftShadowMap;
                }}
              >
                <color attach="background" args={["#F8F3EC"]} />
                <HeightfieldScene carousel={carousel} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
              </Canvas>

              <div className="heightfield-overlay">
                <div className="heightfield-overlay-copy">
                  <span className="mono heightfield-overlay-label">DRAG LEFT / RIGHT</span>
                  <span className="mono heightfield-overlay-sub">SUBTLE PARALLAX / INERTIA</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}