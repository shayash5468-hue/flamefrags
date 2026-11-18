import { formatRawJsonInText, stripLatex } from '../../src/utils/plainText';
import { synthesizeFragsReply } from '../../src/services/fragsAiEngine';
import {
  SYSTEM_PROMPT,
  deriveFollowUpQuestions,
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
    const { message, level = 'student', history = [], uploadedData } = body;

    if (!message || typeof message !== 'string') {
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

        const { text, model } = await generateWithGeminiCascade(ai, {
          contents: chatContents,
          systemInstruction: SYSTEM_PROMPT,
        });

        const cleanText = formatRawJsonInText(stripLatex(text));
        if (cleanText) {
          return res.status(200).json({
            reply: cleanText,
            source: model,
            suggestedQuestions: deriveFollowUpQuestions(message),
          });
        }
      } catch (geminiErr: any) {
        console.warn('Vercel /api/ai/chat Gemini fallback:', geminiErr?.message || geminiErr);
      }
    }

    const synth = synthesizeFragsReply(message, level, history, uploadedData);
    return res.status(200).json({
      reply: synth.reply,
      source: synth.source,
      suggestedQuestions: synth.suggestedQuestions,
      citedInvestigationIds: synth.citedInvestigationIds,
    });
  } catch (err: any) {
    console.error('Error in /api/ai/chat:', err);
    return res.status(500).json({ error: err?.message || 'Error processing AI chat' });
  }
}
