import { Type } from '@google/genai';
import { stripLatex } from '../../src/utils/plainText';
import { generateWithGeminiCascade, getAiClient } from '../_psi';

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const {
      gravityG = 0,
      oxygenPct = 21,
      airflowVelocity = 0.05,
      fuelChoice = 'n-Heptane Droplet',
      pressureKpa = 101.3,
    } = body;

    const ai = getAiClient();
    if (ai) {
      try {
        const prompt = `Given the following combustion environment:
- Gravity: ${gravityG} g
- Oxygen concentration: ${oxygenPct} %
- Forced airflow velocity: ${airflowVelocity} m/s
- Fuel: ${fuelChoice}
- Cabin pressure: ${pressureKpa} kPa

Calculate realistic microgravity/terrestrial combustion properties and return JSON matching the schema. Write scientificSummary as 2 concise plain-text sentences explaining molecular kinetics and transport using plain Unicode only (strictly NO LaTeX or $...$ math markup).`;

        const { text, model } = await generateWithGeminiCascade(ai, {
          contents: prompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              coreTemp: { type: Type.NUMBER, description: 'Flame core temperature in Celsius' },
              sootRadiusMm: { type: Type.NUMBER, description: 'Soot shell standoff radius in mm' },
              flameShape: { type: Type.STRING, description: "One of: 'spherical', 'teardrop', 'cool-envelope', 'quenched'" },
              blueIntensity: { type: Type.NUMBER, description: 'Normalized blue intensity from 0.0 to 1.0' },
              yellowIntensity: { type: Type.NUMBER, description: 'Normalized yellow intensity from 0.0 to 1.0' },
              extinctionRisk: { type: Type.STRING, description: "One of: 'stable', 'cool-flame', 'blowout', 'suffocated'" },
              scientificSummary: { type: Type.STRING, description: '2 concise plain-text sentences explaining the physics' },
            },
          },
        });

        if (text) {
          const parsed = JSON.parse(text);
          if (parsed.scientificSummary) {
            parsed.scientificSummary = stripLatex(parsed.scientificSummary);
          }
          return res.status(200).json({ ...parsed, source: model });
        }
      } catch (aiSimErr: any) {
        console.warn('Vercel /api/ai/simulate-flame Gemini fallback:', aiSimErr?.message || aiSimErr);
      }
    }

    const is0G = gravityG < 0.05;
    const coreTemp = Math.round(1100 + (oxygenPct - 21) * 35 + gravityG * 120 + airflowVelocity * 180);
    const shape =
      oxygenPct < 15 || (is0G && airflowVelocity === 0 && oxygenPct < 19)
        ? 'quenched'
        : is0G && airflowVelocity < 0.02
        ? 'cool-envelope'
        : is0G
        ? 'spherical'
        : 'teardrop';

    return res.status(200).json({
      coreTemp,
      sootRadiusMm: is0G ? 14.5 : 3.2,
      flameShape: shape,
      blueIntensity: is0G ? 0.85 : 0.25,
      yellowIntensity: is0G ? 0.15 : 0.85,
      extinctionRisk:
        shape === 'quenched' ? 'suffocated' : is0G && airflowVelocity < 0.03 ? 'cool-flame' : 'stable',
      scientificSummary: is0G
        ? 'Zero-gravity eliminates buoyancy, driving spherical radical chemiluminescence with trapped soot shells.'
        : 'Natural buoyancy accelerates hot gases upward, forming an elongated incandescent yellow teardrop flame.',
      source: 'physics-engine',
    });
  } catch (err: any) {
    console.error('Error in /api/ai/simulate-flame:', err);
    return res.status(500).json({ error: err?.message || 'Error simulating flame' });
  }
}
