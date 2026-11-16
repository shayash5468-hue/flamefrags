import { describe, expect, it } from "vitest";
import { DOOR, createDoors, isPassable, stepDoors, type DoorHatch } from "./doors";
import { HATCHES, VIEWPOINTS, constrain, getModule, isInside } from "./layout";

const hatch: DoorHatch = { id: "h", center: { x: 0, y: 0, z: 0 }, locked: false };
const at = (z: number) => ({ x: 0, y: 0, z });

function run(h: DoorHatch, z: number, seconds: number, doors = createDoors([h])) {
  for (let t = 0; t < seconds; t += 0.02) stepDoors(doors, [h], at(z), 0.02);
  return doors[0]!;
}

describe("automatic doors", () => {
  it("opens when you float within 2.4 m of the hatch", () => {
    expect(DOOR.OPEN_DIST).toBe(2.4);
    const d = run(hatch, 2.3, 1);
    expect(d.open).toBe(1);
    expect(isPassable(d)).toBe(true);
  });

  it("stays shut when you are farther away", () => {
    const d = run(hatch, 2.6, 2);
    expect(d.open).toBe(0);
    expect(isPassable(d)).toBe(false);
  });

  it("closes again once you leave (beyond 3 m)", () => {
    const doors = createDoors([hatch]);
    run(hatch, 1, 1, doors);
    expect(run(hatch, 2.8, 2, doors).open).toBe(1); // between 2.4 and 3: stays open
    expect(run(hatch, 3.2, 2, doors).open).toBe(0);
  });

  it("is not passable while still opening", () => {
    const d = run(hatch, 1, 0.2);
    expect(d.open).toBeGreaterThan(0);
    expect(isPassable(d)).toBe(false);
  });

  it("never opens hatches that lead outside the station", () => {
    expect(HATCHES.filter((h) => h.locked).length).toBeGreaterThan(5);
    const d = run({ ...hatch, locked: true }, 0, 3);
    expect(d.open).toBe(0);
  });
});

describe("doors block movement", () => {
  const h = HATCHES.find((x) => x.id === "destiny-unity")!;
  const destiny = getModule("destiny");
  const before = { x: 0, y: 0, z: destiny.s1 - 0.45 };
  const through = { x: 0, y: 0, z: h.p1 + 0.6 };

  it("a closed door stops you at the hatch", () => {
    let p = before;
    for (let i = 0; i < 40; i++) p = constrain(p, { ...p, z: p.z + 0.05 }, () => false);
    expect(p.z).toBeLessThan(h.p0);
    expect(through.z).toBeGreaterThan(h.p1);
  });

  it("an open door lets you float into the next module", () => {
    let p = before;
    for (let i = 0; i < 40; i++) p = constrain(p, { ...p, z: p.z + 0.05 }, () => true);
    expect(p.z).toBeGreaterThan(h.p1);
  });
});

describe("station layout", () => {
  it("every module can be reached from Destiny through hatches", () => {
    const seen = new Set(["destiny"]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const x of HATCHES) {
        if (x.locked || !x.low || !x.high) continue;
        if (seen.has(x.low) !== seen.has(x.high)) {
          seen.add(x.low);
          seen.add(x.high);
          grew = true;
        }
      }
    }
    expect(seen.size).toBe(Object.keys(VIEWPOINTS).length);
    expect(seen.size).toBe(18);
  });

  it("every viewpoint is inside the walkable space", () => {
    for (const vp of Object.values(VIEWPOINTS)) {
      expect(isInside(vp.pos, () => false)).toBe(true);
    }
  });

  it("modules do not overlap each other", () => {
    const box = (m: ReturnType<typeof getModule>) => {
      const lo = { ...m.c };
      const hi = { ...m.c };
      for (const a of ["x", "y", "z"] as const) {
        if (a === m.axis) {
          lo[a] = m.s0;
          hi[a] = m.s1;
        } else {
          lo[a] -= m.half;
          hi[a] += m.half;
        }
      }
      return { lo, hi };
    };
    const ids = Object.keys(VIEWPOINTS);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = box(getModule(ids[i]!));
        const b = box(getModule(ids[j]!));
        const overlap = (["x", "y", "z"] as const).every((k) => a.lo[k] < b.hi[k] - 1e-6 && b.lo[k] < a.hi[k] - 1e-6);
        expect(overlap, `${ids[i]} overlaps ${ids[j]}`).toBe(false);
      }
    }
  });
});
