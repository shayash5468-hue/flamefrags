// Pure geometry of the walkable interior: every pressurized module, the
// hatches between them, the free-float volumes the camera may occupy, and
// named viewpoints. No React or three.js.
//
// World frame: -y points at Earth (nadir), the main U.S./Russian axis runs
// along z (Harmony forward at -z, Zvezda aft at +z), starboard is +x.

export type Vec3 = { x: number; y: number; z: number };
export type Axis = "x" | "y" | "z";
export type Dir = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";
export type Style = "us" | "ru" | "beam";
export type Face = "rack" | "stow" | "panel" | "ru" | "fabric";
export type Group = "us" | "intl" | "ru";

/** Clear distance between two modules' walls, filled by a hatch vestibule. */
export const GAP = 0.4;
/** Camera keeps this far from module side walls / end walls. */
const SIDE_MARGIN = 0.3;
const END_MARGIN = 0.4;

/** Cupola dimensions, relative to its ceiling (the plane under Node 3's neck). */
export const CUPOLA = {
  neckLen: 0.35,
  neckRadius: 0.75,
  topRadius: 1.45,
  bottomRadius: 0.8,
  depth: 0.7,
  windowRadius: 0.45,
};

type Port = { dir: Dir; at?: number };

type ModuleSpec = {
  id: string;
  name: string;
  short: string;
  detail: string;
  group: Group;
  length: number;
  half: number;
  chamfer: number;
  style: Style;
  /** [+x, +y, -x, -y] in the module's local frame (local z = module axis). */
  faces: [Face, Face, Face, Face];
  kind?: "cupola";
  parent?: { id: string; port: Port };
  /** Hatches that lead outside the station (docking ports, EVA hatch): always shut. */
  closed?: { port: Port; label: string }[];
  /** Map-only offset (world x, z) for modules that stand vertically. */
  mapOffset?: [number, number];
};

const US4 = (a: Face, b: Face, c: Face, d: Face): [Face, Face, Face, Face] => [a, b, c, d];
const RU: [Face, Face, Face, Face] = ["ru", "ru", "ru", "ru"];

const SPECS: ModuleSpec[] = [
  {
    id: "destiny",
    name: "Destiny",
    short: "DESTINY",
    detail: "U.S. laboratory · science racks",
    group: "us",
    length: 8.6,
    half: 1.05,
    chamfer: 0.3,
    style: "us",
    faces: US4("rack", "stow", "rack", "rack"),
  },
  {
    id: "harmony",
    name: "Harmony · Node 2",
    short: "HARMONY",
    detail: "Hub to Columbus, Kibo and the docking ports",
    group: "us",
    length: 6.4,
    half: 1.5,
    chamfer: 0.4,
    style: "us",
    faces: US4("stow", "stow", "stow", "rack"),
    parent: { id: "destiny", port: { dir: "-z" } },
    closed: [
      { port: { dir: "-z" }, label: "PMA-2 · DOCKING PORT" },
      { port: { dir: "+y" }, label: "PMA-3 · DOCKING PORT" },
      { port: { dir: "-y" }, label: "CARGO BERTHING PORT" },
    ],
  },
  {
    id: "columbus",
    name: "Columbus",
    short: "COLUMBUS",
    detail: "European laboratory · ESA",
    group: "intl",
    length: 6.2,
    half: 1.05,
    chamfer: 0.3,
    style: "us",
    faces: US4("rack", "stow", "rack", "rack"),
    parent: { id: "harmony", port: { dir: "+x" } },
  },
  {
    id: "kibo",
    name: "Kibo",
    short: "KIBO",
    detail: "Japanese laboratory · JAXA",
    group: "intl",
    length: 10.2,
    half: 1.1,
    chamfer: 0.32,
    style: "us",
    faces: US4("rack", "stow", "rack", "rack"),
    parent: { id: "harmony", port: { dir: "-x" } },
    closed: [{ port: { dir: "-x" }, label: "JEM AIRLOCK · CLOSED" }],
  },
  {
    id: "elm",
    name: "Kibo Logistics",
    short: "KIBO ELM",
    detail: "Japanese storage section above Kibo",
    group: "intl",
    length: 3.8,
    half: 1.05,
    chamfer: 0.3,
    style: "us",
    faces: US4("stow", "stow", "stow", "stow"),
    parent: { id: "kibo", port: { dir: "+y", at: 2.4 } },
    mapOffset: [0, -2.6],
  },
  {
    id: "unity",
    name: "Unity · Node 1",
    short: "UNITY",
    detail: "Hub joining the U.S. and Russian sides",
    group: "us",
    length: 5.0,
    half: 1.5,
    chamfer: 0.4,
    style: "us",
    faces: US4("stow", "stow", "stow", "stow"),
    parent: { id: "destiny", port: { dir: "+z" } },
    closed: [
      { port: { dir: "+y" }, label: "Z1 TRUSS · CLOSED" },
      { port: { dir: "-y" }, label: "CARGO BERTHING PORT" },
    ],
  },
  {
    id: "tranquility",
    name: "Tranquility · Node 3",
    short: "TRANQUILITY",
    detail: "Life support · gym · Cupola below",
    group: "us",
    length: 6.4,
    half: 1.5,
    chamfer: 0.4,
    style: "us",
    faces: US4("rack", "stow", "rack", "stow"),
    parent: { id: "unity", port: { dir: "-x" } },
    closed: [{ port: { dir: "-x" }, label: "PORT END · CLOSED" }],
  },
  {
    id: "cupola",
    name: "Cupola",
    short: "CUPOLA",
    detail: "7 windows · looking down at Earth",
    group: "us",
    length: CUPOLA.depth,
    half: CUPOLA.topRadius,
    chamfer: 0,
    style: "us",
    faces: US4("panel", "panel", "panel", "panel"),
    kind: "cupola",
    parent: { id: "tranquility", port: { dir: "-y", at: 0.9 } },
    mapOffset: [0, 0],
  },
  {
    id: "leonardo",
    name: "Leonardo",
    short: "LEONARDO",
    detail: "Permanent storage module",
    group: "us",
    length: 6.0,
    half: 1.05,
    chamfer: 0.3,
    style: "us",
    faces: US4("stow", "stow", "stow", "stow"),
    parent: { id: "tranquility", port: { dir: "-z", at: -0.9 } },
  },
  {
    id: "beam",
    name: "BEAM",
    short: "BEAM",
    detail: "Inflatable expandable module",
    group: "us",
    length: 3.6,
    half: 1.25,
    chamfer: 0.5,
    style: "beam",
    faces: ["fabric", "fabric", "fabric", "fabric"],
    parent: { id: "tranquility", port: { dir: "+z", at: -0.9 } },
  },
  {
    id: "quest",
    name: "Quest Airlock",
    short: "QUEST",
    detail: "Spacewalk airlock · suit storage",
    group: "us",
    length: 5.2,
    half: 1.0,
    chamfer: 0.35,
    style: "us",
    faces: US4("stow", "panel", "stow", "panel"),
    parent: { id: "unity", port: { dir: "+x" } },
    closed: [{ port: { dir: "+x" }, label: "EVA HATCH · CLOSED" }],
  },
  {
    id: "pma1",
    name: "PMA-1",
    short: "PMA-1",
    detail: "Adapter tunnel to the Russian segment",
    group: "us",
    length: 1.8,
    half: 0.95,
    chamfer: 0.3,
    style: "us",
    faces: US4("panel", "panel", "panel", "panel"),
    parent: { id: "unity", port: { dir: "+z" } },
  },
  {
    id: "zarya",
    name: "Zarya",
    short: "ZARYA",
    detail: "First ISS module · storage and fuel",
    group: "ru",
    length: 11,
    half: 1.15,
    chamfer: 0.42,
    style: "ru",
    faces: RU,
    parent: { id: "pma1", port: { dir: "+z" } },
  },
  {
    id: "rassvet",
    name: "Rassvet",
    short: "RASSVET",
    detail: "Russian docking and cargo module",
    group: "ru",
    length: 5.0,
    half: 0.95,
    chamfer: 0.32,
    style: "ru",
    faces: RU,
    parent: { id: "zarya", port: { dir: "-y", at: -3.9 } },
    closed: [{ port: { dir: "-y" }, label: "SOYUZ DOCKING PORT" }],
    mapOffset: [2.6, 0],
  },
  {
    id: "zvezda",
    name: "Zvezda",
    short: "ZVEZDA",
    detail: "Russian service module · crew quarters",
    group: "ru",
    length: 12,
    half: 1.15,
    chamfer: 0.42,
    style: "ru",
    faces: RU,
    parent: { id: "zarya", port: { dir: "+z" } },
    closed: [{ port: { dir: "+z" }, label: "AFT DOCKING PORT" }],
  },
  {
    id: "poisk",
    name: "Poisk",
    short: "POISK",
    detail: "Mini research module · spacewalk exit",
    group: "ru",
    length: 3.8,
    half: 0.95,
    chamfer: 0.32,
    style: "ru",
    faces: RU,
    parent: { id: "zvezda", port: { dir: "+y", at: -4.7 } },
    closed: [{ port: { dir: "+y" }, label: "DOCKING PORT" }],
    mapOffset: [2.6, 0],
  },
  {
    id: "nauka",
    name: "Nauka",
    short: "NAUKA",
    detail: "Russian multipurpose laboratory",
    group: "ru",
    length: 9,
    half: 1.15,
    chamfer: 0.42,
    style: "ru",
    faces: RU,
    parent: { id: "zvezda", port: { dir: "-y", at: -4.7 } },
    mapOffset: [-2.6, 0],
  },
  {
    id: "prichal",
    name: "Prichal",
    short: "PRICHAL",
    detail: "Ball-shaped Russian docking hub",
    group: "ru",
    length: 2.6,
    half: 1.05,
    chamfer: 0.4,
    style: "ru",
    faces: RU,
    parent: { id: "nauka", port: { dir: "-y" } },
    closed: [
      { port: { dir: "-y" }, label: "DOCKING PORT" },
      { port: { dir: "+x" }, label: "DOCKING PORT" },
    ],
    mapOffset: [-5.0, 0],
  },
];

export type ModuleId = string;

export type Module = ModuleSpec & {
  axis: Axis;
  s0: number;
  s1: number;
  /** Centre of the module (axis coordinate = midpoint of s0..s1). */
  c: Vec3;
  /** Parent's port point this module hangs from (root: its own centre). */
  port: Vec3;
  /** Which end faces the parent: entry end. */
  entry: "s0" | "s1";
};

export type Hatch = {
  id: string;
  /** Module on the low-coordinate side and high side (null = outside). */
  low: ModuleId | null;
  high: ModuleId | null;
  axis: Axis;
  /** Along-axis span of the vestibule (p0 = p1 for exterior hatches). */
  p0: number;
  p1: number;
  /** Midpoint of the doorway. */
  center: Vec3;
  /** Half-width (square) or radius (round) of the opening. */
  size: number;
  shape: "square" | "round";
  /** Exterior hatches never open. */
  locked: boolean;
  label?: string;
  /** Roll of the sign around the hatch axis so it lies along the wall. */
  signRoll: number;
};

const parseDir = (d: Dir): { sign: 1 | -1; ax: Axis } => ({
  sign: d[0] === "+" ? 1 : -1,
  ax: d[1] as Axis,
});

const withAxis = (p: Vec3, ax: Axis, v: number): Vec3 => ({ ...p, [ax]: v });

function portPoint(m: Module, port: Port): Vec3 {
  const { sign, ax } = parseDir(port.dir);
  if (ax === m.axis) return withAxis(m.c, ax, sign > 0 ? m.s1 : m.s0);
  const p = withAxis(m.c, m.axis, m.c[m.axis] + (port.at ?? 0));
  return withAxis(p, ax, p[ax] + sign * m.half);
}

function hatchShape(a: ModuleSpec, b: ModuleSpec | null): { shape: "square" | "round"; size: number } {
  if (b?.kind === "cupola") return { shape: "round", size: CUPOLA.neckRadius };
  if (a.style === "ru" || b?.style === "ru") return { shape: "round", size: 0.5 };
  return { shape: "square", size: 0.55 };
}

function signRollFor(axis: Axis, mods: (Module | undefined)[]): number {
  if (axis !== "y") return 0;
  const horizontal = mods.find((m) => m && m.axis !== "y");
  return horizontal?.axis === "x" ? -Math.PI / 2 : 0;
}

function build() {
  const mods: Module[] = [];
  const byId = new Map<string, Module>();
  const hatches: Hatch[] = [];

  for (const spec of SPECS) {
    let m: Module;
    if (!spec.parent) {
      const c = { x: 0, y: 0, z: 0 };
      m = { ...spec, axis: "z", s0: -spec.length / 2, s1: spec.length / 2, c, port: c, entry: "s0" };
    } else {
      const parent = byId.get(spec.parent.id);
      if (!parent) throw new Error(`parent ${spec.parent.id} must come before ${spec.id}`);
      const pp = portPoint(parent, spec.parent.port);
      const { sign, ax } = parseDir(spec.parent.port.dir);
      const gap = spec.kind === "cupola" ? CUPOLA.neckLen : GAP;
      const plane = pp[ax];
      const s0 = sign > 0 ? plane + gap : plane - gap - spec.length;
      const s1 = s0 + spec.length;
      m = {
        ...spec,
        axis: ax,
        s0,
        s1,
        c: withAxis(pp, ax, (s0 + s1) / 2),
        port: pp,
        entry: sign > 0 ? "s0" : "s1",
      };
      const p0 = sign > 0 ? plane : s1;
      const p1 = sign > 0 ? s0 : plane;
      const hs = hatchShape(parent, spec);
      hatches.push({
        id: `${parent.id}-${spec.id}`,
        low: sign > 0 ? parent.id : spec.id,
        high: sign > 0 ? spec.id : parent.id,
        axis: ax,
        p0,
        p1,
        center: withAxis(pp, ax, (p0 + p1) / 2),
        ...hs,
        locked: false,
        signRoll: signRollFor(ax, [parent, m]),
      });
    }
    mods.push(m);
    byId.set(m.id, m);
  }

  for (const m of mods) {
    for (const [i, cl] of (m.closed ?? []).entries()) {
      const pp = portPoint(m, cl.port);
      const { sign, ax } = parseDir(cl.port.dir);
      hatches.push({
        id: `${m.id}-out${i}`,
        low: sign > 0 ? m.id : null,
        high: sign > 0 ? null : m.id,
        axis: ax,
        p0: pp[ax],
        p1: pp[ax],
        center: pp,
        ...hatchShape(m, null),
        locked: true,
        label: cl.label,
        signRoll: signRollFor(ax, [m]),
      });
    }
  }
  return { mods, byId, hatches };
}

const BUILT = build();
export const MODULES: Module[] = BUILT.mods;
export const HATCHES: Hatch[] = BUILT.hatches;
export const getModule = (id: ModuleId): Module => {
  const m = BUILT.byId.get(id);
  if (!m) throw new Error(`unknown module ${id}`);
  return m;
};

// ---------------------------------------------------------------- frames

const OTHER: Record<Axis, [Axis, Axis]> = { x: ["y", "z"], y: ["x", "z"], z: ["x", "y"] };

/**
 * Module-local to world. Local z runs along the module axis (absolute s
 * coordinate); local x/y are offsets from the axis.
 * axis z: identity · axis x: local x -> world -z · axis y: local y -> world -z.
 */
export function localToWorld(axis: Axis, c: Vec3, lx: number, ly: number, lz: number): Vec3 {
  if (axis === "z") return { x: c.x + lx, y: c.y + ly, z: lz };
  if (axis === "x") return { x: lz, y: c.y + ly, z: c.z - lx };
  return { x: c.x + lx, y: lz, z: c.z - ly };
}

/** Index of the local wall face [+x, +y, -x, -y] that a world direction points at. */
export function localFace(axis: Axis, dir: Dir): number {
  const table: Record<Axis, Partial<Record<Dir, number>>> = {
    z: { "+x": 0, "+y": 1, "-x": 2, "-y": 3 },
    x: { "-z": 0, "+y": 1, "+z": 2, "-y": 3 },
    y: { "+x": 0, "-z": 1, "-x": 2, "+z": 3 },
  };
  const f = table[axis][dir];
  if (f === undefined) throw new Error(`${dir} is along ${axis}`);
  return f;
}

export type Opening = { face: number; at: number; size: number; shape: "square" | "round"; hole: boolean };
export type EndCap = { size: number; shape: "square" | "round"; hole: boolean } | null;

/** Wall openings and end caps of a module, derived from the hatch list. */
export function moduleOpenings(m: Module): { sides: Opening[]; s0: EndCap; s1: EndCap } {
  const sides: Opening[] = [];
  let s0: EndCap = null;
  let s1: EndCap = null;
  const mid = (m.s0 + m.s1) / 2;
  for (const h of HATCHES) {
    if (h.low !== m.id && h.high !== m.id) continue;
    const cap = { size: h.size, shape: h.shape, hole: !h.locked };
    if (h.axis === m.axis) {
      if (Math.abs(h.p0 - m.s0) < 1e-6 || Math.abs(h.p1 - m.s0) < 1e-6) s0 = cap;
      else s1 = cap;
    } else {
      const sign = h.low === m.id ? "+" : "-";
      sides.push({ face: localFace(m.axis, `${sign}${h.axis}` as Dir), at: h.center[m.axis] - mid, ...cap });
    }
  }
  return { sides, s0, s1 };
}

// ---------------------------------------------------------------- volumes

type Box = { kind: "box"; min: Vec3; max: Vec3; gate?: string | undefined };
type Cyl = { kind: "cyl"; x: number; z: number; r: number; y0: number; y1: number };
type Volume = Box | Cyl;

function axisBox(axis: Axis, c: Vec3, a0: number, a1: number, half: number, gate?: string): Box {
  const [u, v] = OTHER[axis];
  const min = { ...c, [axis]: a0, [u]: c[u] - half, [v]: c[v] - half } as Vec3;
  const max = { ...c, [axis]: a1, [u]: c[u] + half, [v]: c[v] + half } as Vec3;
  return { kind: "box", min, max, gate };
}

function buildVolumes(): Volume[] {
  const out: Volume[] = [];
  for (const m of MODULES) {
    if (m.kind === "cupola") {
      out.push({ kind: "cyl", x: m.c.x, z: m.c.z, r: 0.6, y0: m.s1 - 0.45, y1: m.s1 });
      continue;
    }
    out.push(axisBox(m.axis, m.c, m.s0 + END_MARGIN, m.s1 - END_MARGIN, m.half - SIDE_MARGIN));
  }
  for (const h of HATCHES) {
    if (h.locked) continue;
    const half = h.shape === "square" ? h.size - 0.2 : h.size * Math.SQRT1_2 - 0.12;
    out.push(axisBox(h.axis, h.center, h.p0 - 0.45, h.p1 + 0.45, half, h.id));
  }
  return out;
}

export const VOLUMES: Volume[] = buildVolumes();

/** Which hatches are currently passable (door open enough). */
export type GateFn = (hatchId: string) => boolean;
const ALL_OPEN: GateFn = () => true;

function inVolume(p: Vec3, v: Volume, open: GateFn): boolean {
  if (v.kind === "box") {
    if (v.gate && !open(v.gate)) return false;
    return p.x >= v.min.x && p.x <= v.max.x && p.y >= v.min.y && p.y <= v.max.y && p.z >= v.min.z && p.z <= v.max.z;
  }
  const dx = p.x - v.x;
  const dz = p.z - v.z;
  return p.y >= v.y0 && p.y <= v.y1 && dx * dx + dz * dz <= v.r * v.r;
}

export function isInside(p: Vec3, open: GateFn = ALL_OPEN): boolean {
  return VOLUMES.some((v) => inVolume(p, v, open));
}

/** Move from prev toward next, sliding along walls one axis at a time. */
export function constrain(prev: Vec3, next: Vec3, open: GateFn = ALL_OPEN): Vec3 {
  if (isInside(next, open)) return { ...next };
  const p = { ...prev };
  for (const axis of ["x", "y", "z"] as const) {
    const candidate = { ...p, [axis]: next[axis] };
    if (isInside(candidate, open)) p[axis] = next[axis];
  }
  return p;
}

/** Module whose interior contains p, or null in a hatchway. */
export function sectionAt(p: Vec3): ModuleId | null {
  for (const m of MODULES) {
    if (m.kind === "cupola") {
      const dx = p.x - m.c.x;
      const dz = p.z - m.c.z;
      if (p.y >= m.s0 && p.y <= m.s1 && dx * dx + dz * dz <= m.half * m.half) return m.id;
      continue;
    }
    const a = p[m.axis];
    if (a < m.s0 || a > m.s1) continue;
    const [u, v] = OTHER[m.axis];
    if (Math.abs(p[u] - m.c[u]) <= m.half && Math.abs(p[v] - m.c[v]) <= m.half) return m.id;
  }
  return null;
}

// ---------------------------------------------------------------- viewpoints

export type Viewpoint = { pos: Vec3; yaw: number; pitch: number };

const yawFor = (dx: number, dz: number) => Math.atan2(-dx, -dz);

function viewpointFor(m: Module): Viewpoint {
  if (m.kind === "cupola") return { pos: { x: m.c.x, y: m.s1 - 0.13, z: m.c.z - 0.3 }, yaw: Math.PI, pitch: -0.36 };
  const look = m.entry === "s0" ? 1 : -1;
  const along = m.entry === "s0" ? m.s0 + 0.7 : m.s1 - 0.7;
  if (m.axis === "y") {
    const parent = m.parent ? getModule(m.parent.id) : m;
    const yaw = parent.axis === "x" ? -Math.PI / 2 : Math.PI;
    return { pos: withAxis(m.c, "y", along), yaw, pitch: look * 1.0 };
  }
  const pos = withAxis(m.c, m.axis, along);
  pos.y += 0.05;
  const yaw = m.axis === "z" ? yawFor(0, look) : yawFor(look, 0);
  return { pos, yaw, pitch: -0.04 };
}

export const VIEWPOINTS: Record<ModuleId, Viewpoint> = Object.fromEntries(MODULES.map((m) => [m.id, viewpointFor(m)]));
export const START: ModuleId = "destiny";

// ---------------------------------------------------------------- lights & map

/** Candidate positions for the cabin light pool (nearest few get a real light). */
export const LIGHT_POINTS: Vec3[] = MODULES.flatMap((m) => {
  if (m.kind === "cupola") return [];
  const len = m.s1 - m.s0;
  const n = Math.max(1, Math.round(len / 2.6));
  return Array.from({ length: n }, (_, i) =>
    localToWorld(m.axis, m.c, 0, m.axis === "y" ? 0 : m.half * 0.45, m.s0 + ((i + 0.5) * len) / n),
  );
});

/** Map schematic: screen x = world z, screen y = world x. */
export type MapShape =
  | { kind: "rect"; id: ModuleId; x: number; y: number; w: number; h: number }
  | { kind: "circle"; id: ModuleId; cx: number; cy: number; r: number; from: { x: number; y: number } };

export function mapShape(m: Module): MapShape {
  if (m.axis === "y") {
    const [dx, dz] = m.mapOffset ?? [0, 0];
    const r = m.kind === "cupola" ? 0.75 : Math.min(1.1, m.half * 0.9);
    return { kind: "circle", id: m.id, cx: m.port.z + dz, cy: m.port.x + dx, r, from: { x: m.port.z, y: m.port.x } };
  }
  if (m.axis === "z") return { kind: "rect", id: m.id, x: m.s0, y: m.c.x - m.half, w: m.s1 - m.s0, h: 2 * m.half };
  return { kind: "rect", id: m.id, x: m.c.z - m.half, y: m.s0, w: 2 * m.half, h: m.s1 - m.s0 };
}

export const GROUP_LABEL: Record<Group, string> = { us: "U.S.", intl: "Europe & Japan", ru: "Russia" };
