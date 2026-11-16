import type { ThreeElements } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getModule, localToWorld, type ModuleId } from "./layout";
import { frameProps, type Mats } from "./Modules";

/** Laptop screen showing the station's ground track over the real Earth map. */
function useTrackerTexture(earth: THREE.Texture) {
  return useMemo(() => {
    const W = 512;
    const H = 320;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = "#0a1220";
    g.fillRect(0, 0, W, H);
    const mapH = 256;
    const img = earth.image as CanvasImageSource | undefined;
    if (img) g.drawImage(img, 0, 28, W, mapH);
    g.fillStyle = "rgba(4,10,25,0.35)";
    g.fillRect(0, 28, W, mapH);
    for (let pass = 0; pass < 3; pass++) {
      g.strokeStyle = pass === 1 ? "#ffd34d" : "rgba(255,211,77,0.35)";
      g.lineWidth = pass === 1 ? 2.5 : 1.5;
      g.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const y = 28 + mapH / 2 - Math.sin((x / W) * Math.PI * 2 + pass * 0.4 - 1) * mapH * 0.287;
        if (x === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
    const ix = W * 0.42;
    const iy = 28 + mapH / 2 - Math.sin((ix / W) * Math.PI * 2 + 0.4 - 1) * mapH * 0.287;
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.arc(ix, iy, 6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#1b2a44";
    g.fillRect(0, 0, W, 28);
    g.fillRect(0, H - 36, W, 36);
    g.fillStyle = "#cfe0ff";
    g.font = "bold 15px monospace";
    g.fillText("ISS LIVE TRACKER", 12, 19);
    g.fillText("ALT 418 km   VEL 7.66 km/s", 12, H - 13);
    g.fillStyle = "#7cf29a";
    g.fillText("AOS", W - 46, 19);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [earth]);
}

/** Places children in a module's local frame (local z = absolute along its axis). */
function InModule({ id, children }: { id: ModuleId; children: ReactNode }) {
  const m = getModule(id);
  const f = useMemo(() => frameProps(m.axis, m.c), [m]);
  return (
    <group position={f.position} quaternion={f.quaternion}>
      {children}
    </group>
  );
}

function Laptop({ screen, mats, ...props }: { screen: THREE.Texture; mats: Mats } & ThreeElements["group"]) {
  return (
    <group {...props}>
      <mesh position={[0, -0.05, -0.12]} rotation={[Math.PI / 2, 0, 0]} material={mats.rail}>
        <cylinderGeometry args={[0.012, 0.012, 0.24, 8]} />
      </mesh>
      <mesh material={mats.dark}>
        <boxGeometry args={[0.34, 0.022, 0.24]} />
      </mesh>
      <group position={[0, 0.011, -0.12]} rotation={[-0.32, 0, 0]}>
        <mesh position={[0, 0.115, 0]} material={mats.dark}>
          <boxGeometry args={[0.34, 0.23, 0.012]} />
        </mesh>
        <mesh position={[0, 0.115, 0.0065]}>
          <planeGeometry args={[0.31, 0.195]} />
          <meshBasicMaterial map={screen} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** Laptop on a module's port (-x) or starboard (+x) wall, `along` metres from its s0 end. */
function WallLaptop({ id, side, along, y, screen, mats }: { id: ModuleId; side: 1 | -1; along: number; y: number; screen: THREE.Texture; mats: Mats }) {
  const m = getModule(id);
  const x = side * (m.half - 0.2);
  return (
    <InModule id={id}>
      <Laptop screen={screen} mats={mats} position={[x, y, m.s0 + along]} rotation={[0, -side * (Math.PI / 2), 0]} />
    </InModule>
  );
}

type Floater = {
  mod: ModuleId;
  local: [number, number, number]; // x, y offset, fraction along module
  amp: [number, number, number];
  spin: [number, number, number];
  phase: number;
  kind: "pouch" | "tape" | "pen" | "bag" | "drink";
};

const FLOATERS: Floater[] = [
  { mod: "destiny", local: [0.25, 0.2, 0.3], amp: [0.06, 0.05, 0.08], spin: [0.2, 0.35, 0.1], phase: 0, kind: "pouch" },
  { mod: "destiny", local: [-0.3, -0.25, 0.6], amp: [0.05, 0.07, 0.05], spin: [0.5, 0.1, 0.3], phase: 1.7, kind: "tape" },
  { mod: "unity", local: [0.5, -0.3, 0.5], amp: [0.08, 0.04, 0.06], spin: [0.15, 0.6, 0.25], phase: 3.1, kind: "pen" },
  { mod: "harmony", local: [-0.6, 0.55, 0.3], amp: [0.06, 0.06, 0.1], spin: [0.1, 0.2, 0.15], phase: 4.4, kind: "bag" },
  { mod: "columbus", local: [0.3, -0.2, 0.5], amp: [0.05, 0.05, 0.05], spin: [0.3, 0.25, 0.4], phase: 2.2, kind: "drink" },
  { mod: "kibo", local: [-0.2, 0.3, 0.4], amp: [0.04, 0.06, 0.05], spin: [0.4, 0.2, 0.3], phase: 5.2, kind: "pen" },
  { mod: "zvezda", local: [0.3, 0.2, 0.6], amp: [0.06, 0.05, 0.08], spin: [0.2, 0.3, 0.2], phase: 0.8, kind: "pouch" },
  { mod: "zarya", local: [-0.3, -0.2, 0.5], amp: [0.06, 0.06, 0.1], spin: [0.1, 0.2, 0.15], phase: 2.9, kind: "bag" },
  { mod: "leonardo", local: [0.2, 0.3, 0.5], amp: [0.05, 0.07, 0.05], spin: [0.5, 0.1, 0.3], phase: 3.8, kind: "tape" },
];

const FLOATER_POS = FLOATERS.map((f) => {
  const m = getModule(f.mod);
  return localToWorld(m.axis, m.c, f.local[0], f.local[1], m.s0 + (m.s1 - m.s0) * f.local[2]);
});

function FloatingItems() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const foil = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c9cdd2", metalness: 0.85, roughness: 0.32 }), []);
  const tape = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8e9195", roughness: 0.6, metalness: 0.2 }), []);
  const orange = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e0752d", roughness: 0.5 }), []);
  const cloth = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e9e6dd", roughness: 0.95 }), []);
  const blue = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2f5ea8", roughness: 0.6 }), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    FLOATERS.forEach((f, i) => {
      const g = refs.current[i];
      const p = FLOATER_POS[i]!;
      if (!g) return;
      g.position.set(
        p.x + Math.sin(t * 0.21 + f.phase) * f.amp[0],
        p.y + Math.sin(t * 0.17 + f.phase * 1.3) * f.amp[1],
        p.z + Math.sin(t * 0.13 + f.phase * 0.7) * f.amp[2],
      );
      g.rotation.set(t * f.spin[0] + f.phase, t * f.spin[1], t * f.spin[2]);
    });
  });

  return (
    <group>
      {FLOATERS.map((f, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          {f.kind === "pouch" && (
            <mesh material={foil}>
              <boxGeometry args={[0.12, 0.17, 0.018]} />
            </mesh>
          )}
          {f.kind === "tape" && (
            <mesh material={tape}>
              <torusGeometry args={[0.045, 0.022, 10, 24]} />
            </mesh>
          )}
          {f.kind === "pen" && (
            <mesh material={orange}>
              <cylinderGeometry args={[0.005, 0.005, 0.14, 8]} />
            </mesh>
          )}
          {f.kind === "bag" && (
            <mesh material={cloth} scale={[1, 0.6, 0.45]}>
              <boxGeometry args={[0.3, 0.3, 0.3]} />
            </mesh>
          )}
          {f.kind === "drink" && (
            <group>
              <mesh material={foil} scale={[1, 1.3, 0.35]}>
                <sphereGeometry args={[0.055, 16, 12]} />
              </mesh>
              <mesh position={[0, 0.085, 0]} material={blue}>
                <cylinderGeometry args={[0.008, 0.008, 0.05, 8]} />
              </mesh>
            </group>
          )}
        </group>
      ))}
    </group>
  );
}

/** Loose cable bundles strung along Destiny's corners. */
function Cables({ mats }: { mats: Mats }) {
  const m = getModule("destiny");
  const geos = useMemo(() => {
    const h = m.half - m.chamfer * 0.6;
    const z = (d: number) => m.s0 + d;
    const runs: THREE.Vector3[][] = [
      [
        new THREE.Vector3(h, -h, z(0.8)),
        new THREE.Vector3(h - 0.12, -h + 0.18, z(2.4)),
        new THREE.Vector3(h - 0.04, -h + 0.05, z(3.8)),
        new THREE.Vector3(h - 0.18, -h + 0.25, z(5.2)),
        new THREE.Vector3(h, -h, z(6.6)),
      ],
      [
        new THREE.Vector3(-h, h, z(1.5)),
        new THREE.Vector3(-h + 0.2, h - 0.22, z(2.8)),
        new THREE.Vector3(-h + 0.05, h - 0.06, z(4.4)),
        new THREE.Vector3(-h, h, z(5.6)),
      ],
    ];
    return runs.map((pts) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.011, 8));
  }, [m]);
  return (
    <InModule id="destiny">
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} material={mats.dark} />
      ))}
    </InModule>
  );
}

export function InteriorProps({ mats, earth }: { mats: Mats; earth: THREE.Texture }) {
  const screen = useTrackerTexture(earth);
  return (
    <group>
      <WallLaptop id="destiny" side={-1} along={4} y={-0.05} screen={screen} mats={mats} />
      <WallLaptop id="destiny" side={1} along={6.4} y={0.15} screen={screen} mats={mats} />
      <WallLaptop id="columbus" side={-1} along={3} y={0} screen={screen} mats={mats} />
      <WallLaptop id="kibo" side={1} along={5} y={0.1} screen={screen} mats={mats} />
      <WallLaptop id="zvezda" side={-1} along={7} y={0} screen={screen} mats={mats} />
      <FloatingItems />
      <Cables mats={mats} />
    </group>
  );
}
