import { PsiFileRecord } from '../types';
import { stripLatex, formatRawJsonInText } from '../utils/plainText';
import { generateSmartFragsReply } from '../utils/aiResponseGenerator';

export async function askFragsAI(
  message: string,
  level: 'beginner' | 'student' | 'advanced' = 'student',
  history: { sender: string; text: string }[] = [],
  uploadedData?: PsiFileRecord | null
): Promise<{ reply: string; source: string }> {
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, level, history, uploadedData }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (res.ok && data && data.reply) {
        return {
          reply: formatRawJsonInText(stripLatex(data.reply)),
          source: data.source || 'gemini-4-hydrogen',
        };
      }
    }
  } catch {
    // Server route unavailable -> fall through
  }

  return {
    reply: generateSmartFragsReply(message, level, uploadedData),
    source: 'NASA PSI Grounded Research Engine',
  };
}

export async function simulateFlamePhysics(params: {
  gravityG: number;
  oxygenPct: number;
  airflowVelocity: number;
  fuelChoice: string;
  pressureKpa: number;
}): Promise<any> {
  try {
    const res = await fetch('/api/ai/simulate-flame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch {
    // Fallback to local physics engine
  }

  const { gravityG, oxygenPct, airflowVelocity, fuelChoice, pressureKpa } = params;
  const fuelKey = fuelChoice.toLowerCase();
  const fuelLoiBase = fuelKey.includes('pmma') ? 17.2 : fuelKey.includes('polyethylene') ? 16.4 : fuelKey.includes('methane') ? 15.2 : 14.6;
  const fuelBaseTemp = fuelKey.includes('pmma') ? 1130 : fuelKey.includes('polyethylene') ? 1180 : fuelKey.includes('methane') ? 1320 : 1260;
  const is0G = gravityG < 0.05;
  const loi = fuelLoiBase + (is0G ? 0.9 : -0.4) + Math.max(0, (101.3 - pressureKpa) * 0.032);
  const blowoffLimit = (fuelKey.includes('methane') ? 0.38 : 0.34) + (oxygenPct - 21) * 0.014 + (pressureKpa - 101.3) * 0.0012;
  const isO2Quenched = oxygenPct <= loi;
  const coolCapable = fuelKey.includes('heptane') || fuelKey.includes('methane');
  const inCoolZone = coolCapable && is0G && airflowVelocity < 0.02 && oxygenPct > loi && oxygenPct <= 21.0;
  const isStagnantQuenched = is0G && airflowVelocity <= 0.005 && (inCoolZone ? oxygenPct < 17.0 : oxygenPct < 19.5);
  const isBlowoff = airflowVelocity >= blowoffLimit;
  const isQuenched = isO2Quenched || isStagnantQuenched || isBlowoff;

  const coreTemp = isQuenched
    ? Math.round(160 + Math.max(0, oxygenPct - 12) * 10)
    : inCoolZone
    ? Math.round(240 + (oxygenPct - loi) * 18)
    : Math.round(fuelBaseTemp + (oxygenPct - 21) * 34 + (gravityG * 125) + (airflowVelocity * 160));
  const shape = isQuenched
    ? 'quenched'
    : inCoolZone
    ? 'cool-envelope'
    : is0G
    ? 'spherical'
    : 'teardrop';

  return {
    coreTemp,
    sootRadiusMm: isQuenched ? 0 : inCoolZone ? 5.8 : is0G ? (fuelKey.includes('methane') ? 7.2 : 14.5) : 3.2,
    flameShape: shape,
    blueIntensity: isQuenched ? 0 : is0G ? 0.85 : 0.25,
    yellowIntensity: isQuenched ? 0 : is0G ? 0.15 : 0.85,
    extinctionRisk: isQuenched ? (isBlowoff ? 'blowout' : 'suffocated') : inCoolZone ? 'cool-flame' : 'stable',
    scientificSummary: isO2Quenched
      ? `Oxygen concentration (${oxygenPct.toFixed(1)}%) dropped below the Limiting Oxygen Index (~${loi.toFixed(1)}%) for ${fuelChoice}, terminating chain-branching radicals.`
      : isStagnantQuenched
      ? 'Zero-flow microgravity traps CO₂ combustion products around the flame front, suffocating the diffusion zone.'
      : isBlowoff
      ? `Forced airflow (${(airflowVelocity * 100).toFixed(0)} cm/s) exceeded the local flame speed, causing Damköhler blow-off extinction.`
      : inCoolZone
      ? `Cool-flame peroxy radical chemistry (RO₂•) sustains low-temperature oxidation (~${coreTemp}°C) in quiescent microgravity.`
      : is0G
      ? 'Zero-gravity eliminates buoyancy, driving spherical radical chemiluminescence with trapped soot shells.'
      : 'Natural buoyancy accelerates hot gases upward, forming an elongated incandescent yellow teardrop flame.',
    source: 'physics-engine',
  };
}

export async function analyzeSideBySide(params: {
  query: string;
  expAId: string;
  expBId: string;
  customValues: any;
}): Promise<any> {
  try {
    const res = await fetch('/api/ai/side-by-side', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (res.ok) return data;
    }
  } catch {
    // Fallback to deterministic physics diagnostics below
  }

  const fA = params.customValues?.flameA || {};
  const fB = params.customValues?.flameB || {};
  const fTwin = params.customValues?.flameTwin || {};
  const isMerged = params.customValues?.isMerged || false;

  const gA = fA.gravityG ?? 0;
  const gB = fB.gravityG ?? 1;
  const deltaG = Math.abs(gA - gB).toFixed(2);
  const deltaTemp = Math.abs((fA.coreTempC ?? 1100) - (fB.coreTempC ?? 1400));
  const modeDesc = (g: number, shape?: string) =>
    shape === 'quenched'
      ? 'extinguished (below reactive threshold)'
      : shape === 'cool-envelope'
      ? 'low-temperature peroxy cool-flame chemistry'
      : g < 0.05
      ? 'molecular diffusion (symmetric spherical envelope)'
      : 'buoyant convection (elongated teardrop plume)';

  return {
    analysis: `[Dual Flame & FlameTwin Comparative Analysis]\n\n1. Live Parameters:\n• Flame A (${fA.fuel || params.expAId}): ${gA}g, ${fA.oxygenPct ?? 21}% O₂, ${fA.flowVelocity ?? 0.05} m/s, Temp: ${fA.coreTempC ?? 1100}°C.\n• Flame B (${fB.fuel || params.expBId}): ${gB}g, ${fB.oxygenPct ?? 21}% O₂, ${fB.flowVelocity ?? 0.0} m/s, Temp: ${fB.coreTempC ?? 1400}°C.\n\n2. Hydrodynamic & Kinetic Regime:\n• Gravity Delta (Δg = ${deltaG}g): Flame A operates under ${modeDesc(gA, fA.shape)}, while Flame B exhibits ${modeDesc(gB, fB.shape)}.\n• Thermal Delta: ΔT = ${deltaTemp}°C.${isMerged ? `\n\n3. FlameTwin (${fTwin.mergeStrategy || 'Synthesis'}): At ${(fTwin.gravityG ?? 0.5).toFixed(2)}g and ${(fTwin.oxygenPct ?? 21).toFixed(1)}% O₂, the coupled reaction resolves to ${fTwin.shape === 'quenched' ? `full extinction (${fTwin.extinctionReason || 'limit reached'})` : `~${fTwin.hybridTempC ?? 1250}°C (Da=${fTwin.damkohler ?? '—'}) with ${(fTwin.gravityG ?? 0.5) < 0.05 ? 'spherical diffusion' : 'buoyant teardrop'} geometry`}.` : ''}\n\n4. Spacecraft Safety: Terrestrial 1g flammability tests cannot reliably predict microgravity or partial-gravity extinction boundaries; isolate forced cabin airflow immediately upon smoke or thermal detection.`,
    expA: params.expAId,
    expB: params.expBId,
    source: 'psi-grounded-intelligence',
  };
}


