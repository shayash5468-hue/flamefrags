import React, { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { FLAME_POSITION } from "./SphericalFlame";

interface HeldCo2ExtinguisherProps {
  equipped: boolean;
  isSpraying: boolean;
  flameActive: boolean;
  onSprayHitFlame: (dt: number) => void;
}

const _fwd = new THREE.Vector3();
const _toFlame = new THREE.Vector3();
const _closest = new THREE.Vector3();
const _offset = new THREE.Vector3();

const PARTICLE_COUNT = 120;

/**
 * First-person equipped CO2 Fire Extinguisher + pressurized CO2 vapor plume
 * and flame-hit detection.
 */
export const HeldCo2Extinguisher: React.FC<HeldCo2ExtinguisherProps> = ({
  equipped,
  isSpraying,
  flameActive,
  onSprayHitFlame,
}) => {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const nozzleRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);

  // Pre-allocated particle simulation state in camera-local space
  const simData = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const ages = new Float32Array(PARTICLE_COUNT);
    const lifetimes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      ages[i] = Math.random();
      lifetimes[i] = 0.28 + Math.random() * 0.25;
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = -999;
      velocities[i * 3] = (Math.random() - 0.5) * 0.6;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.6;
      velocities[i * 3 + 2] = -(4.5 + Math.random() * 3.5);
    }
    return { positions, velocities, ages, lifetimes };
  }, []);

  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);

    if (groupRef.current && equipped) {
      // Sync view-model cleanly to camera pose with subtle zero-g breathing/recoil
      const t = clock.getElapsedTime();
      const recoil = isSpraying ? Math.sin(t * 42) * 0.004 : 0;
      const swayX = Math.sin(t * 1.4) * 0.003;
      const swayY = Math.cos(t * 1.9) * 0.003;

      groupRef.current.position.copy(camera.position);
      groupRef.current.quaternion.copy(camera.quaternion);
      _offset.set(0.24 + swayX + recoil, -0.22 + swayY, -0.44 + (isSpraying ? 0.012 : 0));
      _offset.applyQuaternion(camera.quaternion);
      groupRef.current.position.add(_offset);
    }

    // Update CO2 vapor spray particles (in group local coordinates starting from horn tip)
    if (pointsRef.current && equipped) {
      const { positions, velocities, ages, lifetimes } = simData;
      const attr = pointsRef.current.geometry.attributes["position"] as THREE.BufferAttribute;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        ages[i] = ages[i]! + dt;
        if (ages[i]! >= lifetimes[i]!) {
          if (isSpraying) {
            ages[i] = 0;
            lifetimes[i] = 0.3 + Math.random() * 0.28;
            // Start right at the horn nozzle tip, aimed slightly inward toward center crosshair
            positions[i * 3] = (Math.random() - 0.5) * 0.03;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 0.03;
            positions[i * 3 + 2] = 0;
            velocities[i * 3] = -0.35 + (Math.random() - 0.5) * 0.75;
            velocities[i * 3 + 1] = 0.25 + (Math.random() - 0.5) * 0.75;
            velocities[i * 3 + 2] = -(5.5 + Math.random() * 3.5);
          } else {
            positions[i * 3 + 2] = -999; // Park offscreen when idle
          }
        } else if (positions[i * 3 + 2]! > -100) {
          positions[i * 3] = positions[i * 3]! + velocities[i * 3]! * dt;
          positions[i * 3 + 1] = positions[i * 3 + 1]! + velocities[i * 3 + 1]! * dt;
          positions[i * 3 + 2] = positions[i * 3 + 2]! + velocities[i * 3 + 2]! * dt;
        }
      }
      attr.needsUpdate = true;
    }

    // Flame suppression hit-detection along camera aim ray
    if (equipped && isSpraying && flameActive) {
      camera.getWorldDirection(_fwd);
      _toFlame.subVectors(FLAME_POSITION, camera.position);
      const along = _toFlame.dot(_fwd);
      if (along > 0.1 && along < 5.0) {
        _closest.copy(camera.position).addScaledVector(_fwd, along);
        const perpDist = _closest.distanceTo(FLAME_POSITION);
        if (perpDist < 0.95) {
          onSprayHitFlame(dt);
        }
      }
    }
  });

  if (!equipped) return null;

  return (
    <group ref={groupRef}>
      {/* Held Red CO2 Fire Extinguisher View-Model */}
      <group rotation={[0.14, -0.22, 0.06]}>
        {/* Red Cylinder Tank (Upper Half visible in first-person) */}
        <mesh position={[0, -0.14, 0]}>
          <cylinderGeometry args={[0.068, 0.068, 0.34, 24]} />
          <meshStandardMaterial color="#dc2626" roughness={0.28} metalness={0.5} />
        </mesh>

        {/* Black Carbon Dioxide Label Band */}
        <mesh position={[0, -0.06, 0]}>
          <cylinderGeometry args={[0.0695, 0.0695, 0.08, 24]} />
          <meshStandardMaterial color="#111827" roughness={0.6} />
        </mesh>

        {/* Brass Valve Body */}
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.06, 16]} />
          <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.2} />
        </mesh>

        {/* Squeeze Grip Handle */}
        <mesh position={[0, 0.085, 0.04]} rotation={[isSpraying ? 0.18 : 0.02, 0, 0]}>
          <boxGeometry args={[0.018, 0.022, 0.095]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.6} />
        </mesh>

        {/* Top Carry Handle */}
        <mesh position={[0, 0.062, 0.045]}>
          <boxGeometry args={[0.018, 0.018, 0.09]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} />
        </mesh>

        {/* Braided Black Discharge Hose & Flared Black CO2 Horn Nozzle aimed toward Crosshair */}
        <group ref={nozzleRef} position={[-0.065, 0.045, -0.14]} rotation={[-0.08, 0.24, 0]}>
          {/* Hose collar */}
          <mesh position={[0.03, 0, 0.08]} rotation={[Math.PI / 2, 0, -0.45]}>
            <cylinderGeometry args={[0.014, 0.014, 0.14, 12]} />
            <meshStandardMaterial color="#111827" roughness={0.7} />
          </mesh>

          {/* Flared CO2 Discharge Horn */}
          <mesh position={[0, 0, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.042, 0.19, 18, 1, true]} />
            <meshStandardMaterial color="#1f2937" roughness={0.45} metalness={0.25} side={THREE.DoubleSide} />
          </mesh>

          {/* Pressurized CO2 Cloud Particles */}
          <points ref={pointsRef} position={[0, 0, -0.14]} frustumCulled={false}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[simData.positions, 3]}
              />
            </bufferGeometry>
            <pointsMaterial
              size={0.14}
              color="#e0f2fe"
              transparent
              opacity={isSpraying ? 0.72 : 0}
              depthWrite={false}
              blending={THREE.NormalBlending}
            />
          </points>
        </group>
      </group>
    </group>
  );
};
