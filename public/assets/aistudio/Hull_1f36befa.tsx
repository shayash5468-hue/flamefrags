import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SUN_DIR } from "../constants";
import { HATCHES, MODULES, getModule, type Module, type Style } from "./layout";
import { axisFrame } from "./Modules";

// Outer skin of the station: white MMOD shields around every module, docking
// stubs, the main truss, radiators and solar wings. It is only ever drawn where
// the Cupola glass has marked the stencil buffer, so it never shows through
// interior walls, yet looking out of the Cupola you see the station's outside.

export const STENCIL_WINDOW = 1;
const SUN = new THREE.Vector3(...SUN_DIR).normalize();

const vert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  void main() {
    vUv = uv;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`;
const frag = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 tint;
  uniform vec3 sunDir;
  uniform float sheen;
  varying vec2 vUv;
  varying vec3 vN;
  void main() {
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    vec3 base = texture2D(map, vUv).rgb * tint;
    float sun = max(dot(n, sunDir), 0.0);
    float earth = max(-n.y, 0.0);
    vec3 col = base * (sun * 1.25 + vec3(0.22, 0.32, 0.5) * earth * 0.9 + 0.04);
    col += sheen * pow(sun, 8.0) * vec3(1.0, 0.95, 0.85);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function hullMaterial(map: THREE.Texture, tint: string, sheen = 0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      tint: { value: new THREE.Color(tint) },
      sunDir: { value: SUN },
      sheen: { value: sheen },
    },
    vertexShader: vert,
    fragmentShader: frag,
    side: THREE.DoubleSide,
    // in the transparent pass so it draws after the glass has written the stencil
    transparent: true,
    depthWrite: true,
    stencilWrite: true,
    stencilRef: STENCIL_WINDOW,
    stencilFunc: THREE.EqualStencilFunc,
    stencilFail: THREE.KeepStencilOp,
    stencilZFail: THREE.KeepStencilOp,
    stencilZPass: THREE.KeepStencilOp,
  });
}

function canvasTex(draw: (g: CanvasRenderingContext2D, S: number) => void, S = 512) {
  const c = document.createElement("canvas");
  c.width = c.height = S;
  draw(c.getContext("2d")!, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Quilted micrometeoroid shield panels. */
const shieldTexture = () =>
  canvasTex((g, S) => {
    g.fillStyle = "#e4e1d8";
    g.fillRect(0, 0, S, S);
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const cell = S / 4;
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const v = 215 + Math.floor(rnd() * 30);
        g.fillStyle = `rgb(${v},${v - 2},${v - 8})`;
        g.fillRect(i * cell + 3, j * cell + 3, cell - 6, cell - 6);
        // quilting stitches
        g.fillStyle = "rgba(120,115,105,0.35)";
        for (let k = 1; k < 4; k++)
          for (let l = 1; l < 4; l++) g.fillRect(i * cell + (k * cell) / 4 - 1, j * cell + (l * cell) / 4 - 1, 2, 2);
      }
    g.strokeStyle = "rgba(70,68,62,0.6)";
    g.lineWidth = 4;
    for (let i = 0; i <= 4; i++) {
      g.beginPath();
      g.moveTo(i * cell, 0);
      g.lineTo(i * cell, S);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i * cell);
      g.lineTo(S, i * cell);
      g.stroke();
    }
    // handrails (yellow) and a few dark tie-downs
    g.fillStyle = "#c9a640";
    g.fillRect(cell * 1.2, cell * 0.5, cell * 1.6, 6);
    g.fillStyle = "#3a3a3a";
    for (let k = 0; k < 5; k++) g.fillRect(rnd() * S, rnd() * S, 10, 10);
  });

/** Solar cells: dark blue-amber grid. */
const solarTexture = () =>
  canvasTex((g, S) => {
    g.fillStyle = "#1b1f2e";
    g.fillRect(0, 0, S, S);
    const n = 16;
    const c = S / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const t = 0.8 + ((i * 7 + j * 13) % 5) * 0.05;
        g.fillStyle = `rgb(${Math.floor(70 * t)},${Math.floor(58 * t)},${Math.floor(38 * t)})`;
        g.fillRect(i * c + 1.5, j * c + 1.5, c - 3, c - 3);
      }
    g.fillStyle = "#c9c2b0";
    g.fillRect(0, S / 2 - 3, S, 6);
  });

/** Truss lattice. */
const trussTexture = () =>
  canvasTex((g, S) => {
    g.fillStyle = "#4a4c50";
    g.fillRect(0, 0, S, S);
    g.strokeStyle = "#cfccc4";
    g.lineWidth = 14;
    g.strokeRect(0, 0, S, S);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(S, S);
    g.moveTo(S, 0);
    g.lineTo(0, S);
    g.stroke();
    g.fillStyle = "#8a8780";
    g.fillRect(S * 0.4, S * 0.4, S * 0.2, S * 0.2);
  }, 256);

const radiatorTexture = () =>
  canvasTex((g, S) => {
    g.fillStyle = "#eeece6";
    g.fillRect(0, 0, S, S);
    g.strokeStyle = "rgba(90,90,90,0.5)";
    g.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      g.beginPath();
      g.moveTo(0, (i * S) / 8);
      g.lineTo(S, (i * S) / 8);
      g.stroke();
    }
  }, 256);

// ---------------------------------------------------------------- geometry

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3(1, 1, 1);
const T = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)).clone(), _s);

function scaleUv(g: THREE.BufferGeometry, su: number, sv: number) {
  const uv = g.attributes["uv"] as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
}

function prep(g: THREE.BufferGeometry, m: THREE.Matrix4) {
  const out = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(out.attributes)) if (!["position", "normal", "uv"].includes(k)) out.deleteAttribute(k);
  out.clearGroups();
  return out.applyMatrix4(m);
}

/** Radius of the octagonal cabin's corners plus a little clearance. */
export function hullRadius(m: Pick<Module, "half" | "chamfer">) {
  return Math.hypot(m.half, m.half - m.chamfer) + 0.04;
}

/** A tube along local z (absolute coordinates z0..z1) in a module/hatch frame. */
function tube(r: number, z0: number, z1: number, segs = 36) {
  const len = z1 - z0;
  const g = new THREE.CylinderGeometry(r, r, len, segs, 1, true);
  scaleUv(g, (2 * Math.PI * r) / 1.6, len / 1.6);
  return g.applyMatrix4(T(0, 0, (z0 + z1) / 2, Math.PI / 2, 0, 0));
}

function ring(inner: number, outer: number, z: number, facing: 1 | -1) {
  const g = new THREE.RingGeometry(Math.max(inner, 0.001), outer, 36, 1);
  scaleUv(g, outer / 1.6, outer / 1.6);
  return g.applyMatrix4(T(0, 0, z, 0, facing === 1 ? 0 : Math.PI, 0));
}

function buildShell(): Record<Style | "metal", THREE.BufferGeometry> {
  const parts: Record<Style | "metal", THREE.BufferGeometry[]> = { us: [], ru: [], beam: [], metal: [] };

  for (const m of MODULES) {
    if (m.kind === "cupola") continue;
    const F = axisFrame(m.axis, m.c);
    const r = hullRadius(m);
    parts[m.style].push(prep(tube(r, m.s0, m.s1), F));
    for (const end of ["s0", "s1"] as const) {
      const z = m[end];
      const h = HATCHES.find((x) => x.axis === m.axis && (x.low === m.id || x.high === m.id) && (Math.abs(x.p0 - z) < 1e-6 || Math.abs(x.p1 - z) < 1e-6));
      const inner = h ? h.size + 0.3 : 0;
      parts[m.style].push(prep(ring(inner, r, z, end === "s1" ? 1 : -1), F));
    }
  }

  for (const h of HATCHES) {
    const F = axisFrame(h.axis, h.center);
    if (!h.locked) {
      const cupola = [h.low, h.high].some((id) => id && getModule(id).kind === "cupola");
      parts.metal.push(prep(tube(cupola ? CUPOLA_NECK_R : h.size + 0.3, h.p0 - 0.05, h.p1 + 0.05), F));
      continue;
    }
    // docking port: short stub with a flange, pointing out of the module
    const m = getModule((h.low ?? h.high)!);
    const out = h.low ? 1 : -1;
    const base = h.p0;
    const reach = (h.axis === m.axis ? 0 : hullRadius(m) - m.half) + 0.55;
    const z0 = Math.min(base, base + out * reach);
    const z1 = Math.max(base, base + out * reach);
    parts.metal.push(prep(tube(h.size + 0.25, z0, z1, 28), F));
    const tip = base + out * reach;
    parts.metal.push(prep(tube(h.size + 0.38, Math.min(tip, tip - out * 0.12), Math.max(tip, tip - out * 0.12), 28), F));
    parts.metal.push(prep(ring(0, h.size + 0.38, tip, out as 1 | -1), F));
  }

  return Object.fromEntries(
    Object.entries(parts).map(([k, list]) => [k, list.length ? mergeGeometries(list, false)! : new THREE.BufferGeometry()]),
  ) as Record<Style | "metal", THREE.BufferGeometry>;
}

const CUPOLA_NECK_R = 0.95;

/** Main truss above Destiny with radiators and solar wings at the ends. */
function buildTruss() {
  const destiny = getModule("destiny");
  const ty = destiny.c.y + hullRadius(destiny) + 1.6;
  const tz = destiny.c.z;
  const half = 52;
  const truss: THREE.BufferGeometry[] = [];
  const box = new THREE.BoxGeometry(2 * half, 1.8, 1.8);
  scaleUv(box, (2 * half) / 1.8, 1);
  truss.push(prep(box, T(0, ty, tz)));
  // stand-off from Destiny up to the truss
  truss.push(prep(new THREE.BoxGeometry(1.2, 1.6, 1.2), T(0, ty - 1.4, tz)));

  const solar: THREE.BufferGeometry[] = [];
  const wingLen = 17;
  const wingW = 4.4;
  // tilt the wings toward the sun around the truss (x) axis
  const beta = Math.atan2(SUN.z, SUN.y);
  for (const sx of [-1, 1]) {
    for (const xOff of [34, 46]) {
      const x = sx * xOff;
      for (const dz of [-1, 1]) {
        const g = new THREE.PlaneGeometry(wingW, wingLen, 1, 1);
        scaleUv(g, 1, wingLen / 4.4);
        const wing = new THREE.Matrix4()
          .multiply(T(x, ty, tz))
          .multiply(T(0, 0, 0, -beta, 0, 0))
          .multiply(T(0, 0, dz * (wingLen / 2 + 1.2), -Math.PI / 2, 0, 0));
        solar.push(prep(g, wing));
      }
      truss.push(prep(new THREE.BoxGeometry(1.2, 1.2, 1.2), T(x, ty, tz)));
    }
  }

  const rad: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const g = new THREE.BoxGeometry(0.08, 3.2, 3.0);
      rad.push(prep(g, T(sx * 20, ty - 2.8 - i * 3.3, tz + 1.5)));
    }
  }
  _m.identity();
  return {
    truss: mergeGeometries(truss, false)!,
    solar: mergeGeometries(solar, false)!,
    rad: mergeGeometries(rad, false)!,
  };
}

export function StationHull() {
  const { meshes, mats } = useMemo(() => {
    const shield = shieldTexture();
    const mats = {
      us: hullMaterial(shield, "#ffffff"),
      ru: hullMaterial(shield, "#e2e6d6"),
      beam: hullMaterial(shield, "#f4f1e8"),
      metal: hullMaterial(shield, "#9c9a94", 0.35),
      truss: hullMaterial(trussTexture(), "#ffffff", 0.2),
      solar: hullMaterial(solarTexture(), "#ffffff", 0.9),
      rad: hullMaterial(radiatorTexture(), "#ffffff"),
    };
    const shell = buildShell();
    const t = buildTruss();
    const meshes: { geo: THREE.BufferGeometry; mat: keyof typeof mats }[] = [
      { geo: shell.us, mat: "us" },
      { geo: shell.ru, mat: "ru" },
      { geo: shell.beam, mat: "beam" },
      { geo: shell.metal, mat: "metal" },
      { geo: t.truss, mat: "truss" },
      { geo: t.solar, mat: "solar" },
      { geo: t.rad, mat: "rad" },
    ];
    return { meshes, mats };
  }, []);

  return (
    <group>
      {meshes.map((m) => (
        <mesh key={m.mat} geometry={m.geo} material={mats[m.mat]} renderOrder={10} frustumCulled={false} />
      ))}
    </group>
  );
}
