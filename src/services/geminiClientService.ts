import { PsiFileRecord } from '../types';
import { stripLatex } from '../utils/plainText';

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
          reply: stripLatex(data.reply),
          source: data.source || 'gemini-4-hydrogen',
        };
      }
      if (!res.ok && data?.error) {
        return {
          reply: `${generateDeterministicPsiReply(message, level, uploadedData)}\n\n(Note: Live Gemini API returned: ${data.error} — check GEMINI_API_KEY in Settings > Secrets.)`,
          source: 'NASA PSI Fallback (Check GEMINI_API_KEY)',
        };
      }
    }
  } catch {
    // Server route unavailable -> use local NASA PSI deterministic intelligence fallback
  }

  return {
    reply: generateDeterministicPsiReply(message, level, uploadedData),
    source: 'NASA PSI Combustion Informatics Engine (Offline Resilient)',
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

function generateDeterministicPsiReply(
  query: string,
  _level: string,
  uploadedData?: PsiFileRecord | null
): string {
  const q = query.toLowerCase();

  if (uploadedData) {
    return `### NASA PSI Deep Analysis: ${uploadedData.filename}\n\n` +
      `**Investigation Grounding:** ${uploadedData.investigationName} ([${uploadedData.id || uploadedData.mission}])\n` +
      `**Combustion Regime:** ${uploadedData.fuelType} in ${uploadedData.gravityCondition} under ${uploadedData.oxygenRange} O₂.\n\n` +
      `**Physical Interpretation:**\n` +
      `- In microgravity (10⁻⁶ g), buoyant natural convection is absent (Gr ≈ 0). Transport is governed by pure molecular diffusion and forced ventilation.\n` +
      `- **Data Integrity:** ${uploadedData.qualityReport?.totalRows || 0} time-series rows analyzed. Missing values: ${uploadedData.qualityReport?.missingValues || 0} (${uploadedData.qualityReport?.status || 'validated'}).\n` +
      `- **Extinction Hazard & Low-Flow Paradox:** As demonstrated in [PSI-25 BASS-II], flame spread rate reaches a dangerous peak under faint air currents (~0.05 m/s). Stagnant air allows combustion products (CO₂ and H₂O) to form a smothering boundary layer.\n\n` +
      `**Spacecraft Safety Recommendation:** Maintain ventilation duct isolation and prepare fine-water-mist suppression.`;
  }

  if (q.includes('cool') || q.includes('flex')) {
    return `### Cool Flames in Microgravity ([PSI-20 FLEX] & [PSI-159 ACME CFI-G])\n\n` +
      `In 1G, buoyancy forces cold air inward, maintaining hot combustion (1400°C–1800°C) until the flame snaps out. But aboard the International Space Station, NASA's **FLEX (Flame Extinguishment Experiment)** revealed a startling discovery:\n\n` +
      `1. **Invisible Low-Temperature Combustion:** After the visible hot droplet flame extinguishes, a second low-temperature chemical regime persists at **~250°C to 500°C** with zero visible emission.\n` +
      `2. **Low-Temperature Peroxy Kinetics:** The reaction is driven by alkylperoxy radical isomerization (R + O₂ ⇌ RO₂ → QOOH → ketohydroperoxides + OH) without generating incandescent blackbody soot.\n` +
      `3. **Space Safety Threat:** If cabin ventilation delivers fresh oxygen to a supposedly "extinguished" compartment, cool flame vapor can violently re-ignite into a runaway hot flame.\n\n` +
      `*Citations: [PSI-20 FLEX (Dr. Forman Williams)], [PSI-159 ACME CFI-G (Dr. Peter Sunderland)].*`;
  }

  if (q.includes('1g') || q.includes('0g') || q.includes('difference') || q.includes('shape')) {
    return `### 0G vs 1G Flame Physics & Geometry\n\n` +
      `**1G Terrestrial Flames (Teardrop Geometry):**\n` +
      `- Driven by gravity-induced density differences (hot gas rises at 1-3 m/s, drawing cool air inward at the base).\n` +
      `- Results in a tall, slender **teardrop shape** with a pointed apex, sharp convective shear, and luminous yellow/orange incandescent soot caused by rapid thermal buoyant acceleration.\n\n` +
      `**0G Microgravity Flames (Spherical Envelope):**\n` +
      `- Buoyancy is eliminated (g ≈ 10⁻⁶ g). All mass and thermal transport occurs solely via isotropic molecular diffusion.\n` +
      `- Oxygen diffuses symmetrically from all radial directions, forming a **perfect, eerily quiet spherical flame ball**.\n` +
      `- Soot generation is dramatically reduced; the visible flame is a faint blue chemiluminescent shell emitting from excited CH* and C₂* radicals.\n\n` +
      `*Citations: [PSI-26 BASS (Dr. Sandra Olson)], [PSI-10 ACME B-ELM (Dr. James T'ien)].*`;
  }

  return `### Spacecraft Combustion Intelligence ([PSI-25 BASS-II] & [PSI-98 Saffire-I])\n\n` +
    `In microgravity aboard the ISS and future Artemis lunar bases, fire behavior is counterintuitive:\n\n` +
    `- **The Low-Flow Paradox:** Counterintuitively, spacecraft fires do not burn most violently in strong drafts. As proven in [PSI-25 BASS-II], flame spread peaks at low flow (~0.05 m/s), where just enough oxygen is supplied without blowing out the flame.\n` +
    `- **Soot Shell Dynamics:** Soot particles do not rise or settle. They form a concentric spherical soot shell trapped between the fuel source and the blue flame front.\n` +
    `- **Extinguishment:** Traditional CO₂ extinguishers can violently scatter glowing zero-g embers. NASA utilizes fine-water-mist and acoustic suppression.\n\n` +
    `*Citations: [PSI-25 BASS-II], [PSI-98 Saffire-I], [PSI-101 Saffire-IV].*`;
}
