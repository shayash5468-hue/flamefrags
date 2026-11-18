import { stripLatex } from '../../src/utils/plainText';
import {
  PSI_24_INVESTIGATIONS,
  SYSTEM_PROMPT,
  generateWithGeminiCascade,
  getAiClient,
} from '../_psi';

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { query, expAId, expBId, customValues } = body;

    const expA = PSI_24_INVESTIGATIONS.find(i => i.id === expAId) || PSI_24_INVESTIGATIONS[0];
    const expB = PSI_24_INVESTIGATIONS.find(i => i.id === expBId) || PSI_24_INVESTIGATIONS[1];

    const fA = customValues?.flameA || {};
    const fB = customValues?.flameB || {};
    const fTwin = customValues?.flameTwin || {};
    const isMerged = customValues?.isMerged || false;

    const sliderSummary = `
LIVE SLIDER PARAMETERS SET IN VISUALIZER:
• FLAME A (Left): Gravity = ${fA.gravityG ?? 0}g, Oxygen = ${fA.oxygenPct ?? 21}%, Airflow = ${fA.flowVelocity ?? 0.05} m/s, Fuel = ${fA.fuel ?? expA.fuel}, Pressure = ${fA.pressureKpa ?? 101.3} kPa, Core Temp = ${fA.coreTempC ?? 1100}°C
• FLAME B (Right): Gravity = ${fB.gravityG ?? 1}g, Oxygen = ${fB.oxygenPct ?? 21}%, Airflow = ${fB.flowVelocity ?? 0.05} m/s, Fuel = ${fB.fuel ?? expB.fuel}, Pressure = ${fB.pressureKpa ?? 101.3} kPa, Core Temp = ${fB.coreTempC ?? 1400}°C
${isMerged ? `• FLAMETWIN (Merged Hybrid): Strategy = ${fTwin.mergeStrategy || 'Kinetics Fusion'}, Synthesized Temp = ${fTwin.hybridTempC || 1250}°C, Synthesized Gravity = ${fTwin.gravityG ?? 0.5}g, Synthesized O2 = ${fTwin.oxygenPct ?? 21}%, Synthesized Flow = ${fTwin.flowVelocity ?? 0.05} m/s` : '• FLAMETWIN: Unmerged (two separate flame envelopes)'}
`;

    const ai = getAiClient();
    if (ai) {
      try {
        const prompt = `You are the specialized Side-by-Side & FlameTwin Combustion Physics Agent.
${sliderSummary}

Reference NASA Investigations:
EXPERIMENT A: ${expA.id} — "${expA.title}" (Fuel: ${expA.fuel}, Key Finding: ${expA.keyFinding})
EXPERIMENT B: ${expB.id} — "${expB.title}" (Fuel: ${expB.fuel}, Key Finding: ${expB.keyFinding})

Researcher Question: "${query}"

INSTRUCTIONS:
1. You MUST explicitly reference the user's LIVE SLIDER VALUES (gravity, oxygen %, airflow m/s, fuel, core temp) for both flames in your answer.
2. If FlameTwin is merged, explain how the two flame kinetics fuse together at these exact values.
3. Quantitatively analyze differences in buoyant acceleration, soot shell standoff, Damköhler number, and extinction threshold.
4. Provide a concrete operational takeaway for spacecraft fire safety or industrial burners.
5. STRICTLY NO LATEX: Write all equations, temperatures, and units in plain Unicode text (O₂, °C, ΔT, ≈, ×).`;

        const { text, model } = await generateWithGeminiCascade(ai, {
          contents: prompt,
          systemInstruction: SYSTEM_PROMPT,
        });

        if (text) {
          return res.status(200).json({
            analysis: stripLatex(text),
            expA: expA.id,
            expB: expB.id,
            source: model,
          });
        }
      } catch (aiErr: any) {
        console.warn('Vercel /api/ai/side-by-side Gemini fallback:', aiErr?.message || aiErr);
      }
    }

    const deltaG = Math.abs((fA.gravityG ?? 0) - (fB.gravityG ?? 1)).toFixed(2);
    const deltaO2 = Math.abs((fA.oxygenPct ?? 21) - (fB.oxygenPct ?? 21)).toFixed(1);
    const deltaFlow = Math.abs((fA.flowVelocity ?? 0.05) - (fB.flowVelocity ?? 0.05)).toFixed(2);
    const deltaTemp = Math.abs((fA.coreTempC ?? 1100) - (fB.coreTempC ?? 1400));

    let mergedText = '';
    if (isMerged) {
      mergedText = `\n\n4. FlameTwin Hybrid Fusion Analysis:\nWith the "${fTwin.mergeStrategy || 'Equimolar Kinetics'}" merge active, the hybrid core reaches ~${fTwin.hybridTempC || 1250}°C under effective ${(fTwin.gravityG ?? 0.5).toFixed(2)}g. The multi-component boundary layer allows alkylperoxy cool-flame radical pathways from ${fA.fuel || expA.fuel} to coexist with high-temperature oxidation from ${fB.fuel || expB.fuel}.`;
    }

    return res.status(200).json({
      analysis: `[Dual Flame & FlameTwin Comparative Analysis]\n\n1. Live Slider Conditions Evaluated:\n• Flame A: ${fA.gravityG ?? 0}g gravity, ${fA.oxygenPct ?? 21}% O₂, ${fA.flowVelocity ?? 0.05} m/s flow (${fA.fuel || expA.fuel}), Core Temp: ${fA.coreTempC ?? 1100}°C.\n• Flame B: ${fB.gravityG ?? 1}g gravity, ${fB.oxygenPct ?? 21}% O₂, ${fB.flowVelocity ?? 0.05} m/s flow (${fB.fuel || expB.fuel}), Core Temp: ${fB.coreTempC ?? 1400}°C.\n\n2. Key Physical Deltas:\n• Gravity Differential: Δg = ${deltaG}g. Flame A exhibits ${(fA.gravityG ?? 0) < 0.05 ? 'spherical diffusion-governed' : 'buoyant'} transport, whereas Flame B exhibits ${(fB.gravityG ?? 1) < 0.05 ? 'spherical' : 'buoyant upward stretching'}.\n• Oxygen Differential: ΔO₂ = ${deltaO2}%. Burning rate scales with oxidizer mass fraction.\n• Airflow Differential: Δu = ${deltaFlow} m/s. Flame A Peclet number contrasts with Flame B convective strain.\n• Thermal Differential: ΔT = ${deltaTemp}°C.${mergedText}\n\n3. Spacecraft Safety Impact:\nOperating at these parameters confirms that terrestrial 1g test data (Flame B) cannot predict microgravity flammability (Flame A). Per NASA PSI findings [${expA.id} & ${expB.id}], forced airflow must be isolated immediately during an anomalous fire event.`,
      expA: expA.id,
      expB: expB.id,
      source: 'psi-grounded-intelligence',
    });
  } catch (err: any) {
    console.error('Error in /api/ai/side-by-side:', err);
    return res.status(500).json({ error: err?.message || 'Error processing comparison' });
  }
}
