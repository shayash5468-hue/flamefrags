// Automatic hatch doors: pure rules, no React or three.js.
import type { Vec3 } from "./layout";

export const DOOR = {
  /** Door starts opening when you float within this distance of the doorway (m). */
  OPEN_DIST: 2.4,
  /** ...and starts closing once you are farther than this (hysteresis). */
  CLOSE_DIST: 3.0,
  /** Fraction of travel per second. */
  OPEN_SPEED: 1.8,
  CLOSE_SPEED: 1.1,
  /** You can float through once the door is at least this open. */
  PASSABLE: 0.85,
};

export type DoorHatch = { id: string; center: Vec3; locked: boolean };
export type Door = { id: string; open: number; wantOpen: boolean };

export function createDoors(hatches: DoorHatch[]): Door[] {
  return hatches.map((h) => ({ id: h.id, open: 0, wantOpen: false }));
}

/** Advance every door toward open/closed based on how close the viewer is. */
export function stepDoors(doors: Door[], hatches: DoorHatch[], pos: Vec3, dt: number): void {
  for (let i = 0; i < doors.length; i++) {
    const d = doors[i]!;
    const h = hatches[i]!;
    if (h.locked) {
      d.wantOpen = false;
    } else {
      const dist = Math.hypot(pos.x - h.center.x, pos.y - h.center.y, pos.z - h.center.z);
      if (dist < DOOR.OPEN_DIST) d.wantOpen = true;
      else if (dist > DOOR.CLOSE_DIST) d.wantOpen = false;
    }
    const v = d.wantOpen ? DOOR.OPEN_SPEED : -DOOR.CLOSE_SPEED;
    d.open = Math.min(1, Math.max(0, d.open + v * dt));
  }
}

export const isPassable = (d: Door | undefined): boolean => !!d && d.open >= DOOR.PASSABLE;
