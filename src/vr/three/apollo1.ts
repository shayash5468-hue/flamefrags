import * as THREE from 'three';
import { BuiltSpacecraftScene, InvestigationVisualState } from '../types.ts';
import { ProceduralTextureSet } from '../utils/proceduralTextures.ts';

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export function buildApollo1Scene(
  textures: ProceduralTextureSet
): BuiltSpacecraftScene {
  const root = new THREE.Group();
  root.name = 'Apollo 1 Command Module (CM-012)';

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // Materials with crisp aerospace PBR roughness/metalness differentiation
  const hullMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b434d,
      roughness: 0.58,
      metalness: 0.5,
      bumpMap: textures.brushedMetalBump,
      bumpScale: 0.0045,
      side: THREE.DoubleSide,
    })
  );
  const ablatorMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1a1e24,
      roughness: 0.82,
      metalness: 0.16,
      side: THREE.DoubleSide,
    })
  );
  const ribMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x73808f,
      roughness: 0.3,
      metalness: 0.88,
    })
  );
  const floorMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x242a32,
      roughness: 0.78,
      metalness: 0.24,
      bumpMap: textures.brushedMetalBump,
      bumpScale: 0.003,
    })
  );
  const couchFrameMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xa2b0c0,
      roughness: 0.25,
      metalness: 0.9,
    })
  );
  const couchPadMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.84,
      metalness: 0.06,
      map: textures.quiltedBlanketColor,
      bumpMap: textures.quiltedBlanketBump,
      bumpScale: 0.009,
    })
  );
  const strapMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1b2434,
      roughness: 0.9,
      metalness: 0.04,
    })
  );
  const consoleNominalMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.apolloConsole,
      roughness: 0.42,
      metalness: 0.38,
      emissive: new THREE.Color(0x0f172a),
      emissiveIntensity: 0.38,
    })
  );
  const consoleAlertMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.apolloConsoleAlert,
      roughness: 0.42,
      metalness: 0.38,
      emissive: new THREE.Color(0x7c2d12),
      emissiveIntensity: 0.62,
    })
  );
  const nylonMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd4a373,
      roughness: 0.88,
      metalness: 0.02,
    })
  );
  const betaClothMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.72,
      metalness: 0.08,
      map: textures.quiltedBlanketColor,
      bumpMap: textures.quiltedBlanketBump,
      bumpScale: 0.01,
    })
  );
  const copperWireMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.3,
      metalness: 0.84,
    })
  );
  const silverWireMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.32,
      metalness: 0.78,
    })
  );
  const coolantPipeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.24,
      metalness: 0.8,
    })
  );
  const valveRedMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.34,
      metalness: 0.48,
    })
  );
  const hatchMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.36,
      metalness: 0.8,
      bumpMap: textures.brushedMetalBump,
      bumpScale: 0.004,
    })
  );
  const hatchSealMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.44,
      metalness: 0.22,
    })
  );
  const gantrySteelMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.62,
      metalness: 0.48,
    })
  );
  const glassMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      roughness: 0.08,
      metalness: 0.06,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    })
  );

  // 1. Conical Command Module Pressure Hull, Ablative Heat-Shield Skirt, Forward Docking Tunnel & RCS Pods
  const hullGroup = new THREE.Group();

  // Outer conical pressure shell + chamfered upper neck via LatheGeometry
  const cmProfile = [
    new THREE.Vector2(1.94, 0.22),
    new THREE.Vector2(1.91, 0.42),
    new THREE.Vector2(1.56, 1.48),
    new THREE.Vector2(1.16, 2.66),
    new THREE.Vector2(1.06, 2.74),
  ];
  const outerShell = new THREE.Mesh(
    track(new THREE.LatheGeometry(cmProfile, 40)),
    hullMat
  );
  outerShell.position.set(0, 0, -0.05);
  outerShell.receiveShadow = true;
  hullGroup.add(outerShell);

  // Phenolic-epoxy Ablative Aft Heat Shield Skirt Torus around CM base
  const heatShieldSkirt = new THREE.Mesh(
    track(new THREE.TorusGeometry(1.95, 0.09, 12, 42)),
    ablatorMat
  );
  heatShieldSkirt.rotation.x = Math.PI / 2;
  heatShieldSkirt.position.set(0, 0.19, -0.05);
  hullGroup.add(heatShieldSkirt);

  // 4 Lower Attitude-Control RCS Pitch/Yaw Nozzle Blisters on Aft Skirt
  for (let r = 0; r < 4; r++) {
    const a = (r / 4) * Math.PI * 2 + Math.PI / 4;
    const rcsPodGroup = new THREE.Group();
    rcsPodGroup.position.set(Math.cos(a) * 1.9, 0.34, -0.05 + Math.sin(a) * 1.9);
    rcsPodGroup.rotation.y = -a;

    const rcsHousing = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.14, 0.12, 0.14)),
      ribMat
    );
    const rcsBell = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.036, 0.085, 10, 1, true)),
      ablatorMat
    );
    rcsBell.position.set(0.09, 0, 0);
    rcsBell.rotation.z = Math.PI / 2;
    rcsPodGroup.add(rcsHousing, rcsBell);
    hullGroup.add(rcsPodGroup);
  }

  // Seal top of conical hull with Forward Docking Tunnel Bulkhead, Probe Housing & Parachute Bay
  const ceilingBulkhead = new THREE.Mesh(
    track(new THREE.CircleGeometry(1.06, 36)),
    hullMat
  );
  ceilingBulkhead.rotation.x = Math.PI / 2;
  ceilingBulkhead.position.set(0, 2.74, -0.05);
  hullGroup.add(ceilingBulkhead);

  const forwardTunnelCollar = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.45, 0.56, 0.34, 28, 1, false)),
    ribMat
  );
  forwardTunnelCollar.position.set(0, 2.58, -0.05);
  hullGroup.add(forwardTunnelCollar);

  const tunnelHatchRing = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.44, 0.032, 12, 32)),
    couchFrameMat
  );
  tunnelHatchRing.rotation.x = Math.PI / 2;
  tunnelHatchRing.position.set(0, 2.41, -0.05);
  hullGroup.add(tunnelHatchRing);

  // Exterior Docking Probe Nose Cone & Latches protruding above Forward Bulkhead
  const dockProbeCone = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.14, 0.44, 0.42, 24)),
    ribMat
  );
  dockProbeCone.position.set(0, 2.95, -0.05);
  const dockProbeTip = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.04, 0.07, 0.24, 14)),
    couchFrameMat
  );
  dockProbeTip.position.set(0, 3.24, -0.05);
  hullGroup.add(dockProbeCone, dockProbeTip);

  // Three radial Cylindrical Main Parachute Canisters with Kevlar Strap Bands
  for (let p = 0; p < 3; p++) {
    const angle = (p / 3) * Math.PI * 2 + 0.4;
    const px = Math.cos(angle) * 0.78;
    const pz = -0.05 + Math.sin(angle) * 0.78;
    const chutePack = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.13, 0.14, 0.24, 14)),
      betaClothMat
    );
    chutePack.position.set(px, 2.6, pz);
    const chuteStrap = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.138, 0.012, 8, 18)),
      strapMat
    );
    chuteStrap.rotation.x = Math.PI / 2;
    chuteStrap.position.set(px, 2.58, pz);
    hullGroup.add(chutePack, chuteStrap);
  }

  // Overhead warm-white + cyan cockpit floodlight fixtures
  const domeLightMat = track(
    new THREE.MeshBasicMaterial({ color: 0xfef3c7 })
  );
  [-0.56, 0.56].forEach((lx) => {
    const fixtureFrame = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.14, 0.04, 0.52)),
      ribMat
    );
    fixtureFrame.position.set(lx, 2.66, -0.15);
    const diffuser = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.1, 0.025, 0.46)),
      domeLightMat
    );
    diffuser.position.set(lx, 2.64, -0.15);
    hullGroup.add(fixtureFrame, diffuser);
  });

  const deckFloor = new THREE.Mesh(
    track(new THREE.CylinderGeometry(1.93, 1.95, 0.08, 36)),
    floorMat
  );
  deckFloor.position.set(0, 0.22, -0.05);
  deckFloor.receiveShadow = true;
  hullGroup.add(deckFloor);

  // Circumferential structural ribs
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const radius = THREE.MathUtils.lerp(1.86, 1.18, t);
    const rib = new THREE.Mesh(
      track(new THREE.TorusGeometry(radius, 0.03, 10, 48)),
      ribMat
    );
    rib.rotation.x = Math.PI / 2;
    rib.position.set(0, 0.42 + t * 2.1, -0.05);
    hullGroup.add(rib);
  }

  // Instanced longitudinal hull stringers & rivet strips
  const stringerCount = 16;
  const stringers = new THREE.InstancedMesh(
    track(new THREE.BoxGeometry(0.025, 2.48, 0.035)),
    ribMat,
    stringerCount
  );
  for (let i = 0; i < stringerCount; i++) {
    const angle = (i / stringerCount) * Math.PI * 2;
    const r = 1.5;
    _dummy.position.set(Math.cos(angle) * r, 1.48, -0.05 + Math.sin(angle) * r);
    _dummy.rotation.set(0, -angle, 0.29);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    stringers.setMatrixAt(i, _dummy.matrix);
  }
  stringers.instanceMatrix.needsUpdate = true;
  hullGroup.add(stringers);

  // Floor access foot-restraints & cable deck grates
  const grateMesh = new THREE.InstancedMesh(
    track(new THREE.BoxGeometry(0.42, 0.015, 0.04)),
    ribMat,
    12
  );
  for (let i = 0; i < 12; i++) {
    _dummy.position.set(0, 0.265, -0.5 + i * 0.09);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    grateMesh.setMatrixAt(i, _dummy.matrix);
  }
  grateMesh.instanceMatrix.needsUpdate = true;
  hullGroup.add(grateMesh);
  root.add(hullGroup);

  // 2. Three Sculpted Ergonomic Crew Couches (Beveled ExtrudeGeometry Shells + Shock Struts + Controllers)
  const couchesGroup = new THREE.Group();
  const couchXOffsets = [-0.54, 0, 0.54];

  // Beveled S-curved couch shell profile extruded along X width
  const couchSideShape = new THREE.Shape();
  couchSideShape.moveTo(-0.22, -0.02);
  couchSideShape.lineTo(0.14, 0.06);
  couchSideShape.quadraticCurveTo(0.24, 0.14, 0.24, 0.34);
  couchSideShape.lineTo(0.28, 0.62);
  couchSideShape.lineTo(0.21, 0.64);
  couchSideShape.lineTo(0.16, 0.32);
  couchSideShape.quadraticCurveTo(0.14, 0.16, 0.06, 0.12);
  couchSideShape.lineTo(-0.24, 0.04);
  couchSideShape.closePath();

  const sculptedShellGeo = track(
    new THREE.ExtrudeGeometry(couchSideShape, {
      depth: 0.38,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.018,
      bevelSegments: 2,
    })
  );
  sculptedShellGeo.rotateY(-Math.PI / 2);
  sculptedShellGeo.translate(0.19, 0.28, -0.04);

  const strutGeo = track(new THREE.CylinderGeometry(0.016, 0.016, 0.54, 10));
  const headrestGeo = track(new THREE.BoxGeometry(0.24, 0.17, 0.075));
  const bolsterGeo = track(new THREE.BoxGeometry(0.048, 0.15, 0.095));
  const armGeo = track(new THREE.BoxGeometry(0.03, 0.045, 0.34));
  const strapGeo = track(new THREE.BoxGeometry(0.032, 0.42, 0.014));

  couchXOffsets.forEach((cx, idx) => {
    const couch = new THREE.Group();
    couch.name = `Crew Couch ${idx + 1}`;
    couch.position.set(cx, 0.32, 0.1);

    // Tubular aluminum shock-attenuator A-frame struts
    [-0.18, 0.18].forEach((sx) => {
      const strut = new THREE.Mesh(strutGeo, couchFrameMat);
      strut.position.set(sx, 0.2, 0.1);
      strut.rotation.x = 0.26;
      const diagStrut = new THREE.Mesh(strutGeo, couchFrameMat);
      diagStrut.position.set(sx, 0.2, -0.08);
      diagStrut.rotation.x = -0.32;
      couch.add(strut, diagStrut);
    });

    const sculptedShell = new THREE.Mesh(sculptedShellGeo, couchPadMat);
    sculptedShell.castShadow = true;
    couch.add(sculptedShell);

    const headrest = new THREE.Mesh(headrestGeo, couchPadMat);
    headrest.position.set(0, 0.94, 0.24);
    headrest.rotation.x = -0.22;
    couch.add(headrest);

    [-0.135, 0.135].forEach((bx) => {
      const bolster = new THREE.Mesh(bolsterGeo, couchPadMat);
      bolster.position.set(bx, 0.94, 0.2);
      bolster.rotation.x = -0.22;
      couch.add(bolster);
    });

    // 4-point shoulder restraint webbing & rotary quick-release buckle
    [-0.085, 0.085].forEach((rx) => {
      const strap = new THREE.Mesh(strapGeo, strapMat);
      strap.position.set(rx, 0.64, 0.14);
      strap.rotation.x = -0.25;
      couch.add(strap);
    });
    const buckle = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 14)),
      couchFrameMat
    );
    buckle.rotation.x = Math.PI / 2 - 0.25;
    buckle.position.set(0, 0.48, 0.08);
    couch.add(buckle);

    [-0.22, 0.22].forEach((ax) => {
      const arm = new THREE.Mesh(armGeo, couchFrameMat);
      arm.position.set(ax, 0.52, -0.02);
      couch.add(arm);
    });

    // Rotational Hand Controller (RHC) joystick + Translation T-handle (THC)
    if (idx === 0 || idx === 1) {
      const rhcBase = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.058, 0.04, 0.075)),
        strapMat
      );
      rhcBase.position.set(0.22, 0.56, -0.12);
      const rhcGrip = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.013, 0.018, 0.08, 10)),
        couchFrameMat
      );
      rhcGrip.position.set(0.22, 0.61, -0.12);
      rhcGrip.rotation.x = -0.2;
      couch.add(rhcBase, rhcGrip);

      const thcArm = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 8)),
        couchFrameMat
      );
      thcArm.rotation.x = Math.PI / 2;
      thcArm.position.set(-0.22, 0.56, -0.18);
      const thcBar = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.075, 0.02, 0.02)),
        strapMat
      );
      thcBar.position.set(-0.22, 0.56, -0.22);
      couch.add(thcArm, thcBar);
    }

    // Dual corrugated suit O2 umbilical hoses snaking from left ECS side
    const hoseCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.18, 0.26, -0.24),
      new THREE.Vector3(-0.15, 0.39, -0.05),
      new THREE.Vector3(-0.08, 0.48, 0.05),
    ]);
    const suitHose = new THREE.Mesh(
      track(new THREE.TubeGeometry(hoseCurve, 12, 0.014, 8, false)),
      coolantPipeMat
    );
    couch.add(suitHose);

    couchesGroup.add(couch);
  });
  root.add(couchesGroup);

  // 3. Main Display Console (MDC) with Glare-Shield Hood, DSKY, Guard Rails & Switch-Guard U-Brackets
  const consoleGroup = new THREE.Group();
  consoleGroup.position.set(0, 1.32, -0.78);
  const mdcFace = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.56, 0.72, 0.12)),
    consoleNominalMat
  );
  mdcFace.rotation.x = 0.22;
  mdcFace.castShadow = true;
  consoleGroup.add(mdcFace);

  const mdcBacking = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.64, 0.8, 0.08)),
    ribMat
  );
  mdcBacking.position.set(0, 0, -0.06);
  mdcBacking.rotation.x = 0.22;
  consoleGroup.add(mdcBacking);

  // Top glare-shield canopy hood over Main Display Console
  const glareHood = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.66, 0.04, 0.18)),
    strapMat
  );
  glareHood.position.set(0, 0.4, 0.02);
  glareHood.rotation.x = 0.12;
  consoleGroup.add(glareHood);

  // Guard rail bar across console with standoffs
  const guardBar = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.012, 0.012, 1.54, 12)),
    couchFrameMat
  );
  guardBar.rotation.z = Math.PI / 2;
  guardBar.position.set(0, -0.26, 0.14);
  consoleGroup.add(guardBar);

  // Instanced Physical Toggle Switches + U-shaped Switch Guards
  const switchCount = 48;
  const switches = new THREE.InstancedMesh(
    track(new THREE.CylinderGeometry(0.0045, 0.0055, 0.028, 6)),
    couchFrameMat,
    switchCount
  );
  const switchGuards = new THREE.InstancedMesh(
    track(new THREE.BoxGeometry(0.032, 0.03, 0.022)),
    ribMat,
    16
  );
  let sIdx = 0;
  let gIdx = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 16; col++) {
      const sx = -0.64 + col * 0.085;
      const sy = -0.18 + row * 0.16;
      const sz = 0.072 - sy * 0.22;
      _dummy.position.set(sx, sy, sz);
      _dummy.rotation.set(Math.PI / 2 + 0.22 + (col % 3 === 0 ? -0.25 : 0.25), 0, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      switches.setMatrixAt(sIdx++, _dummy.matrix);

      if (row === 1 && col % 2 === 0 && gIdx < 16) {
        _dummy.position.set(sx, sy, sz - 0.004);
        _dummy.rotation.set(0.22, 0, 0);
        _dummy.updateMatrix();
        switchGuards.setMatrixAt(gIdx++, _dummy.matrix);
      }
    }
  }
  switches.instanceMatrix.needsUpdate = true;
  switchGuards.count = gIdx;
  switchGuards.instanceMatrix.needsUpdate = true;
  consoleGroup.add(switches, switchGuards);

  // Instanced Caution & Warning Matrix Lamps
  const cwCount = 12;
  const cwMat = track(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const cwLamps = new THREE.InstancedMesh(
    track(new THREE.BoxGeometry(0.042, 0.022, 0.01)),
    cwMat,
    cwCount
  );
  for (let i = 0; i < cwCount; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const lx = 0.36 + col * 0.052;
    const ly = 0.16 + row * 0.032;
    _dummy.position.set(lx, ly, 0.068 - ly * 0.22);
    _dummy.rotation.set(0.22, 0, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    cwLamps.setMatrixAt(i, _dummy.matrix);
    cwLamps.setColorAt(i, _color.setHex(i < 4 ? 0x22d3ee : 0x334155));
  }
  cwLamps.instanceMatrix.needsUpdate = true;
  if (cwLamps.instanceColor) cwLamps.instanceColor.needsUpdate = true;
  consoleGroup.add(cwLamps);

  // Apollo Guidance Computer DSKY module below main console
  const dskyBox = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.28, 0.24, 0.1)),
    strapMat
  );
  dskyBox.position.set(0, -0.45, 0.16);
  dskyBox.rotation.x = -0.35;
  const dskyDisplay = new THREE.Mesh(
    track(new THREE.PlaneGeometry(0.11, 0.1)),
    track(new THREE.MeshBasicMaterial({ color: 0x10b981 }))
  );
  dskyDisplay.position.set(0.05, 0.04, 0.052);
  dskyBox.add(dskyDisplay);
  consoleGroup.add(dskyBox);

  root.add(consoleGroup);

  // 4. ANCHOR 1: Lower Equipment Bay Wiring, ECU Manifold, Valves & Dual Optical Sextant
  const wiringAnchor = new THREE.Group();
  wiringAnchor.name = 'Lower Equipment Bay Wiring & ECS';
  wiringAnchor.position.set(-0.74, 0.98, -0.45);

  const bayChassis = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.46, 0.56, 0.42)),
    ribMat
  );
  bayChassis.position.set(-0.14, 0, 0);
  wiringAnchor.add(bayChassis);

  // Recessed ECU thermal heat-exchanger fins
  const ecuFins = new THREE.InstancedMesh(
    track(new THREE.BoxGeometry(0.01, 0.34, 0.22)),
    couchFrameMat,
    8
  );
  for (let i = 0; i < 8; i++) {
    _dummy.position.set(0.095, -0.05, -0.12 + i * 0.032);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    ecuFins.setMatrixAt(i, _dummy.matrix);
  }
  ecuFins.instanceMatrix.needsUpdate = true;
  wiringAnchor.add(ecuFins);

  // Vulnerable multi-harness wire bundles (Copper + Silver-sheathed Teflon) & clamping bands
  const wireCurve1 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.06, -0.22, 0.15),
    new THREE.Vector3(0.12, -0.05, 0.08),
    new THREE.Vector3(0.05, 0.1, -0.02),
    new THREE.Vector3(0.09, 0.26, -0.14),
  ]);
  const wireBundle1 = new THREE.Mesh(
    track(new THREE.TubeGeometry(wireCurve1, 24, 0.022, 8, false)),
    copperWireMat
  );
  const wireCurve2 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.02, -0.22, -0.1),
    new THREE.Vector3(0.1, 0.0, 0.04),
    new THREE.Vector3(0.02, 0.22, 0.12),
  ]);
  const wireBundle2 = new THREE.Mesh(
    track(new THREE.TubeGeometry(wireCurve2, 20, 0.016, 8, false)),
    silverWireMat
  );
  const wireCurve3 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.11, -0.2, 0.0),
    new THREE.Vector3(0.14, 0.02, -0.08),
    new THREE.Vector3(0.08, 0.2, 0.04),
  ]);
  const wireBundle3 = new THREE.Mesh(
    track(new THREE.TubeGeometry(wireCurve3, 18, 0.013, 8, false)),
    copperWireMat
  );
  wiringAnchor.add(wireBundle1, wireBundle2, wireBundle3);

  // Aluminum clamp ring around central wire junction
  const clampCollar = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.036, 0.008, 8, 16)),
    couchFrameMat
  );
  clampCollar.position.set(0.09, 0.02, 0.04);
  wiringAnchor.add(clampCollar);

  // ECS Coolant Pipes & Red Shutoff Valve Handwheel + Pressure Gauge
  const coolantCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.02, -0.24, 0.16),
    new THREE.Vector3(-0.02, 0.02, 0.16),
    new THREE.Vector3(0.04, 0.24, 0.05),
  ]);
  const coolantPipe = new THREE.Mesh(
    track(new THREE.TubeGeometry(coolantCurve, 20, 0.02, 10, false)),
    coolantPipeMat
  );
  wiringAnchor.add(coolantPipe);

  const valveWheel = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.045, 0.01, 8, 16)),
    valveRedMat
  );
  valveWheel.rotation.y = Math.PI / 2;
  valveWheel.position.set(0.11, -0.14, 0.16);
  wiringAnchor.add(valveWheel);

  // Optical Navigation Sextant + Scanning Telescope dual eyepieces
  const sextantTube = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.045, 0.055, 0.22, 16)),
    strapMat
  );
  sextantTube.rotation.z = -0.6;
  sextantTube.position.set(0.24, -0.18, 0.06);
  const sextantCup = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.052, 0.045, 0.04, 16)),
    hatchSealMat
  );
  sextantCup.rotation.z = -0.6;
  sextantCup.position.set(0.31, -0.12, 0.06);
  wiringAnchor.add(sextantTube, sextantCup);

  // Armor shield (shown in Block II upgrade comparison)
  const armorTray = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.12, 0.52, 0.34)),
    couchFrameMat
  );
  armorTray.position.set(0.09, 0, 0.02);
  armorTray.visible = false;
  wiringAnchor.add(armorTray);

  // Electrical spark / arc indicator mesh
  const sparkMat = track(
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
    })
  );
  const sparkCore = new THREE.Mesh(
    track(new THREE.IcosahedronGeometry(0.06, 1)),
    sparkMat
  );
  sparkCore.position.set(0.08, 0.04, 0.05);
  wiringAnchor.add(sparkCore);

  root.add(wiringAnchor);

  // 5. ANCHOR 2: 100% Oxygen Cabin Atmosphere Visualization Volume
  const atmosphereAnchor = new THREE.Group();
  atmosphereAnchor.name = '100% Oxygen Cabin Atmosphere';
  atmosphereAnchor.position.set(0, 1.55, -0.35);

  const moleculeCount = 48;
  const moleculeGeo = track(new THREE.SphereGeometry(0.018, 10, 10));
  const moleculeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.78,
    })
  );
  const molecules = new THREE.InstancedMesh(moleculeGeo, moleculeMat, moleculeCount);
  molecules.frustumCulled = false;
  const moleculeOffsets: THREE.Vector3[] = [];
  for (let i = 0; i < moleculeCount; i++) {
    const pos = new THREE.Vector3(
      (Math.random() - 0.5) * 1.4,
      (Math.random() - 0.5) * 0.85,
      (Math.random() - 0.5) * 0.9
    );
    moleculeOffsets.push(pos);
    _dummy.position.copy(pos);
    _dummy.updateMatrix();
    molecules.setMatrixAt(i, _dummy.matrix);
    molecules.setColorAt(i, _color.setHex(0x38bdf8));
  }
  molecules.instanceMatrix.needsUpdate = true;
  if (molecules.instanceColor) molecules.instanceColor.needsUpdate = true;
  atmosphereAnchor.add(molecules);
  root.add(atmosphereAnchor);

  // 6. ANCHOR 3: Overhead Inward-Opening Hatch Assembly (with Block II Outward Demo & Latch Dogs)
  const hatchAnchor = new THREE.Group();
  hatchAnchor.name = 'Crew Access Hatch Assembly';
  hatchAnchor.position.set(0, 1.98, 0.25);

  const hatchFrame = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.76, 0.08, 0.68)),
    ribMat
  );
  hatchAnchor.add(hatchFrame);

  // Instanced peripheral hatch locking dogs around frame
  const dogCount = 12;
  const hatchDogs = new THREE.InstancedMesh(
    track(new THREE.BoxGeometry(0.035, 0.025, 0.035)),
    hatchSealMat,
    dogCount
  );
  for (let i = 0; i < dogCount; i++) {
    const side = Math.floor(i / 3);
    const step = (i % 3) - 1;
    let dx = 0;
    let dz = 0;
    if (side === 0) {
      dx = step * 0.22;
      dz = 0.3;
    } else if (side === 1) {
      dx = step * 0.22;
      dz = -0.3;
    } else if (side === 2) {
      dx = -0.33;
      dz = step * 0.18;
    } else {
      dx = 0.33;
      dz = step * 0.18;
    }
    _dummy.position.set(dx, -0.042, dz);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    hatchDogs.setMatrixAt(i, _dummy.matrix);
  }
  hatchDogs.instanceMatrix.needsUpdate = true;
  hatchAnchor.add(hatchDogs);

  const hatchPivot = new THREE.Group();
  hatchPivot.position.set(-0.34, -0.02, 0);
  const hatchDoor = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.66, 0.055, 0.58)),
    hatchMat
  );
  hatchDoor.position.set(0.34, 0, 0);
  hatchPivot.add(hatchDoor);

  const hatchGlass = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.09, 0.09, 0.065, 16)),
    glassMat
  );
  hatchGlass.position.set(0.34, 0, 0);
  hatchPivot.add(hatchGlass);

  const latchHandle = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.06, 0.012, 8, 20)),
    hatchSealMat
  );
  latchHandle.rotation.x = Math.PI / 2;
  latchHandle.position.set(0.54, -0.04, 0);
  hatchPivot.add(latchHandle);
  hatchAnchor.add(hatchPivot);

  const pressureArrowGroup = new THREE.Group();
  const arrowShaftGeo = track(new THREE.CylinderGeometry(0.01, 0.01, 0.18, 8));
  const arrowHeadGeo = track(new THREE.ConeGeometry(0.028, 0.06, 10));
  const arrowMat = track(
    new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.9 })
  );
  [-0.16, 0, 0.16].forEach((ax) => {
    const arrow = new THREE.Group();
    const shaft = new THREE.Mesh(arrowShaftGeo, arrowMat);
    const head = new THREE.Mesh(arrowHeadGeo, arrowMat);
    head.position.y = 0.11;
    arrow.add(shaft, head);
    arrow.position.set(ax, -0.22, 0);
    pressureArrowGroup.add(arrow);
  });
  pressureArrowGroup.visible = false;
  hatchAnchor.add(pressureArrowGroup);
  root.add(hatchAnchor);

  // 7. ANCHOR 4: Flammable Cabin Materials (Nylon Netting, Stowage Lockers & Velcro Strips)
  const materialsAnchor = new THREE.Group();
  materialsAnchor.name = 'Cabin Wall Liner & Netting';
  materialsAnchor.position.set(0.68, 1.32, -0.3);

  const wallPanel = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.06, 0.72, 0.84)),
    nylonMat
  );
  materialsAnchor.add(wallPanel);

  for (let d = 0; d < 3; d++) {
    const locker = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.14, 0.18, 0.24)),
      ribMat
    );
    locker.position.set(0.08, -0.22 + d * 0.22, -0.22);
    materialsAnchor.add(locker);
  }

  const velcroStrip = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.02, 0.58, 0.08)),
    strapMat
  );
  velcroStrip.position.set(-0.035, 0, 0.26);
  materialsAnchor.add(velcroStrip);

  const netGrid = new THREE.Mesh(
    track(new THREE.PlaneGeometry(0.76, 0.62, 12, 10)),
    track(
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        wireframe: true,
        transparent: true,
        opacity: 0.65,
      })
    )
  );
  netGrid.rotation.y = -Math.PI / 2;
  netGrid.position.set(-0.04, 0, 0);
  materialsAnchor.add(netGrid);
  root.add(materialsAnchor);

  // 8. Volumetric Multi-Layer Fire Plume + Smoke Wisps (replaces flat cone)
  const fireGroup = new THREE.Group();
  fireGroup.position.set(-0.46, 0.98, -0.42);
  const fireOuterMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xff5a1f,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const fireMidMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const fireCoreMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xfff7ed,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const firePlume = new THREE.Mesh(
    track(new THREE.ConeGeometry(0.42, 1.05, 18, 1, true)),
    fireOuterMat
  );
  firePlume.position.y = 0.42;
  const fireMid = new THREE.Mesh(
    track(new THREE.ConeGeometry(0.24, 0.72, 16, 1, true)),
    fireMidMat
  );
  fireMid.position.y = 0.32;
  const fireCore = new THREE.Mesh(
    track(new THREE.ConeGeometry(0.11, 0.42, 12)),
    fireCoreMat
  );
  fireCore.position.y = 0.18;
  fireGroup.add(firePlume, fireMid, fireCore);
  root.add(fireGroup);

  // Rising combustion smoke & soot particles (InstancedMesh)
  const smokeCount = 24;
  const smokeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  const smokeMesh = new THREE.InstancedMesh(
    track(new THREE.DodecahedronGeometry(0.12, 1)),
    smokeMat,
    smokeCount
  );
  smokeMesh.frustumCulled = false;
  root.add(smokeMesh);

  // 9. Exterior Launch Complex 34 Steel Truss Tower, Service Platform & Umbilical Swing Arm
  const padGroup = new THREE.Group();
  padGroup.position.set(0, 1.2, -2.9);

  // Four corner structural gantry legs instead of a single slab
  [
    [-1.6, -1.4],
    [-1.15, -1.4],
    [-1.6, -0.95],
    [-1.15, -0.95],
  ].forEach(([gx, gz]) => {
    const leg = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.08, 5.6, 0.08)),
      gantrySteelMat
    );
    leg.position.set(gx, 0.6, gz);
    padGroup.add(leg);
  });

  // Cross-bracing lattice bars on Launch Complex 34 tower
  for (let b = -2; b <= 2; b++) {
    const brace = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.62, 0.05, 0.05)),
      gantrySteelMat
    );
    brace.position.set(-1.375, 0.6 + b * 0.85, -0.95);
    brace.rotation.z = b % 2 === 0 ? 0.52 : -0.52;
    padGroup.add(brace);
  }

  const swingArm = new THREE.Mesh(
    track(new THREE.BoxGeometry(2.3, 0.22, 0.3)),
    gantrySteelMat
  );
  swingArm.position.set(-0.2, 1.4, -0.78);
  padGroup.add(swingArm);

  // White Room Service Platform Pod on Swing Arm tip
  const whiteRoomPod = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.54, 0.62, 0.56)),
    betaClothMat
  );
  whiteRoomPod.position.set(0.84, 1.4, -0.78);
  padGroup.add(whiteRoomPod);

  // Recessed Forward Observation Viewports showing twilight LC-34 Service Tower + Floodlights
  const padVistaMat = track(
    new THREE.MeshBasicMaterial({
      map: textures.padExterior,
    })
  );
  [-0.56, 0.56].forEach((wx) => {
    const winGroup = new THREE.Group();
    winGroup.position.set(wx, 1.84, -0.96);
    winGroup.rotation.x = 0.28;
    winGroup.rotation.y = wx < 0 ? 0.34 : -0.34;

    const bezel = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.36, 0.28, 0.045)),
      ribMat
    );
    const vista = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.3, 0.22)),
      padVistaMat
    );
    vista.position.z = 0.024;
    const windowGlass = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.3, 0.22)),
      glassMat
    );
    windowGlass.position.z = 0.027;
    winGroup.add(bezel, vista, windowGlass);
    hullGroup.add(winGroup);
  });

  // Port & Starboard Circuit Breaker Panels + Caution Placards
  const breakerMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.breakerPanel,
      roughness: 0.45,
      metalness: 0.35,
      emissive: new THREE.Color(0x0f172a),
      emissiveIntensity: 0.28,
    })
  );
  [
    { x: -1.16, z: 0.1, rotY: Math.PI / 2 - 0.12 },
    { x: 1.16, z: 0.1, rotY: -Math.PI / 2 + 0.12 },
  ].forEach((cfg) => {
    const panel = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.56, 0.48, 0.04)),
      breakerMat
    );
    panel.position.set(cfg.x, 1.44, cfg.z);
    panel.rotation.y = cfg.rotY;
    hullGroup.add(panel);
  });

  // Aft Bulkhead Crew Stowage Bags & LiOH Scrubber Cartridge Rack behind couches
  for (let b = -1; b <= 1; b++) {
    const bag = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.34, 0.3, 0.14)),
      betaClothMat
    );
    bag.position.set(b * 0.48, 1.38, 1.16);
    hullGroup.add(bag);
  }

  root.add(padGroup);

  // Contact shadow disc under CM floor
  const shadowPlane = new THREE.Mesh(
    track(new THREE.PlaneGeometry(4.6, 4.6)),
    track(
      new THREE.MeshBasicMaterial({
        map: textures.contactShadow,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      })
    )
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(0, 0.12, -0.05);
  root.add(shadowPlane);

  // Freeze static matrices for optimal stereo VR performance
  [hullGroup, couchesGroup, consoleGroup, padGroup].forEach((grp) => {
    grp.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.matrixAutoUpdate = false;
        obj.updateMatrix();
      }
    });
  });

  const componentAnchors = new Map<string, THREE.Object3D>([
    ['a1-wiring', wiringAnchor],
    ['a1-atmosphere', atmosphereAnchor],
    ['a1-hatch', hatchAnchor],
    ['a1-materials', materialsAnchor],
  ]);

  let currentState: InvestigationVisualState = 'nominal';
  let lastCwAlert: boolean | null = null;

  const updateVisualState = (
    state: InvestigationVisualState,
    elapsed: number,
    _delta: number,
    showUpgradeComparison: boolean
  ) => {
    currentState = state;
    const isUpgraded = state === 'upgraded' || showUpgradeComparison;
    const isAlert =
      state === 'ignition' ||
      state === 'escalation' ||
      state === 'response' ||
      state === 'outcome';

    mdcFace.material = isAlert && !isUpgraded ? consoleAlertMat : consoleNominalMat;

    if (lastCwAlert !== (isAlert && !isUpgraded)) {
      lastCwAlert = isAlert && !isUpgraded;
      for (let i = 0; i < cwCount; i++) {
        cwLamps.setColorAt(
          i,
          _color.setHex(
            lastCwAlert ? (i % 2 === 0 ? 0xf59e0b : 0xef4444) : i < 4 ? 0x22d3ee : 0x334155
          )
        );
      }
      if (cwLamps.instanceColor) cwLamps.instanceColor.needsUpdate = true;
    }

    wallPanel.material = isUpgraded ? betaClothMat : nylonMat;
    netGrid.visible = !isUpgraded;
    velcroStrip.visible = !isUpgraded;
    armorTray.visible = isUpgraded;

    if (isUpgraded) {
      hatchPivot.rotation.z = THREE.MathUtils.lerp(hatchPivot.rotation.z, 0.65, 0.08);
      pressureArrowGroup.visible = false;
    } else if (state === 'escalation' || state === 'response') {
      hatchPivot.rotation.z = Math.sin(elapsed * 18) * 0.015;
      pressureArrowGroup.visible = true;
      pressureArrowGroup.position.y = Math.sin(elapsed * 5) * 0.02;
    } else {
      hatchPivot.rotation.z = THREE.MathUtils.lerp(hatchPivot.rotation.z, 0, 0.1);
      pressureArrowGroup.visible = false;
    }

    if (state === 'ignition' && !isUpgraded) {
      const flicker = Math.abs(Math.sin(elapsed * 26)) * 0.9 + 0.1;
      sparkMat.opacity = flicker;
      sparkCore.scale.setScalar(0.8 + flicker * 0.7);
    } else {
      sparkMat.opacity = 0;
    }

    // Layered multi-shell fire plume + rising smoke
    const wob = 1 + Math.sin(elapsed * 15) * 0.12;
    if (state === 'ignition' && !isUpgraded) {
      fireOuterMat.opacity = 0.45;
      fireMidMat.opacity = 0.65;
      fireCoreMat.opacity = 0.85;
      fireGroup.scale.set(0.55, 0.6 * wob, 0.55);
    } else if (state === 'escalation' && !isUpgraded) {
      fireOuterMat.opacity = 0.68 + Math.sin(elapsed * 14) * 0.14;
      fireMidMat.opacity = 0.82;
      fireCoreMat.opacity = 0.95;
      fireGroup.scale.set(1.22, 1.32 * wob, 1.22);
    } else if (state === 'response' && !isUpgraded) {
      fireOuterMat.opacity = 0.34;
      fireMidMat.opacity = 0.42;
      fireCoreMat.opacity = 0.5;
      fireGroup.scale.set(0.95, 0.85, 0.95);
    } else {
      fireOuterMat.opacity = 0;
      fireMidMat.opacity = 0;
      fireCoreMat.opacity = 0;
    }

    const showSmoke = !isUpgraded && (state === 'escalation' || state === 'response' || state === 'outcome');
    smokeMesh.visible = showSmoke;
    if (showSmoke) {
      smokeMat.opacity = state === 'escalation' ? 0.34 : state === 'response' ? 0.42 : 0.22;
      for (let i = 0; i < smokeCount; i++) {
        const t = (elapsed * 0.42 + i / smokeCount) % 1;
        _dummy.position.set(
          -0.46 + Math.sin(elapsed * 1.4 + i) * (0.12 + t * 0.35),
          1.28 + t * 1.32,
          -0.42 + Math.cos(elapsed * 1.1 + i * 1.7) * (0.12 + t * 0.35)
        );
        _dummy.rotation.set(elapsed + i, elapsed * 0.7, i);
        _dummy.scale.setScalar(0.6 + t * 1.45);
        _dummy.updateMatrix();
        smokeMesh.setMatrixAt(i, _dummy.matrix);
      }
      smokeMesh.instanceMatrix.needsUpdate = true;
    }

    for (let i = 0; i < moleculeCount; i++) {
      const base = moleculeOffsets[i];
      const speed =
        currentState === 'escalation' || currentState === 'ignition'
          ? 2.8
          : currentState === 'precondition'
            ? 1.35
            : 0.7;

      _dummy.position.set(
        base.x + Math.sin(elapsed * speed + i) * 0.06,
        base.y + Math.cos(elapsed * speed * 1.1 + i * 0.7) * 0.05,
        base.z + Math.sin(elapsed * speed * 0.9 + i * 1.3) * 0.06
      );
      _dummy.scale.setScalar(currentState === 'escalation' ? 1.25 : 1.0);
      _dummy.updateMatrix();
      molecules.setMatrixAt(i, _dummy.matrix);

      if (isUpgraded) {
        _color.setHex(i % 5 < 3 ? 0x38bdf8 : 0x34d399);
      } else if (currentState === 'ignition' || currentState === 'escalation') {
        _color.setHex(0xf97316);
      } else if (currentState === 'precondition') {
        _color.setHex(0x60a5fa);
      } else {
        _color.setHex(0x38bdf8);
      }
      molecules.setColorAt(i, _color);
    }
    molecules.instanceMatrix.needsUpdate = true;
    if (molecules.instanceColor) molecules.instanceColor.needsUpdate = true;
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
