import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

// Physical-proportion orbital geometry (camera sits at local origin inside SkyFollower):
// Sphere center at -3305 on Y with radius 3200 puts the curved horizon cleanly at -14.5 deg
// across all 6 Cupola side windows while Earth fills 100% of the circular nadir floor window.
const EARTH_RADIUS = 3200;
const ORBIT_ALTITUDE = 105;
const EARTH_CENTER_Y = -(EARTH_RADIUS + ORBIT_ALTITUDE);
const ATMO_RADIUS = EARTH_RADIUS + 82;
const SKY_DOME_RADIUS = 2500;

// Orbital sunrise tucked on the curved forward-left limb of Earth (left = +x when facing +z)
const SUNRISE_DIR = new THREE.Vector3(0.28, -0.245, 0.927).normalize();

const EARTH_VERT = /* glsl */ `
  varying vec3 vNormalDir;
  varying vec3 vToCam;

  void main() {
    // Unit outward normal on the Earth sphere (nadir directly under ISS is (0, 1, 0))
    vNormalDir = normalize(position);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vToCam = cameraPosition - worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const EARTH_FRAG = /* glsl */ `
  uniform sampler2D uPhotoMap;
  uniform vec3 uSunriseDir;
  uniform float uTime;

  varying vec3 vNormalDir;
  varying vec3 vToCam;

  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash31(i);
    float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash31(i + vec3(0.0, 0.0, 1.0) + vec3(1.0, 0.0, 0.0));
    float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);
    return mix(mix(nx00, nx10, f.y), mix(nx01, nx11, f.y), f.z);
  }

  float fbm3(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise3(p);
      p = p * 2.07 + vec3(13.1, 7.7, 5.3);
      a *= 0.5;
    }
    return v;
  }

  vec3 proceduralEarth(vec3 n, vec3 viewDir) {
    // Seamless spherical surface coordinates around the orbital nadir cap
    vec3 p = n * 16.0;
    float cont = fbm3(p);
    float detail = fbm3(p * 3.4 + vec3(4.2, 1.9, 8.1));
    float landMask = smoothstep(0.49, 0.54, cont + (detail - 0.5) * 0.16);
    float coastBand = smoothstep(0.065, 0.0, abs(cont + (detail - 0.5) * 0.16 - 0.51));

    // Sunward vs nightside orbital illumination driven by sunrise direction
    float sunDot = dot(n, normalize(vec3(uSunriseDir.x, 0.28, uSunriseDir.z)));
    float dayFactor = smoothstep(-0.22, 0.32, sunDot);

    // Ocean color: deep midnight sapphire transitioning to luminous sunlit cobalt
    vec3 nightOcean = vec3(0.012, 0.045, 0.125);
    vec3 dayOcean = vec3(0.025, 0.21, 0.48);
    vec3 oceanCol = mix(nightOcean, dayOcean, dayFactor);

    // Specular orbital sun glint on sunlit oceans
    vec3 halfVec = normalize(normalize(vec3(uSunriseDir.x, 0.35, uSunriseDir.z)) + viewDir);
    float oceanSpec = pow(max(dot(n, halfVec), 0.0), 42.0) * dayFactor * (1.0 - landMask);
    oceanCol += vec3(0.35, 0.72, 1.0) * oceanSpec * 0.45;

    // Landmass color: dark night terrain with glowing cyan shallow coasts (matching image_29f500a8)
    vec3 nightLand = vec3(0.022, 0.038, 0.055);
    vec3 dayLand = vec3(0.05, 0.12, 0.14);
    vec3 landCol = mix(nightLand, dayLand, dayFactor);

    vec3 coastalShelf = vec3(0.04, 0.65, 0.58) * coastBand * (0.45 + 0.55 * dayFactor);

    // City light clusters & road filaments on night/twilight landmasses
    float cityMacro = fbm3(p * 4.5 + vec3(2.1));
    float citySpark = noise3(p * 26.0);
    float cityMask = smoothstep(0.56, 0.78, cityMacro) * smoothstep(0.62, 0.88, citySpark) * landMask;
    float twilight = 1.0 - smoothstep(-0.05, 0.38, sunDot);
    vec3 cityLights = vec3(1.0, 0.74, 0.32) * cityMask * (0.55 + 1.15 * twilight);

    return mix(oceanCol, landCol, landMask) + coastalShelf + cityLights;
  }

  void main() {
    vec3 n = normalize(vNormalDir);
    vec3 viewDir = normalize(vToCam);

    // Map visible Earth sphere cap (n.xz in [-0.25, +0.25]) directly onto the Earth/Europe
    // portion of image_29f500a8.png with zero polar pinch and zero baked-sky bleed.
    // Facing +z: +x is screen left (low u), -x is screen right (high u); +z is forward (high v).
    vec2 photoUv = vec2(0.62 - n.x * 1.48, 0.30 + n.z * 1.55);

    // Sample photographic Earth only inside the terrestrial region below the photo's curved limb
    float inBoundsX = smoothstep(0.16, 0.30, photoUv.x) * smoothstep(0.98, 0.86, photoUv.x);
    float inBoundsY = smoothstep(0.03, 0.15, photoUv.y) * smoothstep(0.76, 0.62, photoUv.y);
    // Extra diagonal trim on top-left so no dark space sky from the photo leaks onto Earth
    float diagKeep = smoothstep(-0.34, -0.14, photoUv.x - photoUv.y * 0.82);
    float photoMask = inBoundsX * inBoundsY * diagKeep * smoothstep(0.90, 0.96, n.y);

    vec3 photoCol = texture2D(uPhotoMap, clamp(photoUv, vec2(0.01), vec2(0.99))).rgb * 1.25;
    vec3 procCol = proceduralEarth(n, viewDir);

    vec3 surfaceCol = mix(procCol, photoCol, photoMask);

    // Subtle drifting high-altitude orbital cloud veil across the entire 360-deg globe
    float cloudNoise = fbm3(n * 19.0 + vec3(uTime * 0.004, 0.0, -uTime * 0.002));
    float cloudMask = smoothstep(0.57, 0.78, cloudNoise);
    float sunProximity = max(dot(normalize(vec3(n.x, 0.0, n.z)), normalize(vec3(uSunriseDir.x, 0.0, uSunriseDir.z))), 0.0);
    vec3 cloudCol = mix(vec3(0.07, 0.14, 0.26), vec3(0.62, 0.84, 1.0), pow(sunProximity, 1.5));
    surfaceCol = mix(surfaceCol, cloudCol, cloudMask * 0.24);

    // Physically-inspired Rayleigh atmospheric limb brightening all around Earth's horizon
    float ndotv = clamp(dot(n, viewDir), 0.0, 1.0);
    float limb = pow(1.0 - ndotv, 3.8);
    float intenseLimb = pow(1.0 - ndotv, 8.5);
    float sunArc = pow(max(dot(normalize(-vToCam), uSunriseDir), 0.0), 4.0);

    vec3 rayleighBlue = vec3(0.12, 0.56, 1.0);
    vec3 horizonGlow = mix(rayleighBlue, vec3(0.68, 0.90, 1.0), sunArc * 0.85);

    vec3 finalCol = surfaceCol * mix(1.0, 0.65, limb * 0.55);
    finalCol += horizonGlow * (limb * 0.55 + intenseLimb * 0.95);
    finalCol += vec3(0.85, 0.95, 1.0) * sunArc * intenseLimb * 1.1;

    gl_FragColor = vec4(finalCol, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const ATMO_VERT = /* glsl */ `
  varying vec3 vNormalDir;
  varying vec3 vToCam;

  void main() {
    vNormalDir = normalize(position);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vToCam = cameraPosition - worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const ATMO_FRAG = /* glsl */ `
  uniform vec3 uSunriseDir;
  varying vec3 vNormalDir;
  varying vec3 vToCam;

  void main() {
    // Outer atmosphere shell around Earth viewed from outside (FrontSide, additive)
    vec3 n = normalize(vNormalDir);
    vec3 v = normalize(vToCam);

    // Exact rim value where viewing ray grazes the solid Earth sphere:
    // sqrt(1 - (3200 / 3282)^2) = 0.222 -> 1 - 0.222 = 0.778
    float rim = clamp(1.0 - dot(n, v), 0.0, 1.0);
    float limbRim = 0.778;
    float aboveHorizon = smoothstep(0.55, limbRim, rim) * smoothstep(1.0, limbRim + 0.03, rim);
    float crispLine = exp(-abs(rim - limbRim) * 18.0);
    float outerBand = pow(aboveHorizon, 1.5) * 0.72 + crispLine * 0.95;
    float sunArc = pow(max(dot(-v, uSunriseDir), 0.0), 3.0);

    vec3 blueAtmo = vec3(0.10, 0.54, 1.0);
    vec3 sunAtmo = vec3(0.62, 0.88, 1.0);
    vec3 col = mix(blueAtmo, sunAtmo, sunArc * 0.85) * outerBand * (0.95 + sunArc * 1.35);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const FLARE_VERT = /* glsl */ `
  varying vec3 vRayDir;
  void main() {
    vRayDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FLARE_FRAG = /* glsl */ `
  uniform vec3 uSunriseDir;
  uniform float uTime;
  varying vec3 vRayDir;

  void main() {
    vec3 d = normalize(vRayDir);
    float cosTheta = dot(d, uSunriseDir);
    if (cosTheta < 0.45) discard;

    // Orthonormal frame perpendicular to uSunriseDir for crisp orbital diffraction rays
    vec3 upRef = vec3(0.0, 1.0, 0.0);
    vec3 right = normalize(cross(upRef, uSunriseDir));
    vec3 up = cross(uSunriseDir, right);

    float px = dot(d, right);
    float py = dot(d, up);
    float r = length(vec2(px, py));
    float angle = atan(py, px);

    // Intense sunrise core & atmospheric blue halo just above the curved Earth limb
    float core = exp(-r * 38.0) * 2.1;
    float midGlow = exp(-r * 11.0) * 0.85;
    float wideBloom = exp(-r * 3.8) * 0.28;

    // 6-point & diagonal orbital starburst rays (matching high-altitude sunlight scatter)
    float rays = pow(max(cos(angle * 6.0 + 0.35), 0.0), 14.0) * exp(-r * 8.5) * 0.55;
    float streak = pow(max(abs(cos(angle - 0.52)), 0.0), 28.0) * exp(-r * 5.2) * 0.45;
    float shimmer = 0.96 + 0.04 * sin(uTime * 1.3);

    vec3 col =
      vec3(1.0, 0.98, 0.92) * core +
      vec3(0.45, 0.84, 1.0) * (midGlow + rays + streak) +
      vec3(0.08, 0.35, 0.92) * wideBloom;

    gl_FragColor = vec4(col * shimmer, 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * Full 360-degree 3D Earth globe beneath the ISS Cupola with Rayleigh atmospheric limb,
 * orbital sunrise lens flare, and the user's European/Mediterranean night-horizon vista.
 */
export function Planet() {
  const photoTex = useTexture("/assets/aistudio/image_29f500a8.png");
  const earthMatRef = useRef<THREE.ShaderMaterial>(null);
  const flareMatRef = useRef<THREE.ShaderMaterial>(null);

  useEffect(() => {
    photoTex.colorSpace = THREE.SRGBColorSpace;
    photoTex.anisotropy = 8;
    photoTex.wrapS = THREE.ClampToEdgeWrapping;
    photoTex.wrapT = THREE.ClampToEdgeWrapping;
    photoTex.needsUpdate = true;
  }, [photoTex]);

  const earthMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uPhotoMap: { value: photoTex },
          uSunriseDir: { value: SUNRISE_DIR },
          uTime: { value: 0 },
        },
        vertexShader: EARTH_VERT,
        fragmentShader: EARTH_FRAG,
        side: THREE.FrontSide,
        transparent: false,
        depthWrite: true,
        depthTest: true,
      }),
    [photoTex],
  );

  const atmoMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uSunriseDir: { value: SUNRISE_DIR },
        },
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        side: THREE.FrontSide,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );

  const flareMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uSunriseDir: { value: SUNRISE_DIR },
          uTime: { value: 0 },
        },
        vertexShader: FLARE_VERT,
        fragmentShader: FLARE_FRAG,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );

  useEffect(() => {
    earthMat.uniforms["uPhotoMap"]!.value = photoTex;
  }, [earthMat, photoTex]);

  useEffect(() => {
    return () => {
      earthMat.dispose();
      atmoMat.dispose();
      flareMat.dispose();
    };
  }, [earthMat, atmoMat, flareMat]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (earthMatRef.current) earthMatRef.current.uniforms["uTime"]!.value = t;
    if (flareMatRef.current) flareMatRef.current.uniforms["uTime"]!.value = t;
  });

  return (
    <group>
      {/* Orbital sunlight matching the forward-left Earth horizon sunrise */}
      <directionalLight
        position={[SUNRISE_DIR.x * 5000, 1800, SUNRISE_DIR.z * 5000]}
        intensity={2.2}
        color="#fff6e8"
      />

      {/* Opaque 3D curved Earth globe directly underneath the station */}
      <mesh position={[0, EARTH_CENTER_Y, 0]} renderOrder={-2}>
        <sphereGeometry args={[EARTH_RADIUS, 128, 96]} />
        <primitive object={earthMat} ref={earthMatRef} attach="material" />
      </mesh>

      {/* Luminous 360-degree Rayleigh blue atmospheric limb halo */}
      <mesh position={[0, EARTH_CENTER_Y, 0]} material={atmoMat} renderOrder={-1}>
        <sphereGeometry args={[ATMO_RADIUS, 96, 64]} />
      </mesh>

      {/* Orbital sunrise starburst & sunbeams right on the curved Earth limb */}
      <mesh renderOrder={-1}>
        <sphereGeometry args={[SKY_DOME_RADIUS, 48, 32]} />
        <primitive object={flareMat} ref={flareMatRef} attach="material" />
      </mesh>
    </group>
  );
}
