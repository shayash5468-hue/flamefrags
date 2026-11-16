import * as THREE from 'three';
import { BuiltSpacecraftScene, InvestigationVisualState } from '../types.ts';
import { ProceduralTextureSet } from '../utils/proceduralTextures.ts';

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export function buildMirScene(
  textures: ProceduralTextureSet
): BuiltSpacecraftScene {
  const root = new THREE.Group();
  root.name = 'Mir Space Station · Kvant-1 Module';

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // Materials
  const linerMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.mirPanelColor,
      roughness: 0.78,
      metalness: 0.08,
      side: THREE.DoubleSide,
    })
  );
  const cushionMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.85,
      metalness: 0.05,
      map: textures.quiltedBlanketColor,
      bumpMap: textures.quiltedBlanketBump,
      bumpScale: 0.008,
    })
  );
  const frameMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.36,
      metalness: 0.82,
      bumpMap: textures.brushedMetalBump,
      bumpScale: 0.003,
    })
  );
  const darkRackMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.52,
      metalness: 0.62,
    })
  );
  const handrailMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.32,
      metalness: 0.45,
    })
  );
  const blueRailMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.35,
      metalness: 0.4,
    })
  );
  const sfogMetalMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.28,
      metalness: 0.88,
    })
  );
  const extinguisherMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.35,
      metalness: 0.4,
    })
  );
  const shroudMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.28,
      metalness: 0.85,
      transparent: true,
      opacity: 0.82,
    })
  );
  const cableMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.65,
      metalness: 0.2,
    })
  );

  // 1. Kvant-1 Pressurized Cylindrical Hull, Structural Ribs & Acoustic Pads
  const staticGroup = new THREE.Group();
  const hullShell = new THREE.Mesh(
    track(new THREE.CylinderGeometry(1.24, 1.24, 4.6, 24, 1, true)),
    linerMat
  );
  hullShell.rotation.x = Math.PI / 2;
  hullShell.position.set(0, 1.44, -0.1);
  hullShell.receiveShadow = true;
  staticGroup.add(hullShell);

  for (let z = -2.0; z <= 1.8; z += 0.76) {
    const rib = new THREE.Mesh(
      track(new THREE.TorusGeometry(1.2, 0.028, 8, 32)),
      frameMat
    );
    rib.position.set(0, 1.44, z);
    staticGroup.add(rib);
  }

  // Instanced Quilted Acoustic Wall Cushions along upper Kvant-1 curve
  const padMesh = new THREE.InstancedMesh(
    track(new THREE.BoxGeometry(0.32, 0.44, 0.04)),
    cushionMat,
    12
  );
  let pIdx = 0;
  for (let side = -1; side <= 1; side += 2) {
    for (let k = 0; k < 6; k++) {
      _dummy.position.set(side * 0.96, 1.98, -1.7 + k * 0.65);
      _dummy.rotation.set(0, Math.PI / 2, side * 0.68);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      padMesh.setMatrixAt(pIdx++, _dummy.matrix);
    }
  }
  padMesh.instanceMatrix.needsUpdate = true;
  staticGroup.add(padMesh);

  // Floor deck grating + instanced deck floor cross-bars
  const deck = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.12, 0.06, 4.5)),
    darkRackMat
  );
  deck.position.set(0, 0.38, -0.1);
  deck.receiveShadow = true;
  staticGroup.add(deck);

  const deckRibs = new THREE.InstancedMesh(
    track(new THREE.BoxGeometry(1.06, 0.015, 0.045)),
    frameMat,
    16
  );
  for (let i = 0; i < 16; i++) {
    _dummy.position.set(0, 0.415, -2.0 + i * 0.26);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    deckRibs.setMatrixAt(i, _dummy.matrix);
  }
  deckRibs.instanceMatrix.needsUpdate = true;
  staticGroup.add(deckRibs);

  // Microgravity Translation Handrails (Amber mid-rails + Blue ceiling rails)
  [-0.58, 0.58].forEach((hx) => {
    const rail = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.015, 0.015, 4.2, 10)),
      handrailMat
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.set(hx, 1.68, -0.1);
    staticGroup.add(rail);
  });
  [-0.36, 0.36].forEach((bx) => {
    const blueRail = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.013, 0.013, 3.8, 10)),
      blueRailMat
    );
    blueRail.rotation.x = Math.PI / 2;
    blueRail.position.set(bx, 2.28, -0.1);
    staticGroup.add(blueRail);
  });

  // Umbilical Power & Telemetry Cable Bundles running along lower-left corner
  const floorCableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.62, 0.48, 1.8),
    new THREE.Vector3(-0.68, 0.52, 0.2),
    new THREE.Vector3(-0.64, 0.5, -1.6),
  ]);
  const floorCable = new THREE.Mesh(
    track(new THREE.TubeGeometry(floorCableCurve, 24, 0.025, 8, false)),
    cableMat
  );
  staticGroup.add(floorCable);

  // Aft Hatch Bulkhead toward Soyuz TM-24 with 8 radial locking dogs (sealed oversized radius)
  const bulkheadMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.38,
      metalness: 0.76,
      bumpMap: textures.brushedMetalBump,
      bumpScale: 0.003,
      side: THREE.DoubleSide,
    })
  );

  const aftBulkhead = new THREE.Mesh(
    track(new THREE.CircleGeometry(1.28, 32)),
    bulkheadMat
  );
  aftBulkhead.position.set(0, 1.44, -2.38);
  staticGroup.add(aftBulkhead);

  const soyuzHatch = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.38, 0.38, 0.08, 24)),
    darkRackMat
  );
  soyuzHatch.rotation.x = Math.PI / 2;
  soyuzHatch.position.set(0, 1.42, -2.34);
  staticGroup.add(soyuzHatch);

  const hatchDogs = new THREE.InstancedMesh(
    track(new THREE.BoxGeometry(0.04, 0.025, 0.03)),
    handrailMat,
    8
  );
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    _dummy.position.set(Math.cos(a) * 0.36, 1.42 + Math.sin(a) * 0.36, -2.29);
    _dummy.rotation.set(0, 0, a);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    hatchDogs.setMatrixAt(i, _dummy.matrix);
  }
  hatchDogs.instanceMatrix.needsUpdate = true;
  staticGroup.add(hatchDogs);

  // Forward Bulkhead & Mir Base-Block Transfer Hatch (seals the +Z end completely so 360° VR has zero open black void)
  const fwdBulkhead = new THREE.Mesh(
    track(new THREE.CircleGeometry(1.28, 32)),
    bulkheadMat
  );
  fwdBulkhead.rotation.y = Math.PI;
  fwdBulkhead.position.set(0, 1.44, 2.18);
  staticGroup.add(fwdBulkhead);

  const fwdHatch = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.38, 0.38, 0.08, 24)),
    darkRackMat
  );
  fwdHatch.rotation.x = Math.PI / 2;
  fwdHatch.position.set(0, 1.42, 2.14);
  staticGroup.add(fwdHatch);

  const fwdHatchCollar = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.41, 0.028, 10, 28)),
    handrailMat
  );
  fwdHatchCollar.position.set(0, 1.42, 2.11);
  staticGroup.add(fwdHatchCollar);

  const fwdWheel = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.11, 0.015, 8, 18)),
    sfogMetalMat
  );
  fwdWheel.position.set(0, 1.42, 2.08);
  staticGroup.add(fwdWheel);

  const fwdDogs = new THREE.InstancedMesh(
    track(new THREE.BoxGeometry(0.04, 0.025, 0.03)),
    handrailMat,
    8
  );
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    _dummy.position.set(Math.cos(a) * 0.36, 1.42 + Math.sin(a) * 0.36, 2.09);
    _dummy.rotation.set(0, 0, a);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    fwdDogs.setMatrixAt(i, _dummy.matrix);
  }
  fwdDogs.instanceMatrix.needsUpdate = true;
  staticGroup.add(fwdDogs);

  // Overhead Kvant-1 Fluorescent Cabin Light Fixtures along spine
  const ceilingStripMat = track(
    new THREE.MeshBasicMaterial({ color: 0xf8fafc })
  );
  [-1.25, 0.1, 1.3].forEach((lz) => {
    const housing = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.22, 0.04, 0.54)),
      darkRackMat
    );
    housing.position.set(0, 2.58, lz);
    const tube = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.14, 0.024, 0.48)),
      ceilingStripMat
    );
    tube.position.set(0, 2.555, lz);
    staticGroup.add(housing, tube);
  });

  // Gyrodine Control Moment Gyroscope Drums & Science Experiment Racks (breaker texture)
  const rackExpMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.breakerPanel,
      roughness: 0.45,
      metalness: 0.45,
      emissive: new THREE.Color(0x0f172a),
      emissiveIntensity: 0.25,
    })
  );
  [-0.86, 0.86].forEach((gx) => {
    const gyrodineDrum = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.18, 0.18, 0.34, 16)),
      sfogMetalMat
    );
    gyrodineDrum.rotation.z = Math.PI / 2;
    gyrodineDrum.position.set(gx, 0.82, 0.95);
    staticGroup.add(gyrodineDrum);
  });

  const portPanel = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.05, 0.56, 0.62)),
    rackExpMat
  );
  portPanel.position.set(-0.98, 1.4, 0.95);
  portPanel.rotation.y = Math.PI / 2;
  staticGroup.add(portPanel);

  // Quartz Orbital Viewport showing glowing Earth Limb (fog-free)
  const viewportFrame = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.28, 0.036, 10, 28)),
    frameMat
  );
  viewportFrame.rotation.y = Math.PI / 2;
  viewportFrame.position.set(1.16, 1.48, 0.45);
  staticGroup.add(viewportFrame);

  const earthView = new THREE.Mesh(
    track(new THREE.CircleGeometry(0.27, 28)),
    track(new THREE.MeshBasicMaterial({ map: textures.earthHorizon, fog: false }))
  );
  earthView.rotation.y = -Math.PI / 2;
  earthView.position.set(1.15, 1.48, 0.45);
  staticGroup.add(earthView);
  root.add(staticGroup);

  // 2. ANCHOR 1: Vika (SFOG) Solid-Fuel Oxygen Generator + Spare Candle Tubes & Scorch Shield
  const sfogAnchor = new THREE.Group();
  sfogAnchor.name = 'Vika (SFOG) Oxygen Generator';
  sfogAnchor.position.set(-0.62, 1.44, -0.78);

  const sfogMount = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.24, 0.64, 0.46)),
    darkRackMat
  );
  sfogMount.position.set(-0.14, 0, 0);
  sfogAnchor.add(sfogMount);

  // Control dial & ignition plunger lever on Vika box
  const vikaDial = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.042, 0.042, 0.02, 14)),
    sfogMetalMat
  );
  vikaDial.rotation.z = Math.PI / 2;
  vikaDial.position.set(-0.015, 0.2, 0.12);
  const plunger = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 10)),
    handrailMat
  );
  plunger.rotation.z = Math.PI / 2;
  plunger.position.set(0.02, -0.18, 0.14);
  sfogAnchor.add(vikaDial, plunger);

  // Spare lithium-perchlorate candle tubes racked beside active unit
  [-0.14, -0.05].forEach((sz) => {
    const spareTube = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.042, 0.042, 0.24, 12)),
      sfogMetalMat
    );
    spareTube.position.set(-0.04, -0.24, sz);
    sfogAnchor.add(spareTube);
  });

  // Cylindrical SFOG Combustion Housing
  const sfogHousing = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.085, 0.085, 0.34, 18)),
    sfogMetalMat
  );
  sfogHousing.rotation.z = -Math.PI / 2;
  sfogHousing.position.set(0.06, 0.04, 0);
  sfogAnchor.add(sfogHousing);

  const sfogCanister = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.055, 0.055, 0.24, 16)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.35,
        metalness: 0.65,
        emissive: 0x000000,
      })
    )
  );
  sfogCanister.rotation.z = -Math.PI / 2;
  sfogCanister.position.set(0.16, 0.04, 0);
  sfogAnchor.add(sfogCanister);

  // Post-1997 Containment Shroud
  const containmentShroud = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.125, 0.125, 0.4, 18, 1, false)),
    shroudMat
  );
  containmentShroud.rotation.z = -Math.PI / 2;
  containmentShroud.position.set(0.1, 0.04, 0);
  containmentShroud.visible = false;
  sfogAnchor.add(containmentShroud);

  // 1.5-Foot (~0.46 m) Torch-like Flame Plume projecting across Kvant-1 corridor
  const torchFlameMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xff7b1c,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  const torchFlame = new THREE.Mesh(
    track(new THREE.ConeGeometry(0.12, 0.56, 16, 1, true)),
    torchFlameMat
  );
  torchFlame.rotation.z = -Math.PI / 2;
  torchFlame.position.set(0.54, 0.04, 0);
  sfogAnchor.add(torchFlame);

  const torchInnerMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  const torchInner = new THREE.Mesh(
    track(new THREE.ConeGeometry(0.055, 0.38, 12)),
    torchInnerMat
  );
  torchInner.rotation.z = -Math.PI / 2;
  torchInner.position.set(0.45, 0.04, 0);
  sfogAnchor.add(torchInner);

  root.add(sfogAnchor);

  // 3. ANCHOR 2: Kvant-1 Narrow Corridor, Avionics Rack & Instanced Switches
  const corridorAnchor = new THREE.Group();
  corridorAnchor.name = 'Kvant-1 Corridor & Equipment Racks';
  corridorAnchor.position.set(0.46, 1.38, -0.58);

  const rackBody = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.32, 0.92, 0.88)),
    darkRackMat
  );
  rackBody.position.set(0.24, 0, 0);
  corridorAnchor.add(rackBody);

  const rackFace = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.04, 0.78, 0.78)),
    frameMat
  );
  rackFace.position.set(0.07, 0, 0);
  corridorAnchor.add(rackFace);

  // Telemetry CRT screen & instanced status switches on opposing rack
  const crtScreen = new THREE.Mesh(
    track(new THREE.PlaneGeometry(0.22, 0.16)),
    track(new THREE.MeshBasicMaterial({ color: 0x0ea5e9 }))
  );
  crtScreen.rotation.y = -Math.PI / 2;
  crtScreen.position.set(0.048, 0.18, -0.14);
  corridorAnchor.add(crtScreen);

  const rackSwitches = new THREE.InstancedMesh(
    track(new THREE.CylinderGeometry(0.006, 0.006, 0.025, 6)),
    sfogMetalMat,
    20
  );
  for (let i = 0; i < 20; i++) {
    const r = Math.floor(i / 5);
    const c = i % 5;
    _dummy.position.set(0.045, -0.22 + r * 0.08, -0.22 + c * 0.11);
    _dummy.rotation.set(0, 0, Math.PI / 2);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    rackSwitches.setMatrixAt(i, _dummy.matrix);
  }
  rackSwitches.instanceMatrix.needsUpdate = true;
  corridorAnchor.add(rackSwitches);

  // Egress blockage barrier plane
  const blockageMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const blockageBarrier = new THREE.Mesh(
    track(new THREE.PlaneGeometry(0.95, 1.35)),
    blockageMat
  );
  blockageBarrier.position.set(-0.46, 0.04, -0.2);
  corridorAnchor.add(blockageBarrier);
  root.add(corridorAnchor);

  // 4. ANCHOR 3: Overhead Ventilation Ducts, HEPA Box & Water-Foam Extinguishers
  const ventilationAnchor = new THREE.Group();
  ventilationAnchor.name = 'Ventilation Ducts & Extinguishers';
  ventilationAnchor.position.set(0, 2.02, -0.35);

  const ductTube = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.11, 0.11, 2.6, 16)),
    frameMat
  );
  ductTube.rotation.x = Math.PI / 2;
  ductTube.position.set(0, 0.16, 0);
  ventilationAnchor.add(ductTube);

  const hepaHousing = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.32, 0.16, 0.36)),
    darkRackMat
  );
  hepaHousing.position.set(0, 0.12, -0.45);
  ventilationAnchor.add(hepaHousing);

  const fanVaneGroup = new THREE.Group();
  fanVaneGroup.position.set(0, 0.04, 0.25);
  const vaneGeo = track(new THREE.BoxGeometry(0.14, 0.015, 0.03));
  for (let i = 0; i < 4; i++) {
    const vane = new THREE.Mesh(vaneGeo, sfogMetalMat);
    vane.rotation.y = (i * Math.PI) / 4;
    fanVaneGroup.add(vane);
  }
  ventilationAnchor.add(fanVaneGroup);

  // Mounted Water-Foam Extinguisher Cylinders with horn nozzles & brackets
  [-0.36, 0.36].forEach((ex) => {
    const ext = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.055, 0.055, 0.34, 14)),
      extinguisherMat
    );
    ext.position.set(ex, -0.22, 0.4);
    const nozzle = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.025, 0.08, 10)),
      darkRackMat
    );
    nozzle.position.set(ex, -0.02, 0.44);
    nozzle.rotation.x = 0.6;
    ventilationAnchor.add(ext, nozzle);
  });
  root.add(ventilationAnchor);

  // 5. ANCHOR 4: Emergency Respirators (PBA Canisters & Visors) & Forward Soyuz Escape Route
  const respiratorAnchor = new THREE.Group();
  respiratorAnchor.name = 'Emergency Respirators & Soyuz Path';
  respiratorAnchor.position.set(0, 1.32, 0.52);

  const ppeLocker = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.42, 0.46, 0.22)),
    darkRackMat
  );
  ppeLocker.position.set(-0.56, 0, 0);
  respiratorAnchor.add(ppeLocker);

  [-0.08, 0.08].forEach((mz) => {
    const maskVisor = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.075, 14, 12)),
      shroudMat
    );
    maskVisor.position.set(-0.44, 0.06, mz);
    const o2Bottle = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 10)),
      sfogMetalMat
    );
    o2Bottle.position.set(-0.44, -0.1, mz);
    respiratorAnchor.add(maskVisor, o2Bottle);
  });
  root.add(respiratorAnchor);

  // 6. Microgravity Sparks & Smoke Dispersion Particles (InstancedMesh)
  const sparkCount = 46;
  const sparkParticles = new THREE.InstancedMesh(
    track(new THREE.SphereGeometry(0.018, 8, 8)),
    track(new THREE.MeshBasicMaterial({ color: 0xffffff })),
    sparkCount
  );
  sparkParticles.frustumCulled = false;
  root.add(sparkParticles);

  const smokeCount = 54;
  const smokeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    })
  );
  const smokeParticles = new THREE.InstancedMesh(
    track(new THREE.DodecahedronGeometry(0.11, 1)),
    smokeMat,
    smokeCount
  );
  smokeParticles.frustumCulled = false;
  const smokeBase: THREE.Vector3[] = [];
  for (let i = 0; i < smokeCount; i++) {
    smokeBase.push(
      new THREE.Vector3(
        (Math.random() - 0.5) * 1.4,
        0.75 + Math.random() * 1.3,
        -1.6 + Math.random() * 2.8
      )
    );
  }
  root.add(smokeParticles);

  // Freeze static structural matrices for VR performance
  staticGroup.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.matrixAutoUpdate = false;
      obj.updateMatrix();
    }
  });

  const componentAnchors = new Map<string, THREE.Object3D>([
    ['mir-sfog', sfogAnchor],
    ['mir-corridor', corridorAnchor],
    ['mir-ventilation', ventilationAnchor],
    ['mir-respirators', respiratorAnchor],
  ]);

  const updateVisualState = (
    state: InvestigationVisualState,
    elapsed: number,
    _delta: number,
    showUpgradeComparison: boolean
  ) => {
    const isUpgraded = state === 'upgraded' || showUpgradeComparison;
    const activeFire = state === 'ignition' || state === 'escalation';
    const heavySmoke =
      state === 'escalation' || state === 'response' || state === 'outcome';

    const canMat = sfogCanister.material as THREE.MeshStandardMaterial;
    if (state === 'precondition') {
      canMat.emissive.setHex(0xf97316);
      canMat.emissiveIntensity = 0.45;
    } else if (activeFire) {
      canMat.emissive.setHex(0xff5500);
      canMat.emissiveIntensity = 1.6;
    } else {
      canMat.emissive.setHex(0x000000);
      canMat.emissiveIntensity = 0;
    }

    containmentShroud.visible = isUpgraded;

    if (activeFire && !isUpgraded) {
      const flicker = 0.85 + Math.sin(elapsed * 28) * 0.15;
      torchFlameMat.opacity = 0.78;
      torchInnerMat.opacity = 0.92;
      torchFlame.scale.set(flicker, 1 + Math.sin(elapsed * 20) * 0.15, flicker);
      torchInner.scale.set(flicker, 1 + Math.cos(elapsed * 24) * 0.12, flicker);
    } else {
      torchFlameMat.opacity = 0;
      torchInnerMat.opacity = 0;
    }

    blockageMat.opacity =
      activeFire && !isUpgraded ? 0.22 + Math.sin(elapsed * 5) * 0.08 : 0;

    if (state !== 'response' && state !== 'escalation') {
      fanVaneGroup.rotation.y = elapsed * 4.5;
    }

    for (let i = 0; i < sparkCount; i++) {
      const t = (elapsed * 1.4 + i / sparkCount) % 1;
      if (activeFire && !isUpgraded) {
        const spreadY = ((i % 7) - 3) * 0.055;
        const spreadZ = ((Math.floor(i / 7) % 7) - 3) * 0.055;
        _dummy.position.set(
          -0.46 + t * 1.1,
          1.44 + spreadY,
          -0.78 + spreadZ
        );
        _dummy.scale.setScalar(1 - t * 0.5);
        _color.setHex(i % 2 === 0 ? 0xfbbf24 : 0xf97316);
      } else if (state === 'response' && !isUpgraded) {
        _dummy.position.set(
          THREE.MathUtils.lerp(0.25, -0.5, t),
          THREE.MathUtils.lerp(1.65, 1.42 + Math.sin(i) * 0.16, t),
          THREE.MathUtils.lerp(0.05, -0.78 + Math.cos(i) * 0.16, t)
        );
        _dummy.scale.setScalar(1.1);
        _color.setHex(0xbae6fd);
      } else {
        _dummy.position.set(
          -0.44 + t * 0.38,
          1.44 + Math.sin(elapsed * 2 + i) * 0.08,
          -0.78 + Math.cos(elapsed * 2 + i) * 0.08
        );
        _dummy.scale.setScalar(isUpgraded ? 0.8 : 0.65);
        _color.setHex(isUpgraded ? 0x34d399 : 0x38bdf8);
      }
      _dummy.updateMatrix();
      sparkParticles.setMatrixAt(i, _dummy.matrix);
      sparkParticles.setColorAt(i, _color);
    }
    sparkParticles.instanceMatrix.needsUpdate = true;
    if (sparkParticles.instanceColor) sparkParticles.instanceColor.needsUpdate = true;

    smokeParticles.visible = heavySmoke && !isUpgraded;
    if (smokeParticles.visible) {
      smokeMat.opacity = state === 'escalation' ? 0.42 : state === 'response' ? 0.34 : 0.14;
      for (let i = 0; i < smokeCount; i++) {
        const b = smokeBase[i];
        _dummy.position.set(
          b.x + Math.sin(elapsed * 0.5 + i) * 0.08,
          b.y + Math.cos(elapsed * 0.45 + i * 1.1) * 0.08,
          b.z + Math.sin(elapsed * 0.35 + i * 0.7) * 0.12
        );
        const s = state === 'outcome' ? 0.5 : 1.0 + Math.sin(elapsed + i) * 0.15;
        _dummy.scale.setScalar(s);
        _dummy.updateMatrix();
        smokeParticles.setMatrixAt(i, _dummy.matrix);
      }
      smokeParticles.instanceMatrix.needsUpdate = true;
    }
  };

  return {
    root,
    componentAnchors,
    updateVisualState,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}
