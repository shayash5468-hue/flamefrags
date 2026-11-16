import { Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Stars } from "@react-three/drei";
import * as THREE from "three";
import { Planet } from "./Planet";
import { FloatControls } from "./FloatControls";
import { StationInterior, type Mats } from "./Modules";
import { InteriorProps } from "./Props";
import { StationHull, STENCIL_WINDOW } from "./Hull";
import { SphericalFlame } from "./SphericalFlame";
import { Node3Equipment, type Node3Interactable } from "./Node3Equipment";
import { HeldCo2Extinguisher } from "./HeldCo2Extinguisher";
import { LIGHT_POINTS, getModule, type ModuleId } from "./layout";
import { makePanelTexture } from "./materials";
import {
  makeEarthDayTexture,
  makeFabricWallTexture,
  makeRackWallTexture,
  makeRussianWallTexture,
  makeStowageWallTexture,
} from "./textures";

/** Keeps Earth and stars at infinity: they move with the camera, never with parallax. */
function SkyFollower({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    ref.current?.position.copy(camera.position);
  });
  return <group ref={ref}>{children}</group>;
}

function useMats(): { mats: Mats; earthTex: THREE.Texture } {
  const assets = useMemo(() => {
    const rack = makeRackWallTexture();
    const stow = makeStowageWallTexture();
    const ru = makeRussianWallTexture();
    const fabric = makeFabricWallTexture();
    const earthTex = makeEarthDayTexture();
    const panelTex = makePanelTexture();

    const mats: Mats = {
      rack: new THREE.MeshStandardMaterial({ map: rack, roughness: 0.62, metalness: 0.12 }),
      stow: new THREE.MeshStandardMaterial({ map: stow, roughness: 0.92, metalness: 0 }),
      ru: new THREE.MeshStandardMaterial({ map: ru, roughness: 0.75, metalness: 0.05 }),
      fabric: new THREE.MeshStandardMaterial({ map: fabric, roughness: 0.95, metalness: 0, side: THREE.DoubleSide }),
      panel: new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.55, metalness: 0.15, side: THREE.DoubleSide }),
      ruPanel: new THREE.MeshStandardMaterial({
        map: panelTex,
        color: "#c9d3bd",
        roughness: 0.6,
        metalness: 0.1,
        side: THREE.DoubleSide,
      }),
      frame: new THREE.MeshStandardMaterial({ color: "#9a9890", roughness: 0.45, metalness: 0.55, side: THREE.DoubleSide }),
      dark: new THREE.MeshStandardMaterial({ color: "#1d1f22", roughness: 0.55, metalness: 0.3 }),
      led: new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#fff6e4", emissiveIntensity: 2.2, toneMapped: false }),
      glass: new THREE.MeshPhysicalMaterial({
        color: "#bcd4ff",
        transparent: true,
        opacity: 0.07,
        roughness: 0.05,
        metalness: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        // marks the window pixels so the outer hull is drawn only through them
        stencilWrite: true,
        stencilRef: STENCIL_WINDOW,
        stencilFunc: THREE.AlwaysStencilFunc,
        stencilZPass: THREE.ReplaceStencilOp,
      }),
      rail: new THREE.MeshStandardMaterial({ color: "#c8c5bc", roughness: 0.35, metalness: 0.6 }),
    };

    return {
      mats,
      earthTex,
      textures: [rack, stow, ru, fabric, earthTex, panelTex],
    };
  }, []);

  useEffect(() => {
    return () => {
      assets.textures.forEach((t) => t.dispose());
      Object.values(assets.mats).forEach((m) => m.dispose());
    };
  }, [assets]);

  return { mats: assets.mats, earthTex: assets.earthTex };
}

function Station() {
  const { mats, earthTex } = useMats();
  return (
    <>
      <StationInterior mats={mats} />
      <InteriorProps mats={mats} earth={earthTex} />
      <StationHull />
    </>
  );
}

function ReadySignal() {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  useFrame(() => {
    frames.current++;
    if (frames.current === 3) gl.domElement.closest("[data-scene-root]")?.setAttribute("data-scene-ready", "true");
  });
  return null;
}

/** A fixed pool of cabin lights that follows the viewer to the nearest fixtures. */
const POOL = 8;
function CabinLights() {
  const refs = useRef<(THREE.PointLight | null)[]>([]);
  const last = useRef(new THREE.Vector3(1e9, 0, 0));
  useFrame(({ camera }) => {
    if (camera.position.distanceToSquared(last.current) < 0.25) return;
    last.current.copy(camera.position);
    const p = camera.position;
    const nearest = LIGHT_POINTS.map((l, i) => ({ i, d: (l.x - p.x) ** 2 + (l.y - p.y) ** 2 + (l.z - p.z) ** 2 }))
      .sort((a, b) => a.d - b.d)
      .slice(0, POOL);
    nearest.forEach(({ i }, k) => {
      const l = LIGHT_POINTS[i]!;
      refs.current[k]?.position.set(l.x, l.y, l.z);
    });
  });
  return (
    <>
      {Array.from({ length: POOL }, (_, k) => (
        <pointLight
          key={k}
          ref={(el) => {
            refs.current[k] = el;
          }}
          position={[0, -1000, 0]}
          intensity={2.6}
          distance={5.5}
          decay={1.6}
          color="#fff3e2"
        />
      ))}
    </>
  );
}

const CUPOLA_MOD = getModule("cupola");

export function InteriorScene({
  onSection,
  onContextLostChange,
  onPointerLockReleased,
  flameActive = false,
  flameIntensity = 1,
  onFlameDamage,
  oxygenSuppressed = false,
  hasO2Gear = false,
  hasCo2Extinguisher = false,
  isSprayingCo2 = false,
  onSuppressO2,
  onEquipO2,
  onEquipCo2,
  onSprayHitFlame,
  onHoverTarget,
}: {
  onSection: (id: ModuleId) => void;
  onContextLostChange?: (lost: boolean) => void;
  onPointerLockReleased?: () => void;
  flameActive?: boolean;
  flameIntensity?: number;
  onFlameDamage?: (dt: number, dist: number) => void;
  oxygenSuppressed?: boolean;
  hasO2Gear?: boolean;
  hasCo2Extinguisher?: boolean;
  isSprayingCo2?: boolean;
  onSuppressO2?: () => void;
  onEquipO2?: () => void;
  onEquipCo2?: () => void;
  onSprayHitFlame?: (dt: number) => void;
  onHoverTarget?: (target: Node3Interactable) => void;
}) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 72, near: 0.03, far: 9000 }}
      gl={{ antialias: true, stencil: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.85 }}
      onCreated={({ gl }) => {
        const canvas = gl.domElement;
        canvas.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onContextLostChange?.(true);
        });
        canvas.addEventListener("webglcontextrestored", () => {
          onContextLostChange?.(false);
        });
      }}
    >
      <color attach="background" args={["#000000"]} />
      <FloatControls onSection={onSection} onPointerLockReleased={onPointerLockReleased} />
      <SphericalFlame active={flameActive} intensity={flameIntensity} onDamage={onFlameDamage} />
      <Node3Equipment
        oxygenSuppressed={oxygenSuppressed}
        hasO2Gear={hasO2Gear}
        hasCo2Extinguisher={hasCo2Extinguisher}
        onSuppressO2={onSuppressO2 || (() => {})}
        onEquipO2={onEquipO2 || (() => {})}
        onEquipCo2={onEquipCo2 || (() => {})}
        onHoverTarget={onHoverTarget}
      />
      <HeldCo2Extinguisher
        equipped={hasCo2Extinguisher}
        isSpraying={isSprayingCo2}
        flameActive={flameActive}
        onSprayHitFlame={onSprayHitFlame || (() => {})}
      />

      <SkyFollower>
        <Stars radius={6000} depth={1200} count={5000} factor={110} saturation={0} fade speed={0.2} />
        <Suspense fallback={null}>
          <Planet />
        </Suspense>
      </SkyFollower>

      {/* Cabin lighting: warm-white LED panels */}
      <hemisphereLight args={["#fff7ea", "#8f969e", 0.55]} />
      <CabinLights />
      {/* Earthshine pouring up through the Cupola windows */}
      <pointLight
        position={[CUPOLA_MOD.c.x, CUPOLA_MOD.s0 - 0.6, CUPOLA_MOD.c.z]}
        intensity={7}
        distance={5}
        decay={1.4}
        color="#9cc0ff"
      />

      <Environment resolution={128}>
        <Lightformer intensity={1.6} color="#fff6e8" position={[0, 3, 0]} rotation-x={Math.PI / 2} scale={[4, 12, 1]} />
        <Lightformer intensity={0.8} color="#ffffff" position={[3, 0, 0]} rotation-y={-Math.PI / 2} scale={[12, 2, 1]} />
        <Lightformer intensity={0.8} color="#ffffff" position={[-3, 0, 0]} rotation-y={Math.PI / 2} scale={[12, 2, 1]} />
        <Lightformer intensity={1.2} color="#7fa8e8" position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={[6, 6, 1]} />
      </Environment>

      <Suspense fallback={null}>
        <Station />
        <ReadySignal />
      </Suspense>
    </Canvas>
  );
}
