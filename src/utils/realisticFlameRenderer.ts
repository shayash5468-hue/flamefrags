/**
 * Physically-grounded, optically-additive combustion renderer for 0G microgravity,
 * partial-gravity (Moon/Mars), and 1G terrestrial buoyant flames.
 * Uses multi-layer radial/spectral light emission (`lighter` blending),
 * Helmholtz shear wave turbulence, stoichiometric blue base/shell fronts,
 * thermophoretic soot rings, and quench smoke/mist plumes.
 */

export interface RealisticFlameParams {
  gravityG: number;
  flowVelocity: number; // m/s (0..0.50)
  oxygenPct: number; // % (12..35)
  pressureKpa?: number; // kPa (50..105)
  shape: string; // 'spherical' | 'teardrop' | 'cool-envelope' | 'quenched'
  intensity: number; // 0..1
  fuelName?: string;
  sootFactor?: number; // ~0.4 (methane) .. 1.3 (paraffin/pmma)
  extinctionReason?: string;
  isHybrid?: boolean;
  quenchAgent?: 'none' | 'water_mist' | 'co2';
  timeMs: number;
}

interface SmokeWisp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  life: number;
  phase: number;
}

interface MistParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  kind: 'mist' | 'co2' | 'spark';
}

export interface FlameCanvasAnimState {
  extinguishLevel: number;
  lastTime: number;
  smokeWisps: SmokeWisp[];
  particles: MistParticle[];
  scratchCanvas: HTMLCanvasElement;
}

const animStates = new WeakMap<HTMLCanvasElement, FlameCanvasAnimState>();

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

// Smooth deterministic 1D/2D wave turbulence for buoyant flicker & shear instabilities
function shearWave(yNorm: number, tSec: number, freq: number, seed: number): number {
  const travel = yNorm * 4.2 - tSec * freq;
  return (
    Math.sin(travel + seed) * 0.55 +
    Math.sin(travel * 1.93 + seed * 2.1 + 1.3) * 0.30 +
    Math.cos(travel * 3.17 - seed * 1.4 + 0.7) * 0.15
  );
}

function drawSoftLobe(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rgb: string,
  alpha: number,
  mode: 'body' | 'haze' | 'shell' = 'haze'
) {
  if (alpha <= 0.002 || rx <= 0.5 || ry <= 0.5) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  if (mode === 'shell') {
    grad.addColorStop(0, `rgba(${rgb}, ${(alpha * 0.14).toFixed(4)})`);
    grad.addColorStop(0.5, `rgba(${rgb}, ${(alpha * 0.30).toFixed(4)})`);
    grad.addColorStop(0.76, `rgba(${rgb}, ${(alpha * 0.88).toFixed(4)})`);
    grad.addColorStop(0.88, `rgba(210, 240, 255, ${(alpha * 0.96).toFixed(4)})`);
    grad.addColorStop(0.95, `rgba(${rgb}, ${(alpha * 0.42).toFixed(4)})`);
    grad.addColorStop(1, `rgba(${rgb}, 0)`);
  } else if (mode === 'body') {
    grad.addColorStop(0, `rgba(${rgb}, ${alpha.toFixed(4)})`);
    grad.addColorStop(0.45, `rgba(${rgb}, ${(alpha * 0.82).toFixed(4)})`);
    grad.addColorStop(0.78, `rgba(${rgb}, ${(alpha * 0.28).toFixed(4)})`);
    grad.addColorStop(1, `rgba(${rgb}, 0)`);
  } else {
    grad.addColorStop(0, `rgba(${rgb}, ${alpha.toFixed(4)})`);
    grad.addColorStop(0.35, `rgba(${rgb}, ${(alpha * 0.56).toFixed(4)})`);
    grad.addColorStop(0.72, `rgba(${rgb}, ${(alpha * 0.14).toFixed(4)})`);
    grad.addColorStop(1, `rgba(${rgb}, 0)`);
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function getFuelStyle(fuelName = ''): 'droplet' | 'rod' | 'gas' | 'wire' {
  const f = fuelName.toLowerCase();
  if (f.includes('pmma') || f.includes('acrylic') || f.includes('paraffin') || f.includes('candle')) return 'rod';
  if (f.includes('wire') || f.includes('cable') || f.includes('polyethylene')) return 'wire';
  if (f.includes('methane') || f.includes('gas') || f.includes('sibal') || f.includes('fabric')) return 'gas';
  return 'droplet';
}

export function renderRealisticFlame(
  canvas: HTMLCanvasElement | null,
  params: RealisticFlameParams
): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Responsive HiDPI backing store sizing
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = canvas.clientWidth || canvas.width || 320;
  const cssH = canvas.clientHeight || canvas.height || 200;
  const targetW = Math.max(120, Math.round(cssW * dpr));
  const targetH = Math.max(90, Math.round(cssH * dpr));
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const w = cssW;
  const h = cssH;
  const tSec = params.timeMs * 0.001;
  const g = Math.max(0, params.gravityG);
  const flow = Math.max(0, params.flowVelocity);
  const o2 = params.oxygenPct;
  const is0G = g < 0.05;
  const isCoolFlame = params.shape === 'cool-envelope';
  const quenchAgent = params.quenchAgent || 'none';
  const quenchSuppression = quenchAgent === 'water_mist' ? 0.55 : quenchAgent === 'co2' ? 0.65 : 1.0;
  const isQuenched = params.shape === 'quenched' || params.intensity <= 0.02;
  const sootFactor = params.sootFactor ?? (params.fuelName?.toLowerCase().includes('methane') ? 0.45 : 1.0);
  const fuelKind = getFuelStyle(params.fuelName);

  // Per-canvas persistent physics state
  let state = animStates.get(canvas);
  if (!state) {
    state = {
      extinguishLevel: isQuenched ? 1 : 0,
      lastTime: params.timeMs,
      smokeWisps: [],
      particles: [],
      scratchCanvas: document.createElement('canvas'),
    };
    animStates.set(canvas, state);
  }

  const dt = Math.min(0.06, Math.max(0.001, (params.timeMs - state.lastTime) / 1000));
  state.lastTime = params.timeMs;

  const prevExt = state.extinguishLevel;
  if (isQuenched) {
    state.extinguishLevel = Math.min(1, state.extinguishLevel + dt * 1.35);
  } else {
    state.extinguishLevel = Math.max(0, state.extinguishLevel - dt * 2.4);
  }
  const ext = state.extinguishLevel;

  // Optical Chamber Anchor
  const cx = w * 0.5;
  const cy = h * 0.5;
  const anchorX = is0G ? cx - flow * w * 0.08 : cx - flow * w * 0.04;
  const anchorY = is0G ? cy : h * 0.69;

  // 1. Clean Optical Test Chamber Backdrop (zero muddy smear)
  const bgGrad = ctx.createRadialGradient(
    anchorX,
    is0G ? anchorY : anchorY - h * 0.16,
    8,
    cx,
    cy,
    Math.max(w, h) * 0.85
  );
  bgGrad.addColorStop(0, '#091021');
  bgGrad.addColorStop(0.55, '#050814');
  bgGrad.addColorStop(1, '#02040a');
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle calibrated chamber reticle hairlines (very low opacity)
  ctx.save();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, anchorY);
  ctx.lineTo(w, anchorY);
  ctx.moveTo(anchorX, 0);
  ctx.lineTo(anchorX, h);
  ctx.stroke();
  ctx.restore();

  // Compute live optical burning strength
  const activeIntensity = isQuenched ? 0 : clamp01(params.intensity * quenchSuppression);
  const burnStrength = Math.max(0, (1 - ext) * (isQuenched ? 0.85 : activeIntensity));
  const isNearLimit = !isQuenched && activeIntensity < 0.45;
  const sputter = isNearLimit
    ? 0.68 + 0.32 * Math.sin(tSec * 24) * Math.cos(tSec * 15.7)
    : 1.0;
  const liveAlpha = clamp01(burnStrength * sputter);

  // 2. Quench Suppression Agents (Water Mist / CO2) & Sparks
  if (quenchAgent !== 'none' || (!isQuenched && liveAlpha > 0.35 && sootFactor > 0.85 && Math.random() < 0.22)) {
    const spawnCount = quenchAgent !== 'none' ? 3 : 1;
    for (let i = 0; i < spawnCount && state.particles.length < 70; i++) {
      if (quenchAgent === 'water_mist') {
        const fromLeft = Math.random() < 0.5;
        state.particles.push({
          x: fromLeft ? 10 : w - 10,
          y: anchorY - 12 + (Math.random() - 0.5) * 55,
          vx: (fromLeft ? 1 : -1) * (95 + Math.random() * 65),
          vy: (Math.random() - 0.5) * 35,
          r: 1.2 + Math.random() * 1.6,
          life: 1.0,
          kind: 'mist',
        });
      } else if (quenchAgent === 'co2') {
        state.particles.push({
          x: anchorX + (Math.random() - 0.5) * 50,
          y: h - 10,
          vx: (Math.random() - 0.5) * 40 + flow * 90,
          vy: -(45 + Math.random() * 45),
          r: 8 + Math.random() * 10,
          life: 1.0,
          kind: 'co2',
        });
      } else {
        // Rare incandescent soot spark rising
        state.particles.push({
          x: anchorX + (Math.random() - 0.5) * 10,
          y: anchorY - (is0G ? 0 : 18),
          vx: (Math.random() - 0.5) * 16 + flow * 65,
          vy: is0G ? (Math.random() - 0.5) * 16 : -(35 + g * 55 + Math.random() * 30),
          r: 0.9 + Math.random() * 0.9,
          life: 0.85,
          kind: 'spark',
        });
      }
    }
  }

  // 4. Residual Smoke Wisps on Extinction or Near-Limit
  if ((isQuenched && ext < 0.98) || (ext > 0.05 && ext < 0.95) || (prevExt < ext && Math.random() < 0.7)) {
    if (state.smokeWisps.length < 36) {
      const ang = Math.random() * Math.PI * 2;
      const spd = is0G ? 12 + Math.random() * 18 : 20 + Math.random() * 24;
      state.smokeWisps.push({
        x: anchorX + (Math.random() - 0.5) * 8,
        y: anchorY - (is0G ? 0 : 14),
        vx: is0G ? Math.cos(ang) * spd + flow * 110 : flow * 130 + (Math.random() - 0.5) * 14,
        vy: is0G ? Math.sin(ang) * spd : -(spd + g * 28),
        r: 4.5 + Math.random() * 5,
        alpha: 0.36 + Math.random() * 0.22,
        life: 1.0,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  for (let i = state.smokeWisps.length - 1; i >= 0; i--) {
    const p = state.smokeWisps[i];
    p.x += (p.vx + Math.sin(tSec * 3 + p.phase) * 7) * dt;
    p.y += p.vy * dt;
    p.r += dt * (is0G ? 11 : 15);
    p.life -= dt * 0.52;
    if (p.life <= 0) {
      state.smokeWisps.splice(i, 1);
      continue;
    }
    const a = p.alpha * Math.sin(p.life * Math.PI * 0.5);
    drawSoftLobe(ctx, p.x, p.y, p.r * 1.15, p.r, '168, 182, 204', a * 0.42, 'haze');
  }

  // =========================================================================
  // 5. MAIN COMBUSTION OPTICS (0G SHELL VS BUOYANT CONVECTION PLUME)
  // =========================================================================
  if (liveAlpha > 0.015) {
    const sizeScale = 0.38 + 0.62 * Math.sqrt(burnStrength);
    const yellowRatio = clamp01((activeIntensity - 0.16) / 0.58) * clamp01(0.45 + 0.65 * sootFactor);

    if (is0G) {
      // ---------------------------------------------------------------------
      // MICROGRAVITY (0G): STOICHIOMETRIC REACTION SHELL + SOOT SHELL + WAKE
      // ---------------------------------------------------------------------
      const unit = Math.min(w, h) * 0.088;
      const baseR = (isCoolFlame ? unit * 2.5 : params.isHybrid ? unit * 3.2 : unit * 2.95) * sizeScale;
      const breath = Math.sin(tSec * (isNearLimit ? 14 : 3.2)) * (isNearLimit ? 2.2 : 1.0);
      const flowStretch = 1 + Math.min(0.65, flow * 1.8);
      const rx = Math.max(10, (baseR + breath) * flowStretch);
      const ry = Math.max(10, (baseR + breath) * (1 - Math.min(0.18, flow * 0.35)));
      const shellCx = anchorX + flow * rx * 0.42;
      const shellCy = anchorY;

      // Ambient chamber radiance (lighter additive)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const ambientRgb = params.isHybrid ? '72, 130, 255' : isCoolFlame ? '56, 130, 246' : '38, 118, 255';
      drawSoftLobe(ctx, shellCx, shellCy, rx * 2.1, ry * 2.1, ambientRgb, 0.24 * liveAlpha, 'haze');
      ctx.restore();

      // Render hollow-core stoichiometric shell onto HiDPI offscreen scratch buffer
      const pad = 26;
      const scW = Math.ceil((rx * 2 + pad * 2) * dpr);
      const scH = Math.ceil((ry * 2 + pad * 2) * dpr);
      const sc = state.scratchCanvas;
      if (sc.width < scW) sc.width = scW;
      if (sc.height < scH) sc.height = scH;
      const sctx = sc.getContext('2d');
      if (sctx) {
        sctx.setTransform(1, 0, 0, 1, 0, 0);
        sctx.globalCompositeOperation = 'source-over';
        sctx.clearRect(0, 0, sc.width, sc.height);

        const ox = (rx + pad) * dpr;
        const oy = (ry + pad) * dpr;
        sctx.setTransform(dpr, 0, 0, dpr, ox, oy);
        sctx.globalCompositeOperation = 'lighter';

        // Outer Reaction Shell (hollow vapor core -> peak reaction rim -> soft quench tail)
        // Shift inner focal glow slightly toward upstream stagnation side when airflow > 0
        sctx.save();
        sctx.scale(rx, ry);
        const stagShift = -Math.min(0.22, flow * 0.55);
        const shellGrad = sctx.createRadialGradient(stagShift, 0, 0.02, 0, 0, 1);
        if (isCoolFlame) {
          shellGrad.addColorStop(0, `rgba(45, 95, 220, ${(0.08 * liveAlpha).toFixed(3)})`);
          shellGrad.addColorStop(0.55, `rgba(76, 145, 248, ${(0.24 * liveAlpha).toFixed(3)})`);
          shellGrad.addColorStop(0.80, `rgba(128, 185, 255, ${(0.52 * liveAlpha).toFixed(3)})`);
          shellGrad.addColorStop(0.91, `rgba(165, 180, 252, ${(0.36 * liveAlpha).toFixed(3)})`);
          shellGrad.addColorStop(1, 'rgba(67, 56, 202, 0)');
        } else if (params.isHybrid) {
          shellGrad.addColorStop(0, `rgba(42, 98, 232, ${(0.16 * liveAlpha).toFixed(3)})`);
          shellGrad.addColorStop(0.52, `rgba(56, 152, 250, ${(0.34 * liveAlpha).toFixed(3)})`);
          shellGrad.addColorStop(0.78, `rgba(130, 210, 255, ${(0.82 * liveAlpha).toFixed(3)})`);
          shellGrad.addColorStop(0.87, `rgba(224, 246, 255, ${(0.98 * liveAlpha).toFixed(3)})`);
          shellGrad.addColorStop(0.94, `rgba(147, 130, 252, ${(0.50 * liveAlpha).toFixed(3)})`);
          shellGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');
        } else {
          shellGrad.addColorStop(0, `rgba(28, 86, 224, ${(0.14 * liveAlpha).toFixed(3)})`);
          shellGrad.addColorStop(0.48, `rgba(38, 120, 242, ${(0.30 * liveAlpha).toFixed(3)})`);
          shellGrad.addColorStop(0.76, `rgba(64, 174, 255, ${(0.72 * liveAlpha).toFixed(3)})`);
          shellGrad.addColorStop(0.86, `rgba(192, 236, 255, ${(0.98 * liveAlpha).toFixed(3)})`);
          shellGrad.addColorStop(0.94, `rgba(58, 148, 255, ${(0.48 * liveAlpha).toFixed(3)})`);
          shellGrad.addColorStop(1, 'rgba(24, 78, 228, 0)');
        }
        sctx.fillStyle = shellGrad;
        sctx.beginPath();
        sctx.arc(0, 0, 1, 0, Math.PI * 2);
        sctx.fill();
        sctx.restore();

        // Volumetric Inner Soot Shell (concentric warm amber glow suspended inside reaction zone)
        if (!isCoolFlame && sootFactor > 0.55 && burnStrength > 0.28) {
          const sootAlpha = clamp01((sootFactor - 0.45) * 0.85) * burnStrength * (0.50 + 0.08 * Math.sin(tSec * 5.2));
          const sootR = ry * 0.68;
          sctx.save();
          sctx.scale(rx * 0.72, sootR);
          const sootGrad = sctx.createRadialGradient(stagShift * 0.5, 0, 0, 0, 0, 1);
          sootGrad.addColorStop(0, 'rgba(255, 140, 42, 0)');
          sootGrad.addColorStop(0.55, `rgba(255, 132, 36, ${(sootAlpha * 0.24).toFixed(3)})`);
          sootGrad.addColorStop(0.78, `rgba(255, 174, 72, ${(sootAlpha * 0.66).toFixed(3)})`);
          sootGrad.addColorStop(0.92, `rgba(255, 114, 28, ${(sootAlpha * 0.36).toFixed(3)})`);
          sootGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
          sctx.fillStyle = sootGrad;
          sctx.beginPath();
          sctx.arc(0, 0, 1, 0, Math.PI * 2);
          sctx.fill();
          sctx.restore();
        }

        // Open downstream wake tail when airflow pushes exhaust away (BASS-II / ACME physics)
        if (flow > 0.015) {
          const tailFadeStart = rx * (1.0 - Math.min(0.65, flow * 1.4));
          const maskGrad = sctx.createLinearGradient(tailFadeStart - rx * 0.35, 0, rx + 8, 0);
          maskGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
          maskGrad.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
          sctx.globalCompositeOperation = 'destination-in';
          sctx.fillStyle = maskGrad;
          sctx.fillRect(-(rx + pad), -(ry + pad), (rx + pad) * 2, (ry + pad) * 2);
        }

        // Composite onto main canvas with additive luminescence
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(
          sc,
          0,
          0,
          scW,
          scH,
          shellCx - (rx + pad),
          shellCy - (ry + pad),
          (rx + pad) * 2,
          (ry + pad) * 2
        );
        ctx.restore();
      }
    } else {
      // ---------------------------------------------------------------------
      // BUOYANT / PARTIAL-G PLUME (Moon / Mars / 1G Earth): MULTI-LAYER OPTICS
      // ---------------------------------------------------------------------
      const gNorm = clamp01((g - 0.05) / 0.95);
      const flameH = Math.max(36, (h * (0.38 + gNorm * 0.22) + (o2 - 21) * 1.6) * sizeScale);
      const baseHalfW = Math.max(8, (Math.min(w, h) * 0.072 + (1 - gNorm) * 4 + (o2 - 21) * 0.22) * sizeScale);
      const leanMax = flow * flameH * (1.35 - gNorm * 0.55);
      const flickerStrength = (isNearLimit ? 5.5 : 2.8) * (0.4 + gNorm * 0.8 + flow * 1.4);
      const liftOffset = ext * 8 + (flow > 0.32 ? (flow - 0.32) * 24 : 0);

      // Compute undulating spine points from base (i=0) to tip (i=steps)
      const steps = 20;
      const spine: { x: number; y: number; r: number }[] = [];
      for (let i = 0; i <= steps; i++) {
        const u = i / steps; // 0 = base, 1 = tip
        const speedHz = 5.5 + gNorm * 6.5 + flow * 9.0;
        const turb = shearWave(u, tSec, speedHz, params.isHybrid ? 1.7 : 0.4) * flickerStrength * Math.pow(u, 1.35);
        const y = anchorY - liftOffset - u * flameH;
        const x = anchorX + leanMax * Math.pow(u, 1.35) + turb;
        // Realistic candle/plume width envelope: swells gently near u=0.22, tapers cleanly to pinched tip
        const bulge = Math.sin(Math.pow(u, 0.65) * Math.PI);
        const tipPinch = Math.pow(1 - u, 0.58);
        const r = baseHalfW * (0.42 * (1 - u) + 0.82 * bulge * tipPinch);
        spine.push({ x, y, r: Math.max(1.2, r) });
      }

      const midPt = spine[Math.floor(steps * 0.42)];
      const tipPt = spine[steps];

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // A. Ambient Volumetric Plume Halo
      const haloRgb = yellowRatio > 0.22
        ? (params.isHybrid ? '230, 125, 95' : '255, 118, 32')
        : '48, 138, 255';
      drawSoftLobe(ctx, midPt.x, midPt.y, baseHalfW * 3.8, flameH * 0.72, haloRgb, 0.24 * liveAlpha, 'haze');
      drawSoftLobe(ctx, anchorX + leanMax * 0.1, anchorY - flameH * 0.12, baseHalfW * 2.2, baseHalfW * 1.8, '56, 148, 255', 0.22 * liveAlpha, 'haze');

      // B. Outer Volumetric Plume Built from Smooth Quadratic Splines (zero faceted edges)
      const drawOrganicPolygon = (scaleW: number, maxU = 1.0, offsetY = 0) => {
        const lastIdx = Math.max(2, Math.round(steps * maxU));
        const leftPts: { x: number; y: number }[] = [];
        const rightPts: { x: number; y: number }[] = [];
        for (let i = 0; i <= lastIdx; i++) {
          const p = spine[i];
          leftPts.push({ x: p.x - p.r * scaleW, y: p.y - offsetY });
          rightPts.push({ x: p.x + p.r * scaleW, y: p.y - offsetY });
        }
        ctx.beginPath();
        ctx.moveTo(leftPts[0].x, leftPts[0].y);
        for (let i = 1; i < leftPts.length - 1; i++) {
          const mx = (leftPts[i].x + leftPts[i + 1].x) * 0.5;
          const my = (leftPts[i].y + leftPts[i + 1].y) * 0.5;
          ctx.quadraticCurveTo(leftPts[i].x, leftPts[i].y, mx, my);
        }
        const tip = spine[lastIdx];
        ctx.quadraticCurveTo(leftPts[leftPts.length - 1].x, leftPts[leftPts.length - 1].y, tip.x, tip.y - offsetY - 2);
        ctx.quadraticCurveTo(rightPts[rightPts.length - 1].x, rightPts[rightPts.length - 1].y, rightPts[rightPts.length - 1].x, rightPts[rightPts.length - 1].y);
        for (let i = rightPts.length - 2; i >= 1; i--) {
          const mx = (rightPts[i].x + rightPts[i - 1].x) * 0.5;
          const my = (rightPts[i].y + rightPts[i - 1].y) * 0.5;
          ctx.quadraticCurveTo(rightPts[i].x, rightPts[i].y, mx, my);
        }
        ctx.lineTo(rightPts[0].x, rightPts[0].y);
        ctx.closePath();
      };

      // Soft Outer Soot / Thermal Boundary Aura
      const auraGrad = ctx.createLinearGradient(anchorX, anchorY, tipPt.x, tipPt.y - 12);
      if (yellowRatio > 0.22) {
        auraGrad.addColorStop(0, `rgba(48, 132, 255, ${(0.28 * liveAlpha).toFixed(3)})`);
        auraGrad.addColorStop(0.28, `rgba(255, 126, 36, ${(0.34 * liveAlpha * yellowRatio).toFixed(3)})`);
        auraGrad.addColorStop(0.75, `rgba(234, 88, 12, ${(0.24 * liveAlpha * yellowRatio).toFixed(3)})`);
        auraGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
      } else {
        auraGrad.addColorStop(0, `rgba(56, 165, 255, ${(0.38 * liveAlpha).toFixed(3)})`);
        auraGrad.addColorStop(0.7, `rgba(37, 99, 235, ${(0.24 * liveAlpha).toFixed(3)})`);
        auraGrad.addColorStop(1, 'rgba(30, 64, 175, 0)');
      }
      ctx.fillStyle = auraGrad;
      drawOrganicPolygon(1.42, 1.0, 0);
      ctx.fill();

      // C. Primary Incandescent Flame Mantle (Planck Blackbody Color Ramp)
      const mantleGrad = ctx.createLinearGradient(anchorX, anchorY - liftOffset, tipPt.x, tipPt.y);
      if (yellowRatio > 0.22) {
        mantleGrad.addColorStop(0, `rgba(38, 135, 255, ${(0.65 * liveAlpha).toFixed(3)})`);
        mantleGrad.addColorStop(0.16, `rgba(255, 166, 62, ${(0.84 * liveAlpha * yellowRatio).toFixed(3)})`);
        mantleGrad.addColorStop(0.45, `rgba(255, 212, 108, ${(0.92 * liveAlpha * yellowRatio).toFixed(3)})`);
        mantleGrad.addColorStop(0.76, `rgba(255, 124, 34, ${(0.78 * liveAlpha * yellowRatio).toFixed(3)})`);
        mantleGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
      } else {
        mantleGrad.addColorStop(0, `rgba(110, 200, 255, ${(0.78 * liveAlpha).toFixed(3)})`);
        mantleGrad.addColorStop(0.45, params.isHybrid ? `rgba(147, 130, 252, ${(0.72 * liveAlpha).toFixed(3)})` : `rgba(56, 165, 255, ${(0.72 * liveAlpha).toFixed(3)})`);
        mantleGrad.addColorStop(1, 'rgba(29, 78, 216, 0)');
      }
      ctx.fillStyle = mantleGrad;
      drawOrganicPolygon(1.0, 1.0, 1);
      ctx.fill();

      // C2. Narrow Inner Buoyant Incandescent Ribbon (adds volumetric depth inside outer mantle)
      if (burnStrength > 0.2) {
        const innerRibbonGrad = ctx.createLinearGradient(anchorX, anchorY - liftOffset, tipPt.x, tipPt.y);
        if (yellowRatio > 0.22) {
          innerRibbonGrad.addColorStop(0, 'rgba(56, 172, 255, 0)');
          innerRibbonGrad.addColorStop(0.24, `rgba(255, 232, 158, ${(0.52 * liveAlpha).toFixed(3)})`);
          innerRibbonGrad.addColorStop(0.58, `rgba(255, 248, 218, ${(0.62 * liveAlpha).toFixed(3)})`);
          innerRibbonGrad.addColorStop(0.88, `rgba(255, 152, 56, ${(0.24 * liveAlpha).toFixed(3)})`);
          innerRibbonGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
        } else {
          innerRibbonGrad.addColorStop(0, `rgba(180, 235, 255, ${(0.36 * liveAlpha).toFixed(3)})`);
          innerRibbonGrad.addColorStop(0.55, `rgba(195, 230, 255, ${(0.44 * liveAlpha).toFixed(3)})`);
          innerRibbonGrad.addColorStop(1, 'rgba(56, 165, 255, 0)');
        }
        ctx.fillStyle = innerRibbonGrad;
        drawOrganicPolygon(0.56, 0.92, flameH * 0.04);
        ctx.fill();
      }

      // D. Luminous White-Hot Upper Blackbody Core (shifted slightly upward like a real soot-emitting zone)
      if (burnStrength > 0.25) {
        for (let i = 3; i <= 14; i++) {
          const u = i / steps;
          const p = spine[i];
          const bell = Math.sin(((u - 0.14) / 0.58) * Math.PI);
          if (bell <= 0) continue;
          const coreRgb = yellowRatio > 0.22 ? '255, 245, 205' : '205, 240, 255';
          drawSoftLobe(ctx, p.x, p.y, p.r * 0.58, flameH * 0.085, coreRgb, 0.22 * bell * liveAlpha, 'body');
        }
      }

      // E. Signature Electric-Blue Stoichiometric Base Cup (fresh O2 entrainment collar)
      ctx.save();
      const baseCupGrad = ctx.createRadialGradient(
        anchorX,
        anchorY - baseHalfW * 0.25 - liftOffset,
        baseHalfW * 0.25,
        anchorX + leanMax * 0.05,
        anchorY - flameH * 0.14 - liftOffset,
        baseHalfW * 1.55
      );
      baseCupGrad.addColorStop(0, 'rgba(30, 64, 175, 0)');
      baseCupGrad.addColorStop(0.45, `rgba(56, 172, 255, ${(0.76 * liveAlpha).toFixed(3)})`);
      baseCupGrad.addColorStop(0.75, `rgba(145, 224, 255, ${(0.62 * liveAlpha).toFixed(3)})`);
      baseCupGrad.addColorStop(1, 'rgba(37, 99, 235, 0)');
      ctx.fillStyle = baseCupGrad;
      drawOrganicPolygon(1.08, 0.38, 0);
      ctx.fill();
      ctx.restore();

      // F. Dark Unburned Fuel-Vapor Inner Zone just above wick/nozzle (photorealism detail!)
      ctx.globalCompositeOperation = 'source-over';
      const darkVaporH = flameH * 0.17;
      const darkGrad = ctx.createRadialGradient(
        anchorX,
        anchorY - darkVaporH * 0.38 - liftOffset,
        1,
        anchorX,
        anchorY - darkVaporH * 0.38 - liftOffset,
        baseHalfW * 0.45
      );
      darkGrad.addColorStop(0, `rgba(8, 12, 26, ${(0.68 * liveAlpha).toFixed(3)})`);
      darkGrad.addColorStop(1, 'rgba(8, 12, 26, 0)');
      ctx.fillStyle = darkGrad;
      ctx.beginPath();
      ctx.ellipse(anchorX, anchorY - darkVaporH * 0.4 - liftOffset, baseHalfW * 0.44, darkVaporH * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // =========================================================================
  // 6. PHYSICAL SPECIMEN HARDWARE + DYNAMIC SURFACE LIGHT REFLECTION
  // =========================================================================
  const emberHeat = isQuenched ? Math.max(0, 1 - ext * 0.68) : liveAlpha;
  const glowRgb = is0G && !isCoolFlame ? '96, 185, 255' : isCoolFlame ? '145, 195, 255' : '255, 165, 78';

  if (is0G) {
    if (fuelKind === 'rod' || fuelKind === 'wire') {
      // Translucent frosted PMMA rod or coated wire entering from right, rounded tip at anchorX
      const rodR = 5.5;
      const rodLen = w - anchorX + 10;
      ctx.save();
      const rodGrad = ctx.createLinearGradient(anchorX, anchorY - rodR, anchorX, anchorY + rodR);
      rodGrad.addColorStop(0, fuelKind === 'wire' ? '#475569' : 'rgba(214, 226, 236, 0.24)');
      rodGrad.addColorStop(0.5, fuelKind === 'wire' ? '#94a3b8' : 'rgba(214, 226, 236, 0.09)');
      rodGrad.addColorStop(1, fuelKind === 'wire' ? '#1e293b' : 'rgba(214, 226, 236, 0.22)');
      ctx.fillStyle = rodGrad;
      ctx.beginPath();
      ctx.moveTo(anchorX + rodLen, anchorY - rodR);
      ctx.lineTo(anchorX + rodR, anchorY - rodR);
      ctx.arc(anchorX + rodR, anchorY, rodR, -Math.PI / 2, Math.PI / 2, true);
      ctx.lineTo(anchorX + rodLen, anchorY + rodR);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = `rgba(214, 226, 236, ${(0.18 + 0.16 * emberHeat).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Subsurface flame light scattering into rod tip
      if (emberHeat > 0.02) {
        ctx.globalCompositeOperation = 'lighter';
        drawSoftLobe(ctx, anchorX + rodR * 0.9, anchorY, 18, rodR * 1.4, glowRgb, 0.34 * emberHeat, 'haze');
      }
      ctx.restore();
    } else {
      // Quartz/SiC ISS suspension fiber + suspended liquid droplet / micro-burner bead
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(anchorX - 38, anchorY + 26);
      ctx.lineTo(anchorX + 38, anchorY - 26);
      ctx.stroke();

      if (emberHeat > 0.15 && isQuenched) {
        ctx.globalCompositeOperation = 'lighter';
        drawSoftLobe(ctx, anchorX, anchorY, 12 * emberHeat, 12 * emberHeat, '251, 146, 60', 0.65 * emberHeat, 'haze');
        ctx.globalCompositeOperation = 'source-over';
      }

      const dropGrad = ctx.createRadialGradient(anchorX - 1.5, anchorY - 1.5, 0.5, anchorX, anchorY, 4.5);
      dropGrad.addColorStop(0, isQuenched && emberHeat > 0.25 ? '#fed7aa' : '#e2e8f0');
      dropGrad.addColorStop(0.65, isQuenched && emberHeat > 0.25 ? '#ea580c' : '#64748b');
      dropGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = dropGrad;
      ctx.beginPath();
      ctx.arc(anchorX, anchorY, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else {
    // Vertical 1G/partial-G burner tube / PMMA rod & charred glowing wick tip
    ctx.save();
    const tubeW = 10;
    const tubeH = Math.max(18, h - anchorY);
    const metalGrad = ctx.createLinearGradient(anchorX - tubeW * 0.5, 0, anchorX + tubeW * 0.5, 0);
    metalGrad.addColorStop(0, '#1e293b');
    metalGrad.addColorStop(0.35, '#64748b');
    metalGrad.addColorStop(0.65, '#334155');
    metalGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = metalGrad;
    ctx.fillRect(anchorX - tubeW * 0.5, anchorY + 3, tubeW, tubeH);

    // Specular rim reflection cast down onto the burner collar by the flame
    if (emberHeat > 0.04) {
      ctx.globalCompositeOperation = 'lighter';
      drawSoftLobe(ctx, anchorX, anchorY + 5, 11, 8, glowRgb, 0.35 * emberHeat, 'haze');
      ctx.globalCompositeOperation = 'source-over';
    }

    // Nozzle lip & glowing wick ember
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 3, tubeW * 0.52, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glowing char/wick filament
    ctx.strokeStyle = emberHeat > 0.2 ? `rgba(251, 146, 60, ${clamp01(emberHeat)})` : '#475569';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY + 3);
    ctx.lineTo(anchorX + flow * 3, anchorY - 2);
    ctx.stroke();
    ctx.restore();
  }

  // 7. Render Mist / CO2 / Spark Particles on top of hardware
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt * (pt.kind === 'mist' ? 1.1 : pt.kind === 'co2' ? 0.75 : 1.4);
    if (pt.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
    if (pt.kind === 'mist') {
      drawSoftLobe(ctx, pt.x, pt.y, pt.r * 2.2, pt.r * 2.2, '186, 230, 253', pt.life * 0.75, 'body');
    } else if (pt.kind === 'co2') {
      drawSoftLobe(ctx, pt.x, pt.y, pt.r, pt.r, '203, 213, 225', pt.life * 0.24, 'haze');
    } else {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawSoftLobe(ctx, pt.x, pt.y, pt.r * 2.4, pt.r * 2.4, '255, 190, 90', pt.life * 0.9, 'body');
      ctx.restore();
    }
  }

  // 8. Small Wind-Direction Arrow (airflow moves left-to-right across the chamber)
  if (flow > 0.004) {
    const arrowEndX = w - 14;
    const arrowStartX = arrowEndX - 28;
    const arrowY = h - 13;
    const windAlpha = clamp01(0.45 + (flow / 0.35) * 0.45);

    ctx.save();
    ctx.strokeStyle = `rgba(125, 211, 252, ${windAlpha.toFixed(2)})`;
    ctx.fillStyle = `rgba(125, 211, 252, ${windAlpha.toFixed(2)})`;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Shaft
    ctx.beginPath();
    ctx.moveTo(arrowStartX, arrowY);
    ctx.lineTo(arrowEndX, arrowY);
    ctx.stroke();

    // Arrowhead pointing right
    ctx.beginPath();
    ctx.moveTo(arrowEndX, arrowY);
    ctx.lineTo(arrowEndX - 5, arrowY - 3.5);
    ctx.lineTo(arrowEndX - 5, arrowY + 3.5);
    ctx.closePath();
    ctx.fill();

    // Compact wind speed label above arrow
    ctx.font = '600 9px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = `rgba(186, 230, 253, ${(windAlpha * 0.9).toFixed(2)})`;
    ctx.fillText(`WIND ${Math.round(flow * 100)} cm/s`, arrowEndX, arrowY - 7);
    ctx.restore();
  }

  // 9. Extinguished Status Label
  if (isQuenched && ext > 0.55) {
    const labelAlpha = Math.min(1, (ext - 0.55) / 0.35);
    ctx.save();
    ctx.globalAlpha = labelAlpha;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FLAME EXTINGUISHED', cx, h - 26);
    if (params.extinctionReason) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText(params.extinctionReason, cx, h - 12);
    }
    ctx.restore();
  }
}
