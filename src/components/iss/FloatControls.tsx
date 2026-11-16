import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { HATCHES, START, VIEWPOINTS, constrain, sectionAt, type ModuleId } from "./layout";
import { stepDoors } from "./doors";
import { doorOpen, input, registerTeleport, sim } from "./input";

// Feel
const SPEED = 2.0; // m/s at full input
const ACCEL = 3.2; // how fast velocity follows input (zero-g drift)
const LOOK_SENS = 0.0036; // rad per px
const TOUCH_LOOK_SENS = 0.0052; // responsive touch drag look
const MAX_PITCH = 1.54; // ~88.5 degrees vertical look limit

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
export function FloatControls({
  onSection,
  onPointerLockReleased,
}: {
  onSection: (id: ModuleId) => void;
  onPointerLockReleased?: () => void;
}) {
  const { camera, gl } = useThree();
  const start = VIEWPOINTS[START]!;
  const yaw = useRef(start.yaw);
  const pitch = useRef(start.pitch);
  const vel = useRef(new THREE.Vector3());
  const section = useRef<ModuleId | null>(null);
  const wasLockedRef = useRef(false);
  const onReleasedRef = useRef(onPointerLockReleased);
  onReleasedRef.current = onPointerLockReleased;

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
    el.style.cursor = "none";
    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === el;
      if (locked) {
        wasLockedRef.current = true;
        el.style.cursor = "none";
      } else {
        el.style.cursor = "default";
        if (wasLockedRef.current) {
          wasLockedRef.current = false;
          onReleasedRef.current?.();
        }
      }
    };
    document.addEventListener("pointerlockchange", handlePointerLockChange);

    let lastMouseX: number | null = null;
    let lastMouseY: number | null = null;
    let touchDragging: number | null = null;
    let touchLastX = 0;
    let touchLastY = 0;

    // Direct First-Person Mouse Look (mouse up -> look up, mouse down -> look down)
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === el) {
        yaw.current -= e.movementX * LOOK_SENS;
        pitch.current = THREE.MathUtils.clamp(
          pitch.current - e.movementY * LOOK_SENS,
          -MAX_PITCH,
          MAX_PITCH
        );
        return;
      }

      if (lastMouseX !== null && lastMouseY !== null) {
        const dx = e.movementX !== undefined && Math.abs(e.movementX) > 0 && Math.abs(e.movementX) < 140
          ? e.movementX
          : (e.clientX - lastMouseX);
        const dy = e.movementY !== undefined && Math.abs(e.movementY) > 0 && Math.abs(e.movementY) < 140
          ? e.movementY
          : (e.clientY - lastMouseY);

        if (Math.abs(dx) < 120 && Math.abs(dy) < 120) {
          yaw.current -= dx * LOOK_SENS;
          pitch.current = THREE.MathUtils.clamp(
            pitch.current - dy * LOOK_SENS,
            -MAX_PITCH,
            MAX_PITCH
          );
        }
      }
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    };

    const handleMouseLeave = () => {
      lastMouseX = null;
      lastMouseY = null;
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target !== el && target.closest("button, select, input, a, [data-no-look]")) return;
      const isTouchPrimary = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
      if (!isTouchPrimary && document.pointerLockElement !== el && el.requestPointerLock) {
        try {
          el.requestPointerLock();
        } catch {
          // Ignore environments without pointer lock
        }
      }
    };

    const handleTouchDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      const target = e.target as HTMLElement | null;
      if (target && target !== el && target.closest("button, select, input, a, [data-no-look]")) return;
      if (touchDragging !== null) return;
      touchDragging = e.pointerId;
      touchLastX = e.clientX;
      touchLastY = e.clientY;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if capture is unsupported
      }
    };

    const handleTouchMove = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || e.pointerId !== touchDragging) return;
      const dx = e.clientX - touchLastX;
      const dy = e.clientY - touchLastY;
      touchLastX = e.clientX;
      touchLastY = e.clientY;

      yaw.current -= dx * TOUCH_LOOK_SENS;
      pitch.current = THREE.MathUtils.clamp(pitch.current - dy * TOUCH_LOOK_SENS, -MAX_PITCH, MAX_PITCH);
    };

    const handleTouchUp = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || e.pointerId !== touchDragging) return;
      touchDragging = null;
    };

    const keyDown = (e: KeyboardEvent) => {
      if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
      input.keys.add(e.code);
    };
    const keyUp = (e: KeyboardEvent) => input.keys.delete(e.code);
    const blur = () => input.keys.clear();

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);
    el.addEventListener("click", handleClick);
    el.addEventListener("pointerdown", handleTouchDown);
    el.addEventListener("pointermove", handleTouchMove);
    el.addEventListener("pointerup", handleTouchUp);
    el.addEventListener("pointercancel", handleTouchUp);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", blur);

    return () => {
      registerTeleport(null);
      el.style.cursor = "default";
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
      el.removeEventListener("click", handleClick);
      el.removeEventListener("pointerdown", handleTouchDown);
      el.removeEventListener("pointermove", handleTouchMove);
      el.removeEventListener("pointerup", handleTouchUp);
      el.removeEventListener("pointercancel", handleTouchUp);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", blur);
      input.keys.clear();
    };
  }, [camera, gl, start]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);

    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
    camera.getWorldDirection(FWD);
    sim.player.yaw = yaw.current;

    stepDoors(sim.doors, HATCHES, camera.position, dt);

    const fwd = held(KEYMAP.fwd) - held(KEYMAP.back) + input.stick.y;
    const strafe = held(KEYMAP.right) - held(KEYMAP.left) + input.stick.x;
    const lift = held(KEYMAP.up) - held(KEYMAP.down) + input.lift;

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

    const s = sectionAt(p);
    if (s && s !== section.current) {
      section.current = s;
      onSection(s);
    }
  });

  return null;
}
