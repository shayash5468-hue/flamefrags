import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  CUPOLA,
  HATCHES,
  MODULES,
  getModule,
  moduleOpenings,
  type Axis,
  type Hatch,
  type Module,
  type Vec3,
} from "./layout";
import { sim } from "./input";

export type MatKey =
  | "rack"
  | "stow"
  | "panel"
  | "frame"
  | "dark"
  | "led"
  | "glass"
  | "rail"
  | "ru"
  | "ruPanel"
  | "fabric";
export type Mats = Record<MatKey, THREE.Material>;

const PANEL_TILE = 1.2; // metres covered by one panel texture repeat

// ---------------------------------------------------------------- helpers

type V3 = [number, number, number];
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const ONE = new THREE.Vector3(1, 1, 1);
const M = (pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0]) =>
  new THREE.Matrix4().compose(_p.set(...pos), _q.setFromEuler(_e.set(rot[0], rot[1], rot[2])), ONE);
const mul = (...ms: THREE.Matrix4[]) => ms.reduce((a, b) => a.clone().multiply(b));

/** Local frame of a module / hatch: local z runs along `axis` (absolute coordinate). */
export function axisFrame(axis: Axis, c: Vec3): THREE.Matrix4 {
  if (axis === "z") return M([c.x, c.y, 0]);
  if (axis === "x") return M([0, c.y, c.z], [0, Math.PI / 2, 0]);
  return M([c.x, 0, c.z], [-Math.PI / 2, 0, 0]);
}

export function frameProps(axis: Axis, c: Vec3) {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  axisFrame(axis, c).decompose(position, quaternion, new THREE.Vector3());
  return { position, quaternion };
}

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
const hash = (str: string) => [...str].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 2147483647, 7) || 1;

const KEEP = new Set(["position", "normal", "uv"]);

/** Collects transformed geometry per material and merges it into one mesh each. */
class Batch {
  private parts = new Map<MatKey, THREE.BufferGeometry[]>();
  add(key: MatKey, geo: THREE.BufferGeometry, m: THREE.Matrix4) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const name of Object.keys(g.attributes)) if (!KEEP.has(name)) g.deleteAttribute(name);
    g.clearGroups();
    g.applyMatrix4(m);
    let list = this.parts.get(key);
    if (!list) this.parts.set(key, (list = []));
    list.push(g);
  }
  build() {
    return [...this.parts].map(([key, list]) => {
      const geo = mergeGeometries(list, false)!;
      list.forEach((g) => g.dispose());
      geo.computeBoundingSphere();
      return { key, geo };
    });
  }
}

function segmentGeometry(len: number, w: number, u0: number, uSpan: number, vSpan = 1, flip = false) {
  const g = new THREE.PlaneGeometry(len, w);
  const uv = g.attributes["uv"] as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    // flip turns the image 180° so labels read upright on the port wall
    const u = flip ? 1 - uv.getX(i) : uv.getX(i);
    const v = flip ? 1 - uv.getY(i) : uv.getY(i);
    uv.setXY(i, u0 + u * uSpan, v * vSpan);
  }
  uv.needsUpdate = true;
  return g;
}

function roundedRect(path: THREE.Path | THREE.Shape, h: number, r: number, cx = 0, cy = 0) {
  path.moveTo(cx - h + r, cy - h);
  path.lineTo(cx + h - r, cy - h);
  path.quadraticCurveTo(cx + h, cy - h, cx + h, cy - h + r);
  path.lineTo(cx + h, cy + h - r);
  path.quadraticCurveTo(cx + h, cy + h, cx + h - r, cy + h);
  path.lineTo(cx - h + r, cy + h);
  path.quadraticCurveTo(cx - h, cy + h, cx - h, cy + h - r);
  path.lineTo(cx - h, cy - h + r);
  path.quadraticCurveTo(cx - h, cy - h, cx - h + r, cy - h);
  return path;
}

function opening(path: THREE.Path | THREE.Shape, shape: "square" | "round", size: number, cx = 0, cy = 0) {
  if (shape === "round") path.absarc(cx, cy, size, 0, Math.PI * 2, false);
  else roundedRect(path, size, 0.16, cx, cy);
  return path;
}

function scaleUv(g: THREE.BufferGeometry, s: number) {
  const uv = g.attributes["uv"] as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / s + 0.5, uv.getY(i) / s + 0.5);
  uv.needsUpdate = true;
  return g;
}

// ---------------------------------------------------------------- shared shapes

const HANDRAIL = new THREE.CylinderGeometry(0.014, 0.014, 0.5, 6);
const STANDOFF = new THREE.CylinderGeometry(0.012, 0.012, 0.06, 5);

function frameRing(shape: "square" | "round", size: number) {
  const s = new THREE.Shape();
  if (shape === "round") s.absarc(0, 0, size + 0.12, 0, Math.PI * 2, false);
  else roundedRect(s, size + 0.12, 0.24);
  s.holes.push(opening(new THREE.Path(), shape, size));
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.12,
    bevelEnabled: true,
    bevelSize: 0.015,
    bevelThickness: 0.015,
    bevelSegments: 1,
    curveSegments: shape === "round" ? 24 : 6,
  });
  g.translate(0, 0, -0.06);
  return g;
}

/** Left half of a sliding hatch door (x <= 0), centred on z = 0. */
function doorHalf(shape: "square" | "round", size: number) {
  const r = size + 0.05;
  const s = new THREE.Shape();
  s.moveTo(0, -r);
  if (shape === "round") {
    s.absarc(0, 0, r, -Math.PI / 2, Math.PI / 2, true);
  } else {
    s.lineTo(-r + 0.14, -r);
    s.quadraticCurveTo(-r, -r, -r, -r + 0.14);
    s.lineTo(-r, r - 0.14);
    s.quadraticCurveTo(-r, r, -r + 0.14, r);
    s.lineTo(0, r);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.05,
    bevelEnabled: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    bevelSegments: 1,
    curveSegments: 16,
  });
  g.translate(0, 0, -0.025);
  return scaleUv(g, PANEL_TILE);
}

const doorStrip = (size: number) => new THREE.BoxGeometry(0.03, 2 * size + 0.08, 0.07);
const doorBar = new THREE.BoxGeometry(0.04, 0.26, 0.03);

// ---------------------------------------------------------------- modules

const trimFor = (m: Module): MatKey => (m.style === "ru" ? "ruPanel" : m.style === "beam" ? "fabric" : "panel");

function buildModule(b: Batch, m: Module) {
  if (m.kind === "cupola") return buildCupola(b, m);
  const F = axisFrame(m.axis, m.c);
  const { half, chamfer, s0: z0, s1: z1 } = m;
  const L = z1 - z0;
  const zc = (z0 + z1) / 2;
  const w = 2 * (half - chamfer);
  const rnd = seeded(hash(m.id));
  const trim = trimFor(m);
  const { sides, s0, s1 } = moduleOpenings(m);
  const wallRot = M([0, 0, 0], [0, -Math.PI / 2, 0]);

  for (let k = 0; k < 4; k++) {
    const kind = m.faces[k]!;
    const R = mul(F, M([0, 0, 0], [0, 0, (k * Math.PI) / 2]));
    const ops = sides.filter((o) => o.face === k).sort((a, b) => a.at - b.at);
    const cuts: { a0: number; a1: number; op?: (typeof ops)[number] }[] = [];
    let cur = z0;
    for (const o of ops) {
      const oc = zc + o.at;
      const hl = o.size + 0.3;
      const a0 = Math.max(cur, oc - hl);
      if (a0 - cur > 0.05) cuts.push({ a0: cur, a1: a0 });
      const a1 = Math.min(z1, oc + hl);
      cuts.push({ a0, a1, op: o });
      cur = a1;
    }
    if (z1 - cur > 0.05) cuts.push({ a0: cur, a1: z1 });

    for (const cut of cuts) {
      const len = cut.a1 - cut.a0;
      const mid = (cut.a0 + cut.a1) / 2;
      if (cut.op) {
        const s = new THREE.Shape();
        s.moveTo(-len / 2, -w / 2);
        s.lineTo(len / 2, -w / 2);
        s.lineTo(len / 2, w / 2);
        s.lineTo(-len / 2, w / 2);
        s.closePath();
        if (cut.op.hole) s.holes.push(opening(new THREE.Path(), cut.op.shape, cut.op.size, zc + cut.op.at - mid, 0));
        b.add(trim, scaleUv(new THREE.ShapeGeometry(s, 16), PANEL_TILE), mul(R, M([half, 0, mid]), wallRot));
        continue;
      }
      const n = Math.max(1, Math.round(len / w));
      const segLen = len / n;
      for (let i = 0; i < n; i++) {
        const z = cut.a0 + segLen * (i + 0.5);
        let key: MatKey;
        let geo: THREE.BufferGeometry;
        if (kind === "panel") {
          key = trim;
          geo = segmentGeometry(segLen, w, rnd(), segLen / PANEL_TILE, w / PANEL_TILE);
        } else {
          if (kind === "rack" || kind === "stow") {
            const useStow = kind === "stow" ? rnd() > 0.15 : rnd() < 0.25;
            key = useStow ? "stow" : "rack";
          } else key = kind;
          const u0 = Math.floor(rnd() * 4) * 0.25;
          geo = segmentGeometry(segLen, w, u0, segLen / (2 * w), 1, k === 2);
        }
        b.add(key, geo, mul(R, M([half, 0, z]), wallRot));
      }
      if (kind === "rack" || kind === "stow" || kind === "ru") {
        const seam = new THREE.BoxGeometry(0.025, w, 0.045);
        for (let i = 0; i <= n; i++) b.add("frame", seam, mul(R, M([half - 0.012, 0, cut.a0 + i * segLen])));
      }
    }
  }

  // corner strips: trim panels, LED light strips overhead, handrails below
  const chamferGeo = segmentGeometry(L, chamfer * Math.SQRT2, 0, L / PANEL_TILE, (chamfer * Math.SQRT2) / PANEL_TILE);
  const d = (half - chamfer / 2) * Math.SQRT2;
  const stops: number[] = [];
  for (let z = z0 + 0.75; z < z1 - 0.3; z += 1.5) stops.push(z);
  const led = new THREE.BoxGeometry(0.02, chamfer * 0.9, 0.9);
  for (let k = 0; k < 4; k++) {
    const R = mul(F, M([0, 0, 0], [0, 0, Math.PI / 4 + (k * Math.PI) / 2]));
    b.add(trim, chamferGeo, mul(R, M([d, 0, zc]), wallRot));
    for (const z of stops) {
      if (k < 2) b.add("led", led, mul(R, M([d - 0.015, 0, z])));
      else {
        b.add("rail", HANDRAIL, mul(R, M([d - 0.06, 0, z], [Math.PI / 2, 0, 0])));
        for (const dz of [-0.22, 0.22]) b.add("rail", STANDOFF, mul(R, M([d - 0.03, 0, z + dz], [0, 0, Math.PI / 2])));
      }
    }
  }

  // end bulkheads (octagons) with a hatchway cut out where a hatch is
  for (const [z, facing, cap] of [
    [z0, 1, s0],
    [z1, -1, s1],
  ] as const) {
    const s = new THREE.Shape();
    const c = chamfer;
    s.moveTo(-half + c, -half);
    s.lineTo(half - c, -half);
    s.lineTo(half, -half + c);
    s.lineTo(half, half - c);
    s.lineTo(half - c, half);
    s.lineTo(-half + c, half);
    s.lineTo(-half, half - c);
    s.lineTo(-half, -half + c);
    s.closePath();
    if (cap?.hole) s.holes.push(opening(new THREE.Path(), cap.shape, cap.size));
    b.add(trim, scaleUv(new THREE.ShapeGeometry(s, 16), PANEL_TILE), mul(F, M([0, 0, z], [0, facing === 1 ? 0 : Math.PI, 0])));
  }
}

/** Hexagonal ring between an inner circle and an outer hexagon, lying flat. */
function hexRingGeometry(innerR: number, hexR: number, segments = 72) {
  const pos: number[] = [];
  const apothem = hexR * Math.cos(Math.PI / 6);
  const hexDist = (phi: number) => {
    let rel = (phi - Math.PI / 6) % (Math.PI / 3);
    if (rel < 0) rel += Math.PI / 3;
    rel -= Math.PI / 6;
    return apothem / Math.cos(rel);
  };
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const ix0 = Math.cos(a0) * innerR,
      iz0 = Math.sin(a0) * innerR;
    const ix1 = Math.cos(a1) * innerR,
      iz1 = Math.sin(a1) * innerR;
    const ox0 = Math.cos(a0) * hexDist(a0),
      oz0 = Math.sin(a0) * hexDist(a0);
    const ox1 = Math.cos(a1) * hexDist(a1),
      oz1 = Math.sin(a1) * hexDist(a1);
    pos.push(ix0, 0, iz0, ox0, 0, oz0, ox1, 0, oz1);
    pos.push(ix0, 0, iz0, ox1, 0, oz1, ix1, 0, iz1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const uv: number[] = [];
  for (let i = 0; i < pos.length; i += 3) uv.push(pos[i]! / PANEL_TILE, pos[i + 2]! / PANEL_TILE);
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** Seven-window observation dome; local y = 0 is its ceiling under Node 3's neck. */
function buildCupola(b: Batch, m: Module) {
  const G = M([m.c.x, m.s1, m.c.z]);
  const botY = -CUPOLA.depth;
  const corner = (r: number, y: number, k: number) =>
    new THREE.Vector3(Math.cos((k * Math.PI) / 3) * r, y, Math.sin((k * Math.PI) / 3) * r);
  const fp: number[] = [];
  const gp: number[] = [];
  const quad = (arr: number[], a: THREE.Vector3, bb: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => {
    arr.push(...a.toArray(), ...bb.toArray(), ...c.toArray(), ...a.toArray(), ...c.toArray(), ...d.toArray());
  };
  for (let k = 0; k < 6; k++) {
    const A = corner(CUPOLA.topRadius, 0, k);
    const B = corner(CUPOLA.topRadius, 0, k + 1);
    const C = corner(CUPOLA.bottomRadius, botY, k + 1);
    const D = corner(CUPOLA.bottomRadius, botY, k);
    const cen = A.clone().add(B).add(C).add(D).multiplyScalar(0.25);
    const ins = (p: THREE.Vector3, t: number) => p.clone().lerp(cen, t);
    const Ai = ins(A, 0.22);
    const Bi = ins(B, 0.22);
    const Ci = ins(C, 0.3);
    const Di = ins(D, 0.3);
    quad(fp, A, B, Bi, Ai);
    quad(fp, B, C, Ci, Bi);
    quad(fp, C, D, Di, Ci);
    quad(fp, D, A, Ai, Di);
    quad(gp, Ai, Bi, Ci, Di);
  }
  const mk = (p: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    const uv: number[] = [];
    for (let i = 0; i < p.length; i += 3) uv.push((p[i]! + p[i + 2]!) / PANEL_TILE, p[i + 1]! / PANEL_TILE);
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  };
  b.add("frame", mk(fp), G);
  b.add("glass", mk(gp), G);
  b.add("panel", hexRingGeometry(CUPOLA.neckRadius, CUPOLA.topRadius), G);
  b.add("frame", hexRingGeometry(CUPOLA.windowRadius, CUPOLA.bottomRadius), mul(G, M([0, botY, 0])));
  const flat = (y: number) => mul(G, M([0, y, 0], [Math.PI / 2, 0, 0]));
  b.add("rail", new THREE.TorusGeometry(CUPOLA.windowRadius + 0.01, 0.025, 8, 48), flat(botY + 0.01));
  b.add("glass", new THREE.CircleGeometry(CUPOLA.windowRadius, 48), flat(botY - 0.01));
  b.add("rail", new THREE.TorusGeometry(1.05, 0.014, 6, 6), flat(-0.06));
}

// ---------------------------------------------------------------- hatches

function buildHatch(b: Batch, h: Hatch) {
  const F = axisFrame(h.axis, h.center);
  const ring = frameRing(h.shape, h.size);
  if (!h.locked) {
    const len = h.p1 - h.p0;
    const mid = (h.p0 + h.p1) / 2;
    const isCupola = [h.low, h.high].some((id) => id && getModule(id).kind === "cupola");
    const tunnelMat: MatKey = h.shape === "round" && !isCupola ? "frame" : "panel";
    if (h.shape === "round") {
      b.add(tunnelMat, new THREE.CylinderGeometry(h.size, h.size, len, 40, 1, true), mul(F, M([0, 0, mid], [Math.PI / 2, 0, 0])));
    } else {
      const g = segmentGeometry(len, 2 * h.size, 0, len / PANEL_TILE, (2 * h.size) / PANEL_TILE);
      for (let k = 0; k < 4; k++) {
        b.add(tunnelMat, g, mul(F, M([0, 0, 0], [0, 0, (k * Math.PI) / 2]), M([h.size, 0, mid], [0, -Math.PI / 2, 0])));
      }
    }
    b.add("frame", ring, mul(F, M([0, 0, h.p0])));
    b.add("frame", ring, mul(F, M([0, 0, h.p1])));
    return;
  }
  // exterior hatch: frame on the wall plus a door that never opens
  const inward = h.low ? -1 : 1;
  b.add("frame", ring, mul(F, M([0, 0, h.p0])));
  const D = mul(F, M([0, 0, h.p0 + inward * 0.05], [0, inward === 1 ? 0 : Math.PI, 0]));
  const half = doorHalf(h.shape, h.size);
  const strip = doorStrip(h.size);
  for (const side of [0, Math.PI]) {
    const S = mul(D, M([0, 0, 0], [0, side, 0]));
    b.add("panel", half, S);
    b.add("dark", strip, mul(S, M([-0.015, 0, 0])));
  }
  b.add("rail", doorBar, mul(D, M([-0.16, 0, 0.05])));
}

// ---------------------------------------------------------------- sliding doors

const OPEN_HATCHES = HATCHES.map((h, i) => ({ h, i })).filter((x) => !x.h.locked);
const smooth = (t: number) => t * t * (3 - 2 * t);

function Doors({ mats }: { mats: Mats }) {
  const parts = useMemo(() => {
    const cache = new Map<string, { half: THREE.BufferGeometry; strip: THREE.BufferGeometry }>();
    return OPEN_HATCHES.map(({ h }) => {
      const key = `${h.shape}${h.size}`;
      let geo = cache.get(key);
      if (!geo) cache.set(key, (geo = { half: doorHalf(h.shape, h.size), strip: doorStrip(h.size) }));
      return { ...frameProps(h.axis, h.center), z: h.center[h.axis], geo, slide: h.size + 0.12 };
    });
  }, []);
  const refs = useRef<(THREE.Group | null)[]>([]);

  useFrame(() => {
    OPEN_HATCHES.forEach(({ i }, n) => {
      const open = sim.doors[i]!.open;
      const shift = parts[n]!.slide * smooth(open);
      const visible = open < 0.995;
      const l = refs.current[2 * n];
      const r = refs.current[2 * n + 1];
      if (l) {
        l.position.x = -shift;
        l.visible = visible;
      }
      if (r) {
        r.position.x = shift;
        r.visible = visible;
      }
    });
  });

  return (
    <group>
      {parts.map((p, n) => (
        <group key={n} position={p.position} quaternion={p.quaternion}>
          {/* the frame's local z is the absolute coordinate along the hatch axis */}
          <group position={[0, 0, p.z]}>
            {[0, 1].map((side) => (
              <group key={side} ref={(el) => (refs.current[2 * n + side] = el)} rotation={[0, side ? Math.PI : 0, 0]}>
                <mesh geometry={p.geo.half} material={mats.panel} />
                <mesh geometry={p.geo.strip} material={mats.dark} position={[-0.015, 0, 0]} />
                <mesh geometry={doorBar} material={mats.rail} position={[-0.18, 0, 0.05]} />
              </group>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- hatch signs

const CELL_W = 512;
const CELL_H = 96;
const COLS = 4;
const SIGN_W = 0.6;
const SIGN_H = (SIGN_W * CELL_H) / CELL_W;

type SignSpec = { text: string; locked: boolean; m: THREE.Matrix4 };

function signSpecs(): SignSpec[] {
  const out: SignSpec[] = [];
  for (const h of HATCHES) {
    const F = axisFrame(h.axis, h.center);
    const lift = (z: number, facingNeg: boolean) =>
      mul(F, M([0, 0, z]), M([0, 0, 0], [0, 0, h.signRoll]), M([0, h.size + 0.12 + 0.14, 0]), M([0, 0, 0], [0, facingNeg ? Math.PI : 0, 0]));
    if (h.locked) {
      const inward = h.low ? -1 : 1;
      out.push({ text: h.label ?? "CLOSED", locked: true, m: lift(h.p0 + inward * 0.02, inward === -1) });
    } else {
      out.push({ text: getModule(h.high!).short, locked: false, m: lift(h.p0 - 0.02, true) });
      out.push({ text: getModule(h.low!).short, locked: false, m: lift(h.p1 + 0.02, false) });
    }
  }
  return out;
}

function drawSign(g: CanvasRenderingContext2D, x: number, y: number, text: string, locked: boolean) {
  g.fillStyle = locked ? "#5c1a16" : "#13233b";
  g.fillRect(x, y, CELL_W, CELL_H);
  g.strokeStyle = "#d8d5cd";
  g.lineWidth = 5;
  g.strokeRect(x + 6, y + 6, CELL_W - 12, CELL_H - 12);
  g.fillStyle = locked ? "#ff8a73" : "#ffc845";
  g.fillRect(x + 18, y + 24, 10, CELL_H - 48);
  let size = 56;
  const maxW = CELL_W - 80;
  do {
    g.font = `bold ${size}px "Barlow Condensed", "Arial Narrow", Arial, sans-serif`;
    size -= 2;
  } while (g.measureText(text).width > maxW && size > 18);
  g.fillStyle = "#f4f2ea";
  g.textBaseline = "middle";
  g.fillText(text, x + 44, y + CELL_H / 2 + 2);
}

function Signs() {
  const { geo, mat } = useMemo(() => {
    const specs = signSpecs();
    const rows = Math.ceil(specs.length / COLS);
    const c = document.createElement("canvas");
    c.width = CELL_W * COLS;
    c.height = CELL_H * rows;
    const g = c.getContext("2d")!;
    const geos = specs.map((s, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      drawSign(g, col * CELL_W, row * CELL_H, s.text, s.locked);
      const p = new THREE.PlaneGeometry(SIGN_W, SIGN_H);
      const uv = p.attributes["uv"] as THREE.BufferAttribute;
      const u0 = col / COLS;
      const vTop = 1 - row / rows;
      const vBot = 1 - (row + 1) / rows;
      for (let j = 0; j < uv.count; j++) uv.setXY(j, u0 + uv.getX(j) / COLS, vBot + uv.getY(j) * (vTop - vBot));
      p.applyMatrix4(s.m);
      return p;
    });
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: "#ffffff",
      emissiveMap: tex,
      emissiveIntensity: 0.4,
      roughness: 0.55,
    });
    return { geo: mergeGeometries(geos, false)!, mat };
  }, []);
  return <mesh geometry={geo} material={mat} />;
}

// ---------------------------------------------------------------- station

export function StationInterior({ mats }: { mats: Mats }) {
  const batches = useMemo(() => {
    const out = MODULES.map((m) => {
      const b = new Batch();
      buildModule(b, m);
      return { id: m.id, parts: b.build() };
    });
    const hb = new Batch();
    for (const h of HATCHES) buildHatch(hb, h);
    out.push({ id: "hatches", parts: hb.build() });
    return out;
  }, []);

  return (
    <group>
      {batches.map((b) => (
        <group key={b.id}>
          {b.parts.map((p) => (
            <mesh key={p.key} geometry={p.geo} material={mats[p.key]} />
          ))}
        </group>
      ))}
      <Doors mats={mats} />
      <Signs />
    </group>
  );
}
