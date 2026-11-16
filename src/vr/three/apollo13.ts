import * as THREE from 'three';
import { BuiltSpacecraftScene, InvestigationVisualState } from '../types.ts';
import { ProceduralTextureSet } from '../utils/proceduralTextures.ts';

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export function buildApollo13Scene(
  textures: ProceduralTextureSet
): BuiltSpacecraftScene {
  const root = new THREE.Group();
  root.name = 'Apollo 13 (Odyssey · SM Bay 4 · Aquarius)';

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // Materials
  const cmHullMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b424d,
      roughness: 0.55,
      metalness: 0.52,
      bumpMap: textures.brushedMetalBump,
      bumpScale: 0.004,
      side: THREE.DoubleSide,
    })
  );
  const aluminumMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xb0bac5,
      roughness: 0.28,
      metalness: 0.88,
      bumpMap: textures.brushedMetalBump,
      bumpScale: 0.003,
    })
  );
  const darkMetalMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.58,
      metalness: 0.65,
    })
  );
  const inconelTankMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.22,
      metalness: 0.92,
    })
  );
  const goldFoilMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.34,
      metalness: 0.85,
      bumpMap: textures.quiltedBlanketBump,
      bumpScale: 0.01,
    })
  );
  const betaClothMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.72,
      metalness: 0.08,
      map: textures.quiltedBlanketColor,
      bumpMap: textures.quiltedBlanketBump,
      bumpScale: 0.008,
    })
  );
  const consoleNominalMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.apolloConsole,
      roughness: 0.45,
      metalness: 0.35,
      emissive: new THREE.Color(0x0f172a),
      emissiveIntensity: 0.35,
    })
  );
  const consoleAlertMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.apolloConsoleAlert,
      roughness: 0.45,
      metalness: 0.35,
      emissive: new THREE.Color(0x7c2d12),
      emissiveIntensity: 0.55,
    })
  );
  const consoleColdMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.apolloConsoleCold,
      roughness: 0.65,
      metalness: 0.25,
      emissive: new THREE.Color(0x020617),
      emissiveIntensity: 0.1,
    })
  );
  const o2PipeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.3,
      metalness: 0.75,
    })
  );
  const h2PipeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.32,
      metalness: 0.72,
    })
  );
  const ductTapeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.48,
      metalness: 0.2,
    })
  );
  const cardboardMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd6d3d1,
      roughness: 0.85,
      metalness: 0.04,
    })
  );

  // 1. Command Module "Odyssey" Interior Frame, Ceiling Bulkhead, Structural Rings & Couches
  const cmGroup = new THREE.Group();
  const cmShell = new THREE.Mesh(
    track(new THREE.CylinderGeometry(1.12, 1.78, 2.2, 30, 1, true, -Math.PI * 0.65, Math.PI * 1.3)),
    cmHullMat
  );
  cmShell.position.set(0, 1.38, 0.05);
  cmGroup.add(cmShell);

  // Seal top of Odyssey CM with Forward Docking Tunnel & Overhead Cockpit Lights
  const cmCeiling = new THREE.Mesh(
    track(new THREE.CircleGeometry(1.16, 30)),
    cmHullMat
  );
  cmCeiling.rotation.x = Math.PI / 2;
  cmCeiling.position.set(0, 2.48, 0.05);
  cmGroup.add(cmCeiling);

  const cmTunnelRing = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.42, 0.48, 0.24, 24)),
    aluminumMat
  );
  cmTunnelRing.position.set(0, 2.38, 0.05);
  cmGroup.add(cmTunnelRing);

  const cabinLampMat = track(new THREE.MeshBasicMaterial({ color: 0xe0f2fe }));
  [-0.5, 0.5].forEach((lx) => {
    const lamp = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.12, 0.03, 0.44)),
      cabinLampMat
    );
    lamp.position.set(lx, 2.44, 0.02);
    cmGroup.add(lamp);
  });

  // Circuit breaker & telemetry wall panel on Odyssey starboard bulkhead
  const odysseyBreakerMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.breakerPanel,
      roughness: 0.45,
      metalness: 0.35,
      emissive: new THREE.Color(0x0f172a),
      emissiveIntensity: 0.3,
    })
  );
  const odysseyBreaker = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.48, 0.42, 0.04)),
    odysseyBreakerMat
  );
  odysseyBreaker.position.set(1.24, 1.38, 0.22);
  odysseyBreaker.rotation.y = -Math.PI / 2 + 0.16;
  cmGroup.add(odysseyBreaker);

  const cmDeck = new THREE.Mesh(
    track(new THREE.CylinderGeometry(1.78, 1.8, 0.08, 30)),
    darkMetalMat
  );
  cmDeck.position.set(0, 0.28, 0.05);
  cmDeck.receiveShadow = true;
  cmGroup.add(cmDeck);

  // Structural ribs inside Odyssey
  for (let i = 0; i < 3; i++) {
    const t = i / 2;
    const r = THREE.MathUtils.lerp(1.72, 1.15, t);
    const rib = new THREE.Mesh(
      track(new THREE.TorusGeometry(r, 0.025, 8, 36, Math.PI * 1.3)),
      aluminumMat
    );
    rib.rotation.x = Math.PI / 2;
    rib.rotation.z = -Math.PI * 0.65;
    rib.position.set(0, 0.48 + t * 1.68, 0.05);
    cmGroup.add(rib);
  }

  // Crew couches in Odyssey with Beta-cloth pads & restraints
  const seatGeo = track(new THREE.BoxGeometry(0.36, 0.52, 0.08));
  const strapGeo = track(new THREE.BoxGeometry(0.03, 0.42, 0.015));
  [-0.45, 0, 0.45].forEach((cx) => {
    const seat = new THREE.Mesh(seatGeo, betaClothMat);
    seat.position.set(cx, 0.72, 0.45);
    seat.rotation.x = -0.35;
    cmGroup.add(seat);

    [-0.08, 0.08].forEach((sx) => {
      const strap = new THREE.Mesh(strapGeo, darkMetalMat);
      strap.position.set(cx + sx, 0.75, 0.4);
      strap.rotation.x = -0.35;
      cmGroup.add(strap);
    });
  });
  root.add(cmGroup);

  // 2. ANCHOR 3: Command Module "Odyssey" Control Console + Instanced Switches & DSKY
  const cmConsoleAnchor = new THREE.Group();
  cmConsoleAnchor.name = 'Odyssey Control Console';
  cmConsoleAnchor.position.set(0.05, 1.32, -0.38);

  const mdcFace = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.18, 0.56, 0.1)),
    consoleNominalMat
  );
  mdcFace.rotation.x = 0.22;
  cmConsoleAnchor.add(mdcFace);

  const mdcFrame = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.26, 0.64, 0.08)),
    darkMetalMat
  );
  mdcFrame.position.z = -0.05;
  mdcFrame.rotation.x = 0.22;
  cmConsoleAnchor.add(mdcFrame);

  // Guard rail & Instanced physical toggle switches
  const guardRail = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.01, 0.01, 1.18, 10)),
    aluminumMat
  );
  guardRail.rotation.z = Math.PI / 2;
  guardRail.position.set(0, -0.22, 0.11);
  cmConsoleAnchor.add(guardRail);

  const cmSwitches = new THREE.InstancedMesh(
    track(new THREE.CylinderGeometry(0.004, 0.005, 0.025, 6)),
    aluminumMat,
    36
  );
  let csIdx = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 12; col++) {
      const sx = -0.48 + col * 0.086;
      const sy = -0.14 + row * 0.13;
      const sz = 0.062 - sy * 0.22;
      _dummy.position.set(sx, sy, sz);
      _dummy.rotation.set(Math.PI / 2 + 0.22, 0, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      cmSwitches.setMatrixAt(csIdx++, _dummy.matrix);
    }
  }
  cmSwitches.instanceMatrix.needsUpdate = true;
  cmConsoleAnchor.add(cmSwitches);

  // DSKY below Odyssey console
  const dsky = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.24, 0.2, 0.09)),
    darkMetalMat
  );
  dsky.position.set(0, -0.36, 0.12);
  dsky.rotation.x = -0.3;
  cmConsoleAnchor.add(dsky);
  root.add(cmConsoleAnchor);

  // 3. Service Module Bay 4 Cutaway Structure with Cylindrical Fuselage Shell, Radiators & RCS Quad
  const smGroup = new THREE.Group();
  smGroup.position.set(-0.85, 1.25, -0.78);

  // Partial Service Module cylindrical fuselage backing & top/bottom end caps so Bay 4 sits in solid hardware
  const smFuselage = new THREE.Mesh(
    track(
      new THREE.CylinderGeometry(
        0.58,
        0.58,
        1.26,
        24,
        1,
        false,
        Math.PI * 0.28,
        Math.PI * 0.92
      )
    ),
    cmHullMat
  );
  smFuselage.position.set(0.05, -0.02, -0.04);
  smGroup.add(smFuselage);

  // White/Silver Thermal Radiator Panels flanking SM Sector 4
  const smRadiator = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.04, 1.18, 0.54)),
    betaClothMat
  );
  smRadiator.position.set(0.42, 0.0, -0.26);
  smGroup.add(smRadiator);

  // RCS Thruster Quad Pod mounted on Service Module side
  const rcsPod = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.16, 0.22, 0.16)),
    aluminumMat
  );
  rcsPod.position.set(-0.28, 0.68, -0.34);
  smGroup.add(rcsPod);
  [0, 1, 2].forEach((n) => {
    const nozzle = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.036, 0.09, 12, 1, true)),
      darkMetalMat
    );
    nozzle.position.set(-0.28, 0.68 + (n === 0 ? 0.13 : n === 1 ? -0.13 : 0), n === 2 ? -0.44 : -0.34);
    if (n === 1) nozzle.rotation.x = Math.PI;
    if (n === 2) nozzle.rotation.x = -Math.PI / 2;
    smGroup.add(nozzle);
  });

  [-0.36, 0.08, 0.52].forEach((sy) => {
    const shelf = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.72, 0.035, 0.78)),
      aluminumMat
    );
    shelf.position.set(0, sy, 0);
    smGroup.add(shelf);
  });
  const backBulkhead = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.04, 1.05, 0.82)),
    darkMetalMat
  );
  backBulkhead.position.set(0.35, 0.1, 0);
  smGroup.add(backBulkhead);

  // Structural corner longerons in Sector 4
  [
    [-0.32, -0.38],
    [-0.32, 0.38],
    [0.32, -0.38],
    [0.32, 0.38],
  ].forEach(([lx, lz]) => {
    const longeron = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.04, 1.02, 0.04)),
      aluminumMat
    );
    longeron.position.set(lx, 0.1, lz);
    smGroup.add(longeron);
  });

  // Lower shelf Cryogenic Hydrogen (H2) Tanks 1 & 2 for authentic Sector 4 layout
  [-0.18, 0.18].forEach((hz) => {
    const h2Tank = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.13, 18, 14)),
      goldFoilMat
    );
    h2Tank.position.set(0.05, -0.52, hz);
    smGroup.add(h2Tank);
  });

  // Detachable Bay 4 Outer Honeycomb Panel (with ribbed inner face)
  const bay4OuterPanel = new THREE.Group();
  bay4OuterPanel.position.set(-0.42, 0.1, 0);
  const outerSkin = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.04, 1.05, 0.82)),
    aluminumMat
  );
  const innerHoneycomb = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.015, 0.96, 0.74)),
    goldFoilMat
  );
  innerHoneycomb.position.x = 0.025;
  bay4OuterPanel.add(outerSkin, innerHoneycomb);
  smGroup.add(bay4OuterPanel);
  root.add(smGroup);

  // 4. ANCHOR 1: Cryogenic Oxygen Tank No. 2 (Cutaway with Heater, 28V Switch, Teflon Coil & Fan)
  const o2Tank2Anchor = new THREE.Group();
  o2Tank2Anchor.name = 'Cryogenic Oxygen Tank No. 2';
  o2Tank2Anchor.position.set(-0.92, 1.15, -0.82);

  const tank1 = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.16, 24, 18)),
    inconelTankMat
  );
  tank1.position.set(0.14, -0.18, 0.22);
  o2Tank2Anchor.add(tank1);

  const tank2Outer = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.175, 24, 18, 0, Math.PI * 1.35)),
    inconelTankMat
  );
  tank2Outer.rotation.y = -Math.PI * 0.35;
  o2Tank2Anchor.add(tank2Outer);

  // Neck fill/vent standpipe & collar flange atop Tank 2
  const standpipe = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.026, 0.026, 0.14, 12)),
    aluminumMat
  );
  standpipe.position.set(0, 0.18, 0);
  o2Tank2Anchor.add(standpipe);

  const heaterCore = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.022, 0.022, 0.24, 12)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        roughness: 0.35,
        metalness: 0.7,
        emissive: 0x000000,
      })
    )
  );
  o2Tank2Anchor.add(heaterCore);

  // 28V Bimetallic Thermostatic Switch block & damaged Teflon wire coil
  const switchBlock = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.04, 0.04, 0.03)),
    darkMetalMat
  );
  switchBlock.position.set(0.045, -0.04, 0.02);
  const teflonLead = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.048, 0.006, 6, 16, Math.PI * 1.4)),
    track(new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 }))
  );
  teflonLead.position.set(0.02, 0.02, 0.03);
  o2Tank2Anchor.add(switchBlock, teflonLead);

  const fanGroup = new THREE.Group();
  fanGroup.position.set(0, 0.08, 0);
  const fanBladeGeo = track(new THREE.BoxGeometry(0.09, 0.012, 0.025));
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(fanBladeGeo, aluminumMat);
    blade.rotation.y = (b * Math.PI) / 3;
    fanGroup.add(blade);
  }
  o2Tank2Anchor.add(fanGroup);

  const ruptureMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xfb923c,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  const ruptureSphere = new THREE.Mesh(
    track(new THREE.IcosahedronGeometry(0.24, 2)),
    ruptureMat
  );
  o2Tank2Anchor.add(ruptureSphere);

  // Apollo 14+ Upgrade Hardware: Isolated Tank 3 & 400 Ah Aux Battery
  const apollo14UpgradeGroup = new THREE.Group();
  const tank3 = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.15, 20, 16)),
    track(new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.25, metalness: 0.85 }))
  );
  tank3.position.set(0.24, -0.18, -0.35);
  const auxBattery = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.22, 0.16, 0.24)),
    goldFoilMat
  );
  auxBattery.position.set(0.08, 0.24, -0.24);
  apollo14UpgradeGroup.add(tank3, auxBattery);
  apollo14UpgradeGroup.visible = false;
  o2Tank2Anchor.add(apollo14UpgradeGroup);

  root.add(o2Tank2Anchor);

  // 5. ANCHOR 2: Service Module Fuel Cells 1–3, Radiator Manifold & Electrical Buses
  const fuelCellsAnchor = new THREE.Group();
  fuelCellsAnchor.name = 'SM Fuel Cells & Electrical Buses';
  fuelCellsAnchor.position.set(-0.72, 1.56, -0.58);

  const fcMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const fcMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.35,
        metalness: 0.78,
        emissive: new THREE.Color(0x0284c7),
        emissiveIntensity: 0.25,
      })
    );
    const fc = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.085, 0.085, 0.24, 16)),
      fcMat
    );
    fc.position.set(-0.14, 0.04, -0.18 + i * 0.22);
    fuelCellsAnchor.add(fc);
    fcMeshes.push(fc);

    // Fuel cell radiator collar & reactant cap
    const cap = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.095, 0.095, 0.03, 16)),
      aluminumMat
    );
    cap.position.set(-0.14, 0.17, -0.18 + i * 0.22);
    fuelCellsAnchor.add(cap);
  }

  // Dual O2 + H2 cryo manifolds connecting Sector 4 shelves to Fuel Cells
  const manifoldCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.2, -0.4, -0.24),
    new THREE.Vector3(-0.18, -0.15, -0.1),
    new THREE.Vector3(-0.14, 0.02, 0.0),
  ]);
  const manifoldPipe = new THREE.Mesh(
    track(new THREE.TubeGeometry(manifoldCurve, 20, 0.018, 8, false)),
    o2PipeMat
  );
  const h2ManifoldCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.14, -0.68, -0.2),
    new THREE.Vector3(-0.1, -0.24, -0.04),
    new THREE.Vector3(-0.12, 0.0, 0.14),
  ]);
  const h2Manifold = new THREE.Mesh(
    track(new THREE.TubeGeometry(h2ManifoldCurve, 20, 0.014, 8, false)),
    h2PipeMat
  );
  fuelCellsAnchor.add(manifoldPipe, h2Manifold);
  root.add(fuelCellsAnchor);

  // 6. ANCHOR 4: Lunar Module "Aquarius" Lifeboat, Tunnel Latches & CO2 "Mailbox"
  const lmAnchor = new THREE.Group();
  lmAnchor.name = 'Lunar Module Aquarius & CO2 Mailbox';
  lmAnchor.position.set(0.88, 1.38, 0.28);

  const tunnel = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.32, 0.32, 0.65, 22, 1, true)),
    aluminumMat
  );
  tunnel.rotation.z = Math.PI / 2;
  tunnel.position.set(-0.42, 0, -0.12);
  lmAnchor.add(tunnel);

  // Instanced docking tunnel capture latches around ring
  const dockLatches = new THREE.InstancedMesh(
    track(new THREE.BoxGeometry(0.04, 0.025, 0.03)),
    goldFoilMat,
    12
  );
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    _dummy.position.set(-0.14, Math.cos(a) * 0.3, -0.12 + Math.sin(a) * 0.3);
    _dummy.rotation.set(a, 0, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    dockLatches.setMatrixAt(i, _dummy.matrix);
  }
  dockLatches.instanceMatrix.needsUpdate = true;
  lmAnchor.add(dockLatches);

  const lmShell = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.68, 0.72, 1.35, 8, 1, true)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.6,
        metalness: 0.5,
        side: THREE.DoubleSide,
      })
    )
  );
  lmShell.position.set(0.28, -0.05, 0);
  lmAnchor.add(lmShell);

  const lmFloor = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.69, 0.69, 0.05, 8)),
    darkMetalMat
  );
  lmFloor.position.set(0.28, -0.7, 0);
  lmAnchor.add(lmFloor);

  // Seal top of Lunar Module "Aquarius" with Overhead Hatch, Docking Ring & PGNS Guidance Display
  const lmCeiling = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.69, 0.69, 0.05, 8)),
    darkMetalMat
  );
  lmCeiling.position.set(0.28, 0.63, 0);
  lmAnchor.add(lmCeiling);

  const lmDockCollar = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.26, 0.024, 8, 24)),
    aluminumMat
  );
  lmDockCollar.rotation.x = Math.PI / 2;
  lmDockCollar.position.set(0.28, 0.59, 0);
  lmAnchor.add(lmDockCollar);

  const lmPanel = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.32, 0.24, 0.04)),
    track(
      new THREE.MeshStandardMaterial({
        map: textures.apolloConsole,
        roughness: 0.4,
        metalness: 0.4,
        emissive: new THREE.Color(0x0b2214),
        emissiveIntensity: 0.5,
      })
    )
  );
  lmPanel.position.set(0.46, 0.14, -0.34);
  lmPanel.rotation.y = -0.65;
  lmAnchor.add(lmPanel);

  // LM Ascent Engine Cover Dome inside Aquarius center floor
  const ascentCover = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.22, 0.28, 0.24, 12)),
    goldFoilMat
  );
  ascentCover.position.set(0.32, -0.56, 0);
  lmAnchor.add(ascentCover);

  // Detailed "Mailbox" CO2 Scrubber Assembly (Twin Square CM Canisters + Cue Card + Duct Tape + Hose)
  const mailboxGroup = new THREE.Group();
  mailboxGroup.position.set(0.05, -0.12, 0.14);

  const squareCanister = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.2, 0.16, 0.2)),
    betaClothMat
  );
  const cardboardBaffle = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.22, 0.1, 0.22)),
    cardboardMat
  );
  cardboardBaffle.position.y = 0.08;

  const tapeWrap = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.225, 0.06, 0.225)),
    ductTapeMat
  );
  tapeWrap.position.y = -0.04;

  const roundAdapter = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.075, 0.09, 0.12, 16)),
    darkMetalMat
  );
  roundAdapter.position.set(0, -0.12, 0);

  const hoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.18, 0),
    new THREE.Vector3(0.12, -0.26, 0.06),
    new THREE.Vector3(0.28, -0.2, 0.02),
  ]);
  const suitHose = new THREE.Mesh(
    track(new THREE.TubeGeometry(hoseCurve, 16, 0.024, 8, false)),
    ductTapeMat
  );

  mailboxGroup.add(squareCanister, cardboardBaffle, tapeWrap, roundAdapter, suitHose);
  lmAnchor.add(mailboxGroup);
  root.add(lmAnchor);

  // 7. Animated O2 / Power / CO2 Flow Particles (InstancedMesh)
  const particleCount = 42;
  const flowMesh = new THREE.InstancedMesh(
    track(new THREE.SphereGeometry(0.016, 8, 8)),
    track(new THREE.MeshBasicMaterial({ color: 0xffffff })),
    particleCount
  );
  flowMesh.frustumCulled = false;
  root.add(flowMesh);

  // 8. Cislunar Deep-Space Panorama (Fog-Free Starfield + Distant Earth & Moon)
  const spaceBackdrop = new THREE.Mesh(
    track(new THREE.SphereGeometry(52, 24, 16)),
    track(
      new THREE.MeshBasicMaterial({
        color: 0x091326,
        side: THREE.BackSide,
        fog: false,
        depthWrite: false,
      })
    )
  );
  root.add(spaceBackdrop);

  // Distant sunlit Earth sphere visible beyond forward cutaway
  const earthSphere = new THREE.Mesh(
    track(new THREE.SphereGeometry(2.6, 28, 20)),
    track(
      new THREE.MeshBasicMaterial({
        map: textures.earthHorizon,
        fog: false,
      })
    )
  );
  earthSphere.position.set(-4.2, 4.4, -14.5);
  earthSphere.rotation.y = 0.6;
  root.add(earthSphere);

  // Distant cratered Moon sphere on cislunar return trajectory
  const moonSphere = new THREE.Mesh(
    track(new THREE.SphereGeometry(1.15, 20, 16)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        roughness: 0.92,
        metalness: 0.02,
        emissive: new THREE.Color(0x334155),
        emissiveIntensity: 0.35,
        fog: false,
      })
    )
  );
  moonSphere.position.set(4.8, 3.8, -16.5);
  root.add(moonSphere);

  const starGeo = track(new THREE.BufferGeometry());
  const starPos = new Float32Array(550 * 3);
  for (let i = 0; i < 550; i++) {
    const r = 18 + Math.random() * 24;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi);
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    track(new THREE.PointsMaterial({ color: 0xe2e8f0, size: 0.16, fog: false }))
  );
  root.add(stars);

  // Contact shadow disc
  const shadowDisc = new THREE.Mesh(
    track(new THREE.PlaneGeometry(5.2, 5.2)),
    track(
      new THREE.MeshBasicMaterial({
        map: textures.contactShadow,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      })
    )
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.set(0, 0.22, -0.2);
  root.add(shadowDisc);

  // Freeze static matrices for optimal VR performance
  [cmGroup, stars, spaceBackdrop, earthSphere, moonSphere].forEach((grp) => {
    grp.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.matrixAutoUpdate = false;
        obj.updateMatrix();
      }
    });
  });

  const componentAnchors = new Map<string, THREE.Object3D>([
    ['a13-o2tank2', o2Tank2Anchor],
    ['a13-fuelcells', fuelCellsAnchor],
    ['a13-cm', cmConsoleAnchor],
    ['a13-lm', lmAnchor],
  ]);

  const updateVisualState = (
    state: InvestigationVisualState,
    elapsed: number,
    _delta: number,
    showUpgradeComparison: boolean
  ) => {
    const isUpgraded = state === 'upgraded' || showUpgradeComparison;

    if (state === 'ignition' || state === 'escalation') {
      mdcFace.material = consoleAlertMat;
    } else if (state === 'response' || state === 'outcome') {
      mdcFace.material = consoleColdMat;
    } else {
      mdcFace.material = consoleNominalMat;
    }

    const heaterMat = heaterCore.material as THREE.MeshStandardMaterial;
    if (state === 'precondition') {
      heaterMat.emissive.setHex(0xf97316);
      heaterMat.emissiveIntensity = 1.2 + Math.sin(elapsed * 4) * 0.3;
      fanGroup.rotation.y = elapsed * 2;
    } else if (state === 'ignition') {
      heaterMat.emissive.setHex(0xfef08a);
      heaterMat.emissiveIntensity = 2.0;
      fanGroup.rotation.y = elapsed * 14;
    } else {
      heaterMat.emissive.setHex(0x000000);
      heaterMat.emissiveIntensity = 0;
      fanGroup.rotation.y = state === 'nominal' ? elapsed * 3 : 0;
    }

    const blownOut =
      !isUpgraded &&
      (state === 'ignition' ||
        state === 'escalation' ||
        state === 'response' ||
        state === 'outcome');
    const targetPanelX = blownOut ? -1.35 : -0.42;
    const targetPanelRot = blownOut ? -0.42 : 0;
    bay4OuterPanel.position.x = THREE.MathUtils.lerp(
      bay4OuterPanel.position.x,
      targetPanelX,
      0.06
    );
    bay4OuterPanel.rotation.z = THREE.MathUtils.lerp(
      bay4OuterPanel.rotation.z,
      targetPanelRot,
      0.06
    );

    if (state === 'ignition') {
      ruptureMat.opacity = 0.72 + Math.sin(elapsed * 20) * 0.2;
      ruptureSphere.scale.setScalar(1 + Math.sin(elapsed * 16) * 0.22);
    } else if (state === 'escalation') {
      ruptureMat.opacity = 0.25;
      ruptureSphere.scale.setScalar(1.3);
    } else {
      ruptureMat.opacity = 0;
    }

    fcMeshes.forEach((fc, idx) => {
      const m = fc.material as THREE.MeshStandardMaterial;
      if (state === 'nominal' || state === 'precondition' || isUpgraded) {
        m.emissive.setHex(0x0ea5e9);
        m.emissiveIntensity = 0.45;
      } else if (state === 'escalation' && idx === 1) {
        m.emissive.setHex(0xf59e0b);
        m.emissiveIntensity = 0.55;
      } else {
        m.emissive.setHex(0xef4444);
        m.emissiveIntensity = state === 'ignition' ? 0.6 : 0.08;
      }
    });

    apollo14UpgradeGroup.visible = isUpgraded;
    fanGroup.visible = !isUpgraded;

    for (let i = 0; i < particleCount; i++) {
      const t = (elapsed * 0.45 + i / particleCount) % 1;
      if (i < 22) {
        if (state === 'escalation' || state === 'ignition') {
          _dummy.position.set(
            -0.92 - t * 0.85,
            1.15 + Math.sin(i * 2.1) * 0.15,
            -0.82 + Math.cos(i * 1.7) * 0.15
          );
          _color.setHex(0xf97316);
        } else {
          _dummy.position.set(
            THREE.MathUtils.lerp(-0.92, -0.72, t),
            THREE.MathUtils.lerp(1.15, 1.56, t),
            THREE.MathUtils.lerp(-0.82, -0.58, t)
          );
          _color.setHex(isUpgraded ? 0x34d399 : 0x38bdf8);
        }
      } else {
        const angle = t * Math.PI * 2;
        _dummy.position.set(
          0.93 + Math.cos(angle) * 0.18,
          1.26 + Math.sin(angle) * 0.14,
          0.42 + Math.sin(angle * 2) * 0.06
        );
        _color.setHex(state === 'response' ? 0x34d399 : 0x60a5fa);
      }
      _dummy.scale.setScalar(state === 'outcome' ? 0.65 : 1);
      _dummy.updateMatrix();
      flowMesh.setMatrixAt(i, _dummy.matrix);
      flowMesh.setColorAt(i, _color);
    }
    flowMesh.instanceMatrix.needsUpdate = true;
    if (flowMesh.instanceColor) flowMesh.instanceColor.needsUpdate = true;
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
