import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const FLAME_POSITION = new THREE.Vector3(-4.8, 0.1, 7.2); // Node 3 (Tranquility) center

interface SphericalFlameProps {
  active: boolean;
  intensity?: number;
  onDamage?: (dt: number, dist: number) => void;
}

/**
 * Authentic NASA PSI microgravity blue spherical flame.
 * In zero-G, buoyancy is absent, causing laminar diffusion flames to form
 * perfect glowing spheres with blue hydrocarbon chemiluminescence.
 */
export const SphericalFlame: React.FC<SphericalFlameProps> = ({ active, intensity = 1, onDamage }) => {
  const coreRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Particles for microgravity soot precursors and thermal ion halo
  const { particlePositions, particleColors } = useMemo(() => {
    const count = 36;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 0.35 + Math.random() * 0.45;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      // Cyan to deep sapphire gradient
      col[i * 3] = 0.2 + Math.random() * 0.3; // R
      col[i * 3 + 1] = 0.7 + Math.random() * 0.3; // G
      col[i * 3 + 2] = 0.95 + Math.random() * 0.05; // B
    }
    return { particlePositions: pos, particleColors: col };
  }, []);

  useFrame(({ clock, camera }, delta) => {
    if (!active) return;
    const t = clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);
    const scaleFactor = Math.max(0.08, intensity);

    // Subtle microgravity flame oscillation & breathing
    const pulse = (1 + Math.sin(t * 7.5) * 0.045 + Math.cos(t * 13) * 0.02) * scaleFactor;
    if (coreRef.current) {
      coreRef.current.scale.setScalar(pulse);
      coreRef.current.rotation.y = t * 0.3;
    }
    if (outerRef.current) {
      const outerPulse = (1 + Math.sin(t * 6 + 1.2) * 0.06) * scaleFactor;
      outerRef.current.scale.setScalar(outerPulse);
      outerRef.current.rotation.y = -t * 0.2;
      outerRef.current.rotation.z = Math.sin(t * 2) * 0.1;
    }
    if (haloRef.current) {
      haloRef.current.scale.setScalar(scaleFactor);
    }
    if (lightRef.current) {
      // Realistic high-frequency flame luminescence flicker
      lightRef.current.intensity = (6.0 + Math.sin(t * 15) * 0.9 + Math.cos(t * 23) * 0.5) * scaleFactor;
    }
    if (particlesRef.current) {
      particlesRef.current.scale.setScalar(scaleFactor);
      particlesRef.current.rotation.y = t * 0.25;
      particlesRef.current.rotation.x = Math.sin(t * 0.5) * 0.15;
    }

    // Thermal Collision Detection: distance from player camera to flame center
    const dist = camera.position.distanceTo(FLAME_POSITION);
    if (dist < 1.35 * Math.max(0.5, scaleFactor)) {
      onDamage?.(dt, dist);
    }
  });

  if (!active) return null;

  return (
    <group position={FLAME_POSITION}>
      {/* 1. Core High-Luminosity Blue Combustion Center */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.24, 32, 32]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#67e8f9"
          emissiveIntensity={3.8}
          roughness={0.12}
          metalness={0.1}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* 2. Outer Chemiluminescent Blue/Cyan Envelope */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshBasicMaterial
          color="#1d4ed8"
          transparent
          opacity={0.48}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Deep Radical Corona Halo */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.56, 24, 24]} />
        <meshBasicMaterial
          color="#0284c7"
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* 4. Ambient Blue Flame Illumination onto Node 3 Walls & Racks */}
      <pointLight
        ref={lightRef}
        intensity={6.5}
        distance={6.2}
        decay={1.3}
        color="#38bdf8"
      />

      {/* 5. Zero-G Radical/Ion Sparks Halo */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[particleColors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.045}
          vertexColors
          transparent
          opacity={0.75}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
};
