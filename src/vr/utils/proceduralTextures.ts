import * as THREE from 'three';

export interface ProceduralTextureSet {
  apolloConsole: THREE.CanvasTexture;
  apolloConsoleAlert: THREE.CanvasTexture;
  apolloConsoleCold: THREE.CanvasTexture;
  brushedMetalBump: THREE.CanvasTexture;
  quiltedBlanketColor: THREE.CanvasTexture;
  quiltedBlanketBump: THREE.CanvasTexture;
  mirPanelColor: THREE.CanvasTexture;
  earthHorizon: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  breakerPanel: THREE.CanvasTexture;
  padExterior: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(width: number, height: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create 2D canvas context for procedural texture.');
  }
  return { canvas, ctx };
}

function createApolloConsoleTexture(
  mode: 'nominal' | 'alert' | 'cold',
  anisotropy: number
): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(1024, 512);

  // Base anodized gray-slate panel
  ctx.fillStyle = mode === 'cold' ? '#1c232d' : '#2a3038';
  ctx.fillRect(0, 0, 1024, 512);

  // Subtle brushed texture lines
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let y = 0; y < 512; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Panel dividing seams & screws
  ctx.strokeStyle = '#14181e';
  ctx.lineWidth = 3;
  const cols = [0, 320, 680, 1024];
  for (let i = 0; i < cols.length - 1; i++) {
    ctx.strokeRect(cols[i] + 6, 6, cols[i + 1] - cols[i] - 12, 500);
  }

  // FDAI "8-ball" Attitude Indicator (left bay)
  const fdaiX = 160;
  const fdaiY = 148;
  ctx.fillStyle = '#0d1117';
  ctx.beginPath();
  ctx.arc(fdaiX, fdaiY, 72, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Horizon split inside FDAI
  ctx.save();
  ctx.beginPath();
  ctx.arc(fdaiX, fdaiY, 64, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = mode === 'cold' ? '#2c3e50' : '#d6d3cb';
  ctx.fillRect(fdaiX - 70, fdaiY - 70, 140, 70);
  ctx.fillStyle = '#111827';
  ctx.fillRect(fdaiX - 70, fdaiY, 140, 70);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  for (let deg = -40; deg <= 40; deg += 20) {
    ctx.beginPath();
    ctx.moveTo(fdaiX - 24, fdaiY + deg);
    ctx.lineTo(fdaiX + 24, fdaiY + deg);
    ctx.stroke();
  }
  ctx.restore();

  // Crosshair reticle over FDAI
  ctx.strokeStyle = '#fb923c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(fdaiX - 55, fdaiY);
  ctx.lineTo(fdaiX + 55, fdaiY);
  ctx.moveTo(fdaiX, fdaiY - 55);
  ctx.lineTo(fdaiX, fdaiY + 55);
  ctx.stroke();

  // Analog vertical meters & dials (Cryo O2 / EPS / Cabin Pressure)
  const drawGauge = (x: number, y: number, w: number, h: number, label: string, level: number, danger: boolean) => {
    ctx.fillStyle = '#0c1015';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Tick marks
    ctx.fillStyle = '#94a3b8';
    for (let t = 0; t <= 10; t++) {
      const ty = y + h - 14 - (t / 10) * (h - 28);
      ctx.fillRect(x + 6, ty, t % 5 === 0 ? 14 : 8, 2);
    }

    // Needle / bar
    const needleY = y + h - 14 - level * (h - 28);
    ctx.fillStyle = danger ? '#ef4444' : '#38bdf8';
    ctx.fillRect(x + 22, needleY - 3, w - 30, 6);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h + 18);
  };

  drawGauge(352, 46, 56, 150, 'O2 P', mode === 'alert' ? 0.14 : 0.78, mode === 'alert');
  drawGauge(424, 46, 56, 150, 'BUS A', mode === 'cold' ? 0.04 : 0.85, mode === 'cold');
  drawGauge(496, 46, 56, 150, 'BUS B', mode === 'alert' || mode === 'cold' ? 0.08 : 0.84, mode !== 'nominal');
  drawGauge(568, 46, 56, 150, 'CAB P', mode === 'alert' ? 0.96 : 0.65, mode === 'alert');

  // Caution & Warning Matrix (right bay)
  const cwLabels = [
    ['MASTER ALARM', mode === 'alert'],
    ['O2 FLOW', mode === 'alert'],
    ['MAIN BUS A', mode === 'cold'],
    ['MAIN BUS B', mode !== 'nominal'],
    ['FC 1', mode === 'alert'],
    ['FC 2', mode === 'cold'],
    ['FC 3', mode === 'alert'],
    ['CRYO PRESS', mode === 'alert'],
    ['CABIN TEMP', mode === 'alert'],
    ['CO2 PARTIAL', mode === 'alert'],
    ['ECS GLYCOL', mode === 'alert'],
    ['SUIT COMP', false],
  ] as const;

  for (let i = 0; i < cwLabels.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const bx = 706 + col * 98;
    const by = 40 + row * 48;
    const [lbl, lit] = cwLabels[i];

    ctx.fillStyle = lit
      ? lbl === 'MASTER ALARM'
        ? '#dc2626'
        : '#d97706'
      : mode === 'cold'
        ? '#11161d'
        : '#1e2530';
    ctx.fillRect(bx, by, 88, 38);
    ctx.strokeStyle = lit ? '#fbbf24' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, 88, 38);

    ctx.fillStyle = lit ? '#ffffff' : '#64748b';
    ctx.font = 'bold 10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(lbl, bx + 44, by + 23);
  }

  // DSKY Display & Keypad (center lower)
  ctx.fillStyle = '#090d12';
  ctx.fillRect(352, 245, 290, 225);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.strokeRect(352, 245, 290, 225);

  ctx.fillStyle = mode === 'cold' ? '#132419' : '#0b2214';
  ctx.fillRect(370, 265, 130, 185);
  ctx.fillStyle = mode === 'cold' ? '#334155' : '#4ade80';
  ctx.font = 'bold 22px "IBM Plex Mono", monospace';
  ctx.textAlign = 'right';
  const prog = mode === 'cold' ? '00' : '01';
  const verb = mode === 'alert' ? '16' : '06';
  const noun = mode === 'alert' ? '68' : '20';
  ctx.fillText(`PROG ${prog}`, 488, 298);
  ctx.fillText(`VERB ${verb}`, 488, 336);
  ctx.fillText(`NOUN ${noun}`, 488, 374);
  ctx.fillText(mode === 'cold' ? '-----' : '+00482', 488, 418);

  // DSKY Keypad grid
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      ctx.fillStyle = '#334155';
      ctx.fillRect(516 + c * 36, 265 + r * 44, 30, 36);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.strokeRect(516 + c * 36, 265 + r * 44, 30, 36);
    }
  }

  // Toggle switch rows (lower left & right)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 10; col++) {
      const sx = 38 + col * 26;
      const sy = 278 + row * 68;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(sx, sy, 12, 34);
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(sx + 6, sy + (col % 2 === 0 ? 10 : 24), 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 10; col++) {
      const sx = 716 + col * 27;
      const sy = 266 + row * 72;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(sx, sy, 12, 34);
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(sx + 6, sy + (row % 2 === 0 ? 12 : 22), 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

function createBrushedMetalBump(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(512, 512);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle brushed metal streaks
  for (let y = 0; y < 512; y += 2) {
    const shade = 115 + Math.floor(Math.random() * 26);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(0, y, 512, 1);
  }

  // Panel seams & rivets
  ctx.strokeStyle = '#383838';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 240, 240);
  ctx.strokeRect(264, 8, 240, 240);
  ctx.strokeRect(8, 264, 240, 240);
  ctx.strokeRect(264, 264, 240, 240);

  ctx.fillStyle = '#d4d4d4';
  const drawRivets = (rx: number, ry: number, rw: number, rh: number) => {
    for (let x = rx + 16; x < rx + rw - 8; x += 28) {
      ctx.beginPath();
      ctx.arc(x, ry + 10, 2.5, 0, Math.PI * 2);
      ctx.arc(x, ry + rh - 10, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  drawRivets(8, 8, 240, 240);
  drawRivets(264, 8, 240, 240);
  drawRivets(8, 264, 240, 240);
  drawRivets(264, 264, 240, 240);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function createQuiltedBlanket(anisotropy: number): {
  color: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
} {
  const cColor = makeCanvas(512, 512);
  const cBump = makeCanvas(512, 512);

  cColor.ctx.fillStyle = '#d6d0c4';
  cColor.ctx.fillRect(0, 0, 512, 512);

  cBump.ctx.fillStyle = '#9a9a9a';
  cBump.ctx.fillRect(0, 0, 512, 512);

  // Diamond quilting
  const step = 64;
  cColor.ctx.strokeStyle = 'rgba(70, 64, 54, 0.35)';
  cColor.ctx.lineWidth = 2;
  cBump.ctx.strokeStyle = '#303030';
  cBump.ctx.lineWidth = 4;

  for (let i = -512; i <= 1024; i += step) {
    cColor.ctx.beginPath();
    cColor.ctx.moveTo(i, 0);
    cColor.ctx.lineTo(i + 512, 512);
    cColor.ctx.moveTo(i, 512);
    cColor.ctx.lineTo(i + 512, 0);
    cColor.ctx.stroke();

    cBump.ctx.beginPath();
    cBump.ctx.moveTo(i, 0);
    cBump.ctx.lineTo(i + 512, 512);
    cBump.ctx.moveTo(i, 512);
    cBump.ctx.lineTo(i + 512, 0);
    cBump.ctx.stroke();
  }

  const color = new THREE.CanvasTexture(cColor.canvas);
  color.colorSpace = THREE.SRGBColorSpace;
  color.wrapS = THREE.RepeatWrapping;
  color.wrapT = THREE.RepeatWrapping;
  color.repeat.set(2, 2);
  color.anisotropy = anisotropy;

  const bump = new THREE.CanvasTexture(cBump.canvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(2, 2);

  return { color, bump };
}

function createMirPanelTexture(anisotropy: number): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(512, 512);
  // Characteristic Mir padded beige-olive / sage liner panels
  ctx.fillStyle = '#9aa18c';
  ctx.fillRect(0, 0, 512, 512);

  // Segmented soft-pad quilting
  ctx.strokeStyle = '#5c6352';
  ctx.lineWidth = 4;
  for (let y = 0; y < 512; y += 128) {
    for (let x = 0; x < 512; x += 128) {
      ctx.strokeRect(x + 6, y + 6, 116, 116);
      // Fastener snaps
      ctx.fillStyle = '#3f4539';
      ctx.beginPath();
      ctx.arc(x + 18, y + 18, 4, 0, Math.PI * 2);
      ctx.arc(x + 110, y + 18, 4, 0, Math.PI * 2);
      ctx.arc(x + 18, y + 110, 4, 0, Math.PI * 2);
      ctx.arc(x + 110, y + 110, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Subtle stencil markings
  ctx.fillStyle = 'rgba(30, 38, 30, 0.55)';
  ctx.font = 'bold 16px "IBM Plex Mono", monospace';
  ctx.fillText('KVANT-1 // 37KE', 24, 48);
  ctx.fillText('O2 / VIKA SECTOR', 274, 304);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = anisotropy;
  return tex;
}

function createEarthHorizonTexture(anisotropy: number): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(1024, 512);
  ctx.fillStyle = '#03060c';
  ctx.fillRect(0, 0, 1024, 512);

  // Stars
  for (let i = 0; i < 350; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 320;
    const r = Math.random() * 1.4 + 0.3;
    ctx.fillStyle = `rgba(226, 240, 255, ${0.35 + Math.random() * 0.65})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Curved Earth limb
  const earthGrad = ctx.createRadialGradient(512, 1320, 820, 512, 1320, 1120);
  earthGrad.addColorStop(0, '#0f3d7a');
  earthGrad.addColorStop(0.55, '#1d6ec2');
  earthGrad.addColorStop(0.82, '#60a5fa');
  earthGrad.addColorStop(0.92, '#bae6fd');
  earthGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');

  ctx.fillStyle = earthGrad;
  ctx.beginPath();
  ctx.arc(512, 1320, 1120, Math.PI, Math.PI * 2);
  ctx.fill();

  // Procedural cloud swirls on limb
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  for (let i = 0; i < 24; i++) {
    const cx = 140 + i * 32;
    const cy = 270 + Math.sin(i * 0.7) * 35 + Math.pow((cx - 512) / 480, 2) * 120;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 48, 12, 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(256, 256);
  const grad = ctx.createRadialGradient(128, 128, 8, 128, 128, 124);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBreakerPanelTexture(anisotropy: number): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(512, 512);
  ctx.fillStyle = '#252c36';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 492, 492);

  // Header placard
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(24, 24, 464, 40);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 18px "IBM Plex Mono", monospace';
  ctx.fillText('EPS / ECS CIRCUIT BREAKER PANEL 225', 38, 50);

  // Rows of circuit breakers + labels
  for (let row = 0; row < 5; row++) {
    const ry = 88 + row * 80;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(24, ry, 464, 62);
    for (let col = 0; col < 8; col++) {
      const cx = 56 + col * 58;
      const cy = ry + 31;
      const tripped = row === 2 && col === 3;
      ctx.fillStyle = tripped ? '#f59e0b' : '#0f172a';
      ctx.beginPath();
      ctx.arc(cx, cy, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = tripped ? '#fbbf24' : '#94a3b8';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = tripped ? '#fef08a' : '#cbd5e1';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

function createPadExteriorTexture(anisotropy: number): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(512, 512);
  // Dusk Florida sky gradient above Launch Complex 34
  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#09152b');
  sky.addColorStop(0.55, '#13315c');
  sky.addColorStop(0.82, '#1e4e79');
  sky.addColorStop(1, '#0f172a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle stars in upper twilight sky
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(226, 240, 255, ${0.3 + Math.random() * 0.6})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 240, 2, 2);
  }

  // Red LC-34 Service Tower silhouette + lattice
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 5;
  ctx.strokeRect(70, 90, 86, 390);
  for (let y = 90; y < 460; y += 44) {
    ctx.beginPath();
    ctx.moveTo(70, y);
    ctx.lineTo(156, y + 44);
    ctx.moveTo(156, y);
    ctx.lineTo(70, y + 44);
    ctx.stroke();
  }

  // Floodlight beams on pad
  const beam = ctx.createRadialGradient(140, 140, 10, 240, 260, 220);
  beam.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
  beam.addColorStop(0.5, 'rgba(186, 230, 253, 0.16)');
  beam.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = beam;
  ctx.fillRect(0, 0, 512, 512);

  // Horizon floodlights
  ctx.fillStyle = '#fde68a';
  for (let x = 40; x < 480; x += 72) {
    ctx.beginPath();
    ctx.arc(x, 455, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const apolloConsole = createApolloConsoleTexture('nominal', maxAnisotropy);
  const apolloConsoleAlert = createApolloConsoleTexture('alert', maxAnisotropy);
  const apolloConsoleCold = createApolloConsoleTexture('cold', maxAnisotropy);
  const brushedMetalBump = createBrushedMetalBump();
  const quilted = createQuiltedBlanket(maxAnisotropy);
  const mirPanelColor = createMirPanelTexture(maxAnisotropy);
  const earthHorizon = createEarthHorizonTexture(maxAnisotropy);
  const contactShadow = createContactShadowTexture();
  const breakerPanel = createBreakerPanelTexture(maxAnisotropy);
  const padExterior = createPadExteriorTexture(maxAnisotropy);

  return {
    apolloConsole,
    apolloConsoleAlert,
    apolloConsoleCold,
    brushedMetalBump,
    quiltedBlanketColor: quilted.color,
    quiltedBlanketBump: quilted.bump,
    mirPanelColor,
    earthHorizon,
    contactShadow,
    breakerPanel,
    padExterior,
    dispose: () => {
      apolloConsole.dispose();
      apolloConsoleAlert.dispose();
      apolloConsoleCold.dispose();
      brushedMetalBump.dispose();
      quilted.color.dispose();
      quilted.bump.dispose();
      mirPanelColor.dispose();
      earthHorizon.dispose();
      contactShadow.dispose();
      breakerPanel.dispose();
      padExterior.dispose();
    },
  };
}
