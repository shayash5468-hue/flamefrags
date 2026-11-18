import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Type } from '@google/genai';
import { stripLatex, formatRawJsonInText } from './src/utils/plainText';
import { synthesizeFragsReply } from './src/services/fragsAiEngine';
import {
  PRIMARY_GEMINI_MODEL,
  PSI_24_INVESTIGATIONS,
  SYSTEM_PROMPT,
  deriveFollowUpQuestions,
  generateWithGeminiCascade,
  getAiClient as getSharedAiClient,
} from './api/_psi';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

function getAiClient() {
  try {
    dotenv.config();
  } catch {
    // ignore
  }
  return getSharedAiClient();
}

// API 1: Frags AI Chat Endpoint
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, level = 'student', history = [], uploadedData } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let uploadContextPrompt = '';
    if (uploadedData) {
      const formattedSampleRows =
        uploadedData.sampleRows
          ?.slice(0, 8)
          .map(
            (r: any, idx: number) =>
              `Record #${idx + 1} -> ` +
              Object.entries(r)
                .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                .join(' | ')
          )
          .join('\n') || 'No sample rows';

      uploadContextPrompt = `\n\n[OPTIONAL REFERENCE DATASET CONTEXT (only analyze this if the user's question asks about the uploaded dataset or metrics)]:
Filename: ${uploadedData.filename} (${uploadedData.format?.toUpperCase()})
Investigation: ${uploadedData.investigationName || 'Custom Experiment'}
Fuel / Material: ${uploadedData.fuelType || 'Custom fuel'}
Environment: ${uploadedData.gravityCondition || 'Variable gravity'} | O2: ${uploadedData.oxygenRange || 'Custom'}
Columns Detected: ${uploadedData.columns?.join(', ')}
Quality Report: ${uploadedData.qualityReport?.totalRows || 0} total rows, ${uploadedData.qualityReport?.missingValues || 0} missing values, status: ${uploadedData.qualityReport?.status || 'validated'}
Sample Records (Formatted parameters):
${formattedSampleRows}
User Description: ${uploadedData.description || 'Imported laboratory/flight combustion dataset'}

Answer the user's actual question below directly and naturally. If their question asks about this dataset, analyze the metrics, correlate with NASA PSI physics, and detect anomalies; otherwise answer their specific question directly without repeating a dataset summary.`;
    }

    const ai = getAiClient();
    if (ai) {
      try {
        const cleanHistory = (Array.isArray(history) ? history : [])
          .filter((h: any) => h && typeof h.text === 'string' && h.text.trim().length > 0)
          .slice(-10)
          .map((h: { sender: string; text: string }) => ({
            role: h.sender === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }],
          }));

        const chatContents = [
          ...cleanHistory,
          {
            role: 'user',
            parts: [
              {
                text: `[Explanation Level: ${String(level).toUpperCase()}]${uploadContextPrompt}\n\n${message}`,
              },
            ],
          },
        ];

        const { text, model } = await generateWithGeminiCascade(
          ai,
          {
            contents: chatContents,
            systemInstruction: SYSTEM_PROMPT,
          },
          35000
        );

        const responseText = formatRawJsonInText(stripLatex(text));
        if (responseText) {
          return res.json({
            reply: responseText,
            source: model,
            suggestedQuestions: deriveFollowUpQuestions(message),
          });
        }
      } catch (geminiErr: any) {
        console.warn('Gemini chat API call fallback:', geminiErr?.message || geminiErr);
      }
    }

    const synth = synthesizeFragsReply(message, level, history, uploadedData);
    return res.json({
      reply: synth.reply,
      source: synth.source,
      suggestedQuestions: synth.suggestedQuestions,
      citedInvestigationIds: synth.citedInvestigationIds,
    });
  } catch (err: any) {
    console.error('Error in /api/ai/chat:', err);
    return res.status(500).json({ error: err.message || 'Error processing AI chat' });
  }
});

// API 2: Side-by-Side & FlameTwin Comparison AI Chat Endpoint
app.post('/api/ai/side-by-side', async (req: Request, res: Response) => {
  try {
    const { query, expAId, expBId, customValues } = req.body;
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

        const { text, model } = await generateWithGeminiCascade(
          ai,
          {
            contents: prompt,
            systemInstruction: SYSTEM_PROMPT,
          },
          35000
        );

        if (text) {
          return res.json({
            analysis: stripLatex(text),
            expA: expA.id,
            expB: expB.id,
            source: model,
          });
        }
      } catch (aiErr: any) {
        console.warn('Gemini side-by-side call warning:', aiErr?.message || aiErr);
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

    return res.json({
      analysis: `[Dual Flame & FlameTwin Comparative Analysis]\n\n1. Live Slider Conditions Evaluated:\n• Flame A: ${fA.gravityG ?? 0}g gravity, ${fA.oxygenPct ?? 21}% O₂, ${fA.flowVelocity ?? 0.05} m/s flow (${fA.fuel || expA.fuel}), Core Temp: ${fA.coreTempC ?? 1100}°C.\n• Flame B: ${fB.gravityG ?? 1}g gravity, ${fB.oxygenPct ?? 21}% O₂, ${fB.flowVelocity ?? 0.05} m/s flow (${fB.fuel || expB.fuel}), Core Temp: ${fB.coreTempC ?? 1400}°C.\n\n2. Key Physical Deltas:\n• Gravity Differential: Δg = ${deltaG}g. Flame A exhibits ${(fA.gravityG ?? 0) < 0.05 ? 'spherical diffusion-governed' : 'buoyant'} transport, whereas Flame B exhibits ${(fB.gravityG ?? 1) < 0.05 ? 'spherical' : 'buoyant upward stretching'}.\n• Oxygen Differential: ΔO₂ = ${deltaO2}%. Burning rate scales with oxidizer mass fraction.\n• Airflow Differential: Δu = ${deltaFlow} m/s. Flame A Peclet number contrasts with Flame B convective strain.\n• Thermal Differential: ΔT = ${deltaTemp}°C.${mergedText}\n\n3. Spacecraft Safety Impact:\nOperating at these parameters confirms that terrestrial 1g test data (Flame B) cannot predict microgravity flammability (Flame A). Per NASA PSI findings [${expA.id} & ${expB.id}], forced airflow must be isolated immediately during an anomalous fire event.`,
      expA: expA.id,
      expB: expB.id,
      source: 'psi-grounded-intelligence',
    });
  } catch (err: any) {
    console.error('Error in /api/ai/side-by-side:', err);
    return res.status(500).json({ error: err.message || 'Error processing comparison' });
  }
});

// API 3: Realistic Flame Physics Parameters Simulation Endpoint
app.post('/api/ai/simulate-flame', async (req: Request, res: Response) => {
  try {
    const { gravityG, oxygenPct, airflowVelocity, fuelChoice, pressureKpa } = req.body;

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

        const { text, model } = await generateWithGeminiCascade(
          ai,
          {
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
          },
          35000
        );

        if (text) {
          const parsed = JSON.parse(text);
          if (parsed.scientificSummary) {
            parsed.scientificSummary = stripLatex(parsed.scientificSummary);
          }
          return res.json({ ...parsed, source: model });
        }
      } catch (aiSimErr: any) {
        console.warn('Gemini simulate-flame call fallback:', aiSimErr?.message || aiSimErr);
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

    return res.json({
      coreTemp,
      sootRadiusMm: is0G ? 14.5 : 3.2,
      flameShape: shape,
      blueIntensity: is0G ? 0.85 : 0.25,
      yellowIntensity: is0G ? 0.15 : 0.85,
      extinctionRisk: shape === 'quenched' ? 'suffocated' : is0G && airflowVelocity < 0.03 ? 'cool-flame' : 'stable',
      scientificSummary: is0G
        ? 'Zero-gravity eliminates buoyancy, driving spherical radical chemiluminescence with trapped soot shells.'
        : 'Natural buoyancy accelerates hot gases upward, forming an elongated incandescent yellow plume.',
      source: 'physics-engine',
    });
  } catch (err: any) {
    console.error('Error in /api/ai/simulate-flame:', err);
    return res.status(500).json({ error: err.message || 'Error simulating flame' });
  }
});

// API 4: Get All 24 NASA PSI Investigations
app.get('/api/psi/investigations', (_req: Request, res: Response) => {
  return res.json(PSI_24_INVESTIGATIONS);
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.static(path.resolve(__dirname, 'public')));

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`FlameFrags Server running on port ${PORT} (Gemini AI [${PRIMARY_GEMINI_MODEL}]: ${getAiClient() ? 'ENABLED' : 'FALLBACK MODE'})`);
  });
}

startServer();
