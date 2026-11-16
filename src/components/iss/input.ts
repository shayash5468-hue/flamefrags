// Shared state written by DOM handlers / the frame stepper and read elsewhere.
import { createDoors, isPassable } from "./doors";
import { HATCHES, type ModuleId } from "./layout";

export const input = {
  /** Virtual joystick: x = strafe (-1 left..1 right), y = forward (-1 back..1 forward). */
  stick: { x: 0, y: 0 },
  /** Touch up/down buttons: -1 down, 1 up. */
  lift: 0,
  keys: new Set<string>(),
};

/** Live simulation state, advanced once per frame by FloatControls. */
export const sim = {
  doors: createDoors(HATCHES),
  /** Viewer pose for the mini-map (world x/z + yaw). */
  player: { x: 0, y: 0, z: 0, yaw: 0 },
};

const doorIndex = new Map(HATCHES.map((h, i) => [h.id, i]));
export const doorOpen = (hatchId: string) => isPassable(sim.doors[doorIndex.get(hatchId) ?? -1]);

type Teleport = (id: ModuleId) => void;
let teleport: Teleport | null = null;

export function registerTeleport(fn: Teleport | null) {
  teleport = fn;
}

export function goTo(id: ModuleId) {
  teleport?.(id);
}
