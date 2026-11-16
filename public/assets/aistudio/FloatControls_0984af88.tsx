import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { HATCHES, START, VIEWPOINTS, constrain, sectionAt, type ModuleId } from "./layout";
import { stepDoors } from "./doors";
import { doorOpen, input, registerTeleport, sim } from "./input";

// Feel
const SPEED = 2.0; // m/s at full input
const ACCEL = 3.2; // how fast velocity follows input (zero-g drift)
const LOOK_SENS = 0.0042; // rad per px
const MAX_PITCH = 1.48;

const FWD = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const UP = new THREE.Vector3();
const WISH = new THREE.Vector3();

const KEYMAP = {
  fwd: ["KeyW", "ArrowUp"],
  back: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  up: ["Space", "KeyE"],
  down: ["ShiftLeft", "ShiftRight", "KeyQ", "KeyC"],
};
const held = (codes: string[]) => (codes.some((c) => input.keys.has(c)) ? 1 : 0);

/**
 * First-person zero-g float camera and the single per-frame stepper:
 * doors advance first, then movement is constrained by open hatches.
 */
export function FloatControls({ onSection }: { onSection: (id: ModuleId) => void }) {
  const { camera, gl } = useThree();
  const start = VIEWPOINTS[START]!;
  const yaw = useRef(start.yaw);
  const pitch = useRef(start.pitch);
  const vel = useRef(new THREE.Vector3());
  const section = useRef<ModuleId | null>(null);

  useEffect(() => {
    camera.position.set(start.pos.x, start.pos.y, start.pos.z);
    camera.rotation.order = "YXZ";

    registerTeleport((id) => {
      const vp = VIEWPOINTS[id];
      if (!vp) return;
      camera.position.set(vp.pos.x, vp.pos.y, vp.pos.z);
      yaw.current = vp.yaw;
      pitch.current = vp.pitch;
      vel.current.set(0, 0, 0);
    });

    const el = gl.domElement;
    let dragging: number | null = null;
    let lastX = 0;
    let lastY = 0;

    const down = (e: PointerEvent) => {
      if (dragging !== null) return;
      dragging = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      yaw.current += dx * LOOK_SENS;
      pitch.current = THREE.MathUtils.clamp(pitch.current + dy * LOOK_SENS, -MAX_PITCH, MAX_PITCH);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== dragging) return;
      dragging = null;
    };

    const keyDown = (e: KeyboardEvent) => {
      if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
      input.keys.add(e.code);
    };
    const keyUp = (e: KeyboardEvent) => input.keys.delete(e.code);
    const blur = () => input.keys.clear();

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", blur);
    return () => {
      registerTeleport(null);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", blur);
      input.keys.clear();
    };
  }, [camera, gl, start]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");

    stepDoors(sim.doors, HATCHES, camera.position, dt);

    const fwd = held(KEYMAP.fwd) - held(KEYMAP.back) + input.stick.y;
    const strafe = held(KEYMAP.right) - held(KEYMAP.left) + input.stick.x;
    const lift = held(KEYMAP.up) - held(KEYMAP.down) + input.lift;

    camera.getWorldDirection(FWD);
    RIGHT.set(1, 0, 0).applyQuaternion(camera.quaternion);
    UP.set(0, 1, 0).applyQuaternion(camera.quaternion);
    WISH.set(0, 0, 0).addScaledVector(FWD, fwd).addScaledVector(RIGHT, strafe).addScaledVector(UP, lift);
    if (WISH.lengthSq() > 1) WISH.normalize();
    WISH.multiplyScalar(SPEED);

    vel.current.lerp(WISH, 1 - Math.exp(-ACCEL * dt));
    const prev = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    const next = {
      x: prev.x + vel.current.x * dt,
      y: prev.y + vel.current.y * dt,
      z: prev.z + vel.current.z * dt,
    };
    const p = constrain(prev, next, doorOpen);
    // bleed velocity on blocked axes so you don't "stick" to walls or doors
    if (p.x !== next.x) vel.current.x *= 0.2;
    if (p.y !== next.y) vel.current.y *= 0.2;
    if (p.z !== next.z) vel.current.z *= 0.2;
    camera.position.set(p.x, p.y, p.z);
    sim.player.x = p.x;
    sim.player.y = p.y;
    sim.player.z = p.z;
    sim.player.yaw = yaw.current;

    const s = sectionAt(p);
    if (s && s !== section.current) {
      section.current = s;
      onSection(s);
    }
  });

  return null;
}
