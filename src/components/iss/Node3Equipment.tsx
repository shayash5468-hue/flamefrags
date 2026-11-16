import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type Node3Interactable = "suppressO2" | "equipO2" | "equipCo2" | null;

interface Node3EquipmentProps {
  oxygenSuppressed: boolean;
  hasO2Gear: boolean;
  hasCo2Extinguisher: boolean;
  onSuppressO2: () => void;
  onEquipO2: () => void;
  onEquipCo2: () => void;
  onHoverTarget?: (target: Node3Interactable) => void;
}

const _raycaster = new THREE.Raycaster();
const _centerNdc = new THREE.Vector2(0, 0);

function findInteractable(obj: THREE.Object3D | null): Node3Interactable {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    const tag = cur.userData?.["interactable"] as Node3Interactable | undefined;
    if (tag) return tag;
    cur = cur.parent;
  }
  return null;
}

/**
 * Highly realistic Node 3 (Tranquility) safety equipment mounted flush on the -z wall (z = 5.70):
 * 1. O2 Suppression Control Module (Industrial black box with red trim, LCD display, and status buttons).
 * 2. Green Aviation Oxygen Cylinder & Mask with round pressure gauge.
 * 3. Red Carbon Dioxide (CO2) Fire Extinguisher with black horn nozzle (equippable).
 */
export const Node3Equipment: React.FC<Node3EquipmentProps> = ({
  oxygenSuppressed,
  hasO2Gear,
  hasCo2Extinguisher,
  onSuppressO2,
  onEquipO2,
  onEquipCo2,
  onHoverTarget,
}) => {
  const { camera, gl } = useThree();
  const rootRef = useRef<THREE.Group>(null);
  const panelLightRef = useRef<THREE.PointLight>(null);
  const hoveredRef = useRef<Node3Interactable>(null);
  const lastTriggerRef = useRef(0);

  // Tranquility -z wall face sits cleanly at z = 5.70 (center z = 7.2, half = 1.5).
  // Backplates of depth 0.04 sit at z = 5.72 so they are flush against the wall, away from flame (-4.8, 0.1, 7.2).
  const panelPos = new THREE.Vector3(-2.65, 0.25, 5.72);
  const oxygenPos = new THREE.Vector3(-3.35, -0.05, 5.72);
  const extinguisherPos = new THREE.Vector3(-4.05, -0.05, 5.72);

  const triggerTarget = (target: Node3Interactable) => {
    if (!target) return;
    const now = performance.now();
    if (now - lastTriggerRef.current < 160) return;
    lastTriggerRef.current = now;

    if (target === "suppressO2" && !oxygenSuppressed) {
      onSuppressO2();
    } else if (target === "equipO2" && !hasO2Gear) {
      onEquipO2();
    } else if (target === "equipCo2" && !hasCo2Extinguisher) {
      onEquipCo2();
    }
  };

  useEffect(() => {
    const el = gl.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      // When pointer is locked (or clicking center crosshair), interact with aimed wall item
      if (document.pointerLockElement === el && hoveredRef.current) {
        triggerTarget(hoveredRef.current);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyF" && hoveredRef.current) {
        triggerTarget(hoveredRef.current);
      }
    };

    el.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      el.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (panelLightRef.current) {
      panelLightRef.current.intensity = oxygenSuppressed
        ? 4.2 + Math.sin(t * 14) * 1.8
        : 1.8;
    }

    // Center-screen crosshair raycast for aiming at Node 3 wall equipment
    if (rootRef.current) {
      _raycaster.setFromCamera(_centerNdc, camera);
      _raycaster.far = 3.8; // Interactive reach inside Node 3
      const hits = _raycaster.intersectObject(rootRef.current, true);
      let nextHover: Node3Interactable = null;
      if (hits.length > 0) {
        const found = findInteractable(hits[0]!.object);
        if (
          (found === "suppressO2" && !oxygenSuppressed) ||
          (found === "equipO2" && !hasO2Gear) ||
          (found === "equipCo2" && !hasCo2Extinguisher)
        ) {
          nextHover = found;
        }
      }
      if (nextHover !== hoveredRef.current) {
        hoveredRef.current = nextHover;
        onHoverTarget?.(nextHover);
      }
    }
  });

  return (
    <group ref={rootRef}>
      {/* 1. O2 SUPPRESSION CONTROL MODULE (Flush on wall at x = -2.65, z = 5.72) */}
      <group
        position={panelPos}
        userData={{ interactable: "suppressO2" }}
        onClick={(e) => {
          e.stopPropagation();
          triggerTarget("suppressO2");
        }}
        onPointerOver={() => {
          if (!oxygenSuppressed && document.pointerLockElement !== gl.domElement) {
            document.body.style.cursor = "pointer";
          }
        }}
        onPointerOut={() => {
          if (document.pointerLockElement !== gl.domElement) {
            document.body.style.cursor = "default";
          }
        }}
      >
        {/* Rugged Black Housing Box */}
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.48, 0.62, 0.08]} />
          <meshStandardMaterial color="#111827" roughness={0.4} metalness={0.5} />
        </mesh>

        {/* Red Border Trim Panel Plate */}
        <mesh position={[0, 0.02, 0.062]}>
          <boxGeometry args={[0.4, 0.52, 0.01]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.3} metalness={0.2} />
        </mesh>

        {/* Inner Dark Faceplate */}
        <mesh position={[0, 0.02, 0.068]}>
          <boxGeometry args={[0.36, 0.48, 0.005]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} />
        </mesh>

        {/* Digital LCD Display Screen */}
        <mesh position={[0, 0.16, 0.074]}>
          <planeGeometry args={[0.28, 0.12]} />
          <meshBasicMaterial
            color={oxygenSuppressed ? "#ef4444" : "#0284c7"}
            toneMapped={false}
          />
        </mesh>

        {/* Emergency Suppress Button & Status Buttons (F1, F2, F3) */}
        {[-0.1, 0, 0.1].map((bx, idx) => (
          <mesh key={idx} position={[bx, -0.1, 0.075]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.026, 0.026, 0.02, 16]} />
            <meshStandardMaterial
              color={idx === 1 ? (oxygenSuppressed ? "#ef4444" : "#dc2626") : "#374151"}
              emissive={idx === 1 ? "#ef4444" : "#000000"}
              emissiveIntensity={idx === 1 ? 0.5 : 0}
              roughness={0.4}
              metalness={0.6}
            />
          </mesh>
        ))}

        {/* Panel Indicator LED */}
        <pointLight
          ref={panelLightRef}
          position={[0, 0.16, 0.12]}
          color={oxygenSuppressed ? "#ef4444" : "#38bdf8"}
          distance={2.0}
          decay={2}
        />
      </group>

      {/* 2. GREEN OXYGEN CYLINDER & MASK (Flush on wall at x = -3.35, z = 5.72) */}
      <group
        position={oxygenPos}
        userData={{ interactable: "equipO2" }}
        onClick={(e) => {
          e.stopPropagation();
          triggerTarget("equipO2");
        }}
        onPointerOver={() => {
          if (!hasO2Gear && document.pointerLockElement !== gl.domElement) {
            document.body.style.cursor = "pointer";
          }
        }}
        onPointerOut={() => {
          if (document.pointerLockElement !== gl.domElement) {
            document.body.style.cursor = "default";
          }
        }}
      >
        {/* Wall mounting bracket */}
        <mesh position={[0.05, 0, 0.01]}>
          <boxGeometry args={[0.46, 0.68, 0.03]} />
          <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.6} />
        </mesh>

        {!hasO2Gear && (
          <>
            {/* Green Aviation Oxygen Cylinder Body */}
            <group position={[-0.08, -0.04, 0.1]}>
              <mesh>
                <cylinderGeometry args={[0.075, 0.075, 0.5, 24]} />
                <meshStandardMaterial color="#0f766e" roughness={0.25} metalness={0.7} />
              </mesh>
              {/* Silver Mid Band */}
              <mesh position={[0, 0.05, 0]}>
                <cylinderGeometry args={[0.076, 0.076, 0.08, 24]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.9} />
              </mesh>
            </group>

            {/* Brass Regulator Valve & Round Pressure Gauge Dial */}
            <group position={[-0.08, 0.25, 0.1]}>
              <mesh>
                <cylinderGeometry args={[0.022, 0.022, 0.07, 16]} />
                <meshStandardMaterial color="#b45309" roughness={0.3} metalness={0.8} />
              </mesh>
              <mesh position={[0.045, 0.03, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.015, 24]} />
                <meshStandardMaterial color="#ffffff" roughness={0.1} />
              </mesh>
            </group>

            {/* Clear Silicone Oxygen Mask with Reservoir Bag */}
            <group position={[0.14, 0.03, 0.1]}>
              <mesh rotation={[Math.PI / 4, 0, 0]}>
                <sphereGeometry args={[0.085, 20, 20]} />
                <meshStandardMaterial
                  color="#e2e8f0"
                  transparent
                  opacity={0.78}
                  roughness={0.1}
                  metalness={0.3}
                />
              </mesh>
              <mesh position={[0, -0.11, 0]}>
                <sphereGeometry args={[0.065, 16, 16]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.9} transparent opacity={0.85} />
              </mesh>
            </group>

            <pointLight position={[0, 0, 0.22]} color="#10b981" intensity={1.6} distance={1.8} />
          </>
        )}
      </group>

      {/* 3. RED CARBON DIOXIDE (CO2) FIRE EXTINGUISHER (Flush on wall at x = -4.05, z = 5.72) */}
      <group
        position={extinguisherPos}
        userData={{ interactable: "equipCo2" }}
        onClick={(e) => {
          e.stopPropagation();
          triggerTarget("equipCo2");
        }}
        onPointerOver={() => {
          if (!hasCo2Extinguisher && document.pointerLockElement !== gl.domElement) {
            document.body.style.cursor = "pointer";
          }
        }}
        onPointerOut={() => {
          if (document.pointerLockElement !== gl.domElement) {
            document.body.style.cursor = "default";
          }
        }}
      >
        {/* Wall bracket */}
        <mesh position={[0, 0, 0.01]}>
          <boxGeometry args={[0.32, 0.68, 0.03]} />
          <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.6} />
        </mesh>
        {/* Bracket cradle rings */}
        <mesh position={[0, -0.14, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.08, 0.01, 8, 20]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
        </mesh>

        {!hasCo2Extinguisher && (
          <>
            {/* Red CO2 Cylinder Body */}
            <group position={[0, -0.04, 0.1]}>
              <mesh>
                <cylinderGeometry args={[0.075, 0.075, 0.5, 24]} />
                <meshStandardMaterial color="#dc2626" roughness={0.28} metalness={0.5} />
              </mesh>
              {/* Black Warning Band */}
              <mesh position={[0, 0.08, 0]}>
                <cylinderGeometry args={[0.076, 0.076, 0.09, 24]} />
                <meshStandardMaterial color="#111827" roughness={0.6} />
              </mesh>
            </group>

            {/* Valve & Handle */}
            <group position={[0, 0.25, 0.1]}>
              <mesh>
                <cylinderGeometry args={[0.022, 0.022, 0.06, 16]} />
                <meshStandardMaterial color="#b45309" metalness={0.8} />
              </mesh>
              <mesh position={[0, 0.04, 0]}>
                <boxGeometry args={[0.02, 0.04, 0.08]} />
                <meshStandardMaterial color="#111827" roughness={0.4} />
              </mesh>
            </group>

            {/* Black Horn Nozzle */}
            <group position={[0.11, 0.04, 0.12]} rotation={[0, 0, -Math.PI / 6]}>
              <mesh>
                <coneGeometry args={[0.04, 0.22, 16]} />
                <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.3} />
              </mesh>
            </group>

            <pointLight position={[0, 0, 0.22]} color="#ef4444" intensity={1.4} distance={1.8} />
          </>
        )}
      </group>
    </group>
  );
};
