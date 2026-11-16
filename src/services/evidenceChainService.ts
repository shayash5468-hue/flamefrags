import { EvidenceChainRecord, PsiFileRecord, PsiInvestigationRecord } from '../types';
import { PSI_INVESTIGATIONS_REGISTRY } from '../data/psiRegistry';
import { profileDatasetColumns } from './experimentDetectiveService';
import { stripLatex } from '../utils/plainText';

export function matchInvestigationsForQuery(
  query: string,
  focusedInvestigationId?: string,
  uploadedData?: PsiFileRecord | null
): PsiInvestigationRecord[] {
  const matched: PsiInvestigationRecord[] = [];
  const pushUnique = (inv?: PsiInvestigationRecord) => {
    if (inv && !matched.some(m => m.id === inv.id)) matched.push(inv);
  };

  if (focusedInvestigationId && focusedInvestigationId !== 'all') {
    pushUnique(PSI_INVESTIGATIONS_REGISTRY.find(i => i.id === focusedInvestigationId));
  }

  if (uploadedData?.investigationId) {
    pushUnique(PSI_INVESTIGATIONS_REGISTRY.find(i => i.id === uploadedData.investigationId));
  }

  const q = query.toLowerCase();
  for (const inv of PSI_INVESTIGATIONS_REGISTRY) {
    if (
      q.includes(inv.id.toLowerCase()) ||
      q.includes(inv.acronym.toLowerCase()) ||
      (q.includes('cool flame') && (inv.id === 'PSI-20' || inv.id === 'PSI-159' || inv.id === 'PSI-142')) ||
      ((q.includes('low-flow') || q.includes('low flow') || q.includes('bass')) && (inv.id === 'PSI-25' || inv.id === 'PSI-26')) ||
      (q.includes('saffire') && inv.id.startsWith('PSI-9') || (q.includes('saffire') && inv.id.startsWith('PSI-10'))) ||
      ((q.includes('wire') || q.includes('sofie') || q.includes('mist')) && inv.id === 'PSI-115') ||
      ((q.includes('e-field') || q.includes('electric')) && inv.id === 'PSI-68') ||
      ((q.includes('partial') || q.includes('lunar') || q.includes('mars') || q.includes('gap')) && (inv.id === 'PSI-101' || inv.id === 'PSI-25' || inv.id === 'PSI-115'))
    ) {
      pushUnique(inv);
    }
    if (matched.length >= 3) break;
  }

  // Fallback topical match across titles/fuels if still empty
  if (matched.length === 0) {
    for (const inv of PSI_INVESTIGATIONS_REGISTRY) {
      const hay = `${inv.title} ${inv.fuel} ${inv.keyFinding}`.toLowerCase();
      const tokens = q.split(/\s+/).filter(w => w.length > 4);
      if (tokens.some(t => hay.includes(t))) {
        pushUnique(inv);
      }
      if (matched.length >= 2) break;
    }
  }

  return matched.slice(0, 3);
}

export function buildEvidenceChainForAiReply(params: {
  originalQuestion: string;
  aiReply: string;
  focusedInvestigationId?: string;
  uploadedData?: PsiFileRecord | null;
  sourceLabel: string;
}): EvidenceChainRecord {
  const { originalQuestion, aiReply, focusedInvestigationId, uploadedData, sourceLabel } = params;
  const matchedInvs = matchInvestigationsForQuery(originalQuestion, focusedInvestigationId, uploadedData);

  const documentedConditions: EvidenceChainRecord['documentedConditions'] = [];
  const supportingFindings: EvidenceChainRecord['supportingFindings'] = [];
  const calculationsPerformed: EvidenceChainRecord['calculationsPerformed'] = [];
  const limitations: string[] = [];

  for (const inv of matchedInvs) {
    documentedConditions.push({
      label: `${inv.id} (${inv.acronym}) Environment`,
      value: `Gravity: ${inv.gravityCondition} · O₂: ${inv.oxygenConcentration} · Airflow: ${inv.airflow} · Pressure: ${inv.pressure}`,
      tag: 'NASA-Reported',
      investigationId: inv.id,
    });
    supportingFindings.push({
      label: `${inv.id} Key Finding`,
      value: inv.keyFinding,
      tag: 'NASA-Reported',
      investigationId: inv.id,
    });
  }

  if (uploadedData) {
    const prof = profileDatasetColumns(uploadedData);
    const numCols = prof.columns.filter(c => c.type === 'numeric');
    documentedConditions.push({
      label: `Dataset (${uploadedData.filename})`,
      value: `Fuel: ${uploadedData.fuelType} · Gravity: ${uploadedData.gravityCondition} · O₂: ${uploadedData.oxygenRange}`,
      tag: 'Measured Data',
      datasetId: uploadedData.id,
    });
    calculationsPerformed.push({
      label: 'Dataset Schema & Row Audit',
      value: `${prof.rows.length} locally inspected rows (of ${uploadedData.qualityReport.totalRows} declared), ${numCols.length} numeric columns [${numCols.map(c => `${c.name}:${c.unit}`).join(', ')}]`,
      tag: 'Derived Calculation',
      datasetId: uploadedData.id,
    });
    if (uploadedData.qualityReport.totalRows > prof.rows.length) {
      limitations.push(
        `Dataset preview contains ${prof.rows.length} rows of ${uploadedData.qualityReport.totalRows} declared rows; AI synthesis relies on inspected rows + schema metadata.`
      );
    }
  }

  const qLower = originalQuestion.toLowerCase();
  if (qLower.includes('lunar') || qLower.includes('mars') || qLower.includes('partial')) {
    limitations.push(
      'Partial-gravity (0.16g Lunar / 0.38g Martian) combustion experimental datasets are absent from the currently indexed PSI collection.'
    );
  }
  if (matchedInvs.some(i => i.pressure === 'unknown')) {
    limitations.push(
      'One or more cited PSI records have "unknown" ambient pressure or sensor specifications in our local index; verify primary documentation at psi.nasa.gov.'
    );
  }
  if (!sourceLabel.toLowerCase().includes('gemini')) {
    limitations.push(
      `Generated via offline deterministic PSI synthesis (${sourceLabel}) because live LLM API key or server proxy was unavailable.`
    );
  } else {
    limitations.push(
      `Narrative synthesis generated by ${sourceLabel}; treat explanatory synthesis separately from primary NASA-reported findings.`
    );
  }

  const cleanSnippet = stripLatex(aiReply).replace(/\s+/g, ' ').trim();
  const interpSummary =
    cleanSnippet.length > 340 ? `${cleanSnippet.slice(0, 340)}…` : cleanSnippet;

  return {
    originalQuestion,
    matchedInvestigations: matchedInvs.map(i => ({ id: i.id, title: i.title, link: i.link })),
    sourceDatasets: uploadedData
      ? [{ id: uploadedData.id, filename: uploadedData.filename, format: uploadedData.format }]
      : [],
    documentedConditions,
    supportingFindings:
      supportingFindings.length > 0
        ? supportingFindings
        : [
            {
              label: 'Indexed Match Status',
              value: 'No specific PSI accession in the local 24-investigation catalogue directly matched all query terms.',
              tag: 'Unverified',
            },
          ],
    calculationsPerformed,
    aiInterpretation: interpSummary,
    limitationsAndUncertainty: limitations,
  };
}
