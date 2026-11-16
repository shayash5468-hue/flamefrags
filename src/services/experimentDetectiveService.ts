import {
  DatasetColumnMeta,
  DetectiveTaskType,
  EpistemicTag,
  EvidenceChainItem,
  EvidenceChainRecord,
  ExperimentDetectiveResult,
  PsiFileRecord,
} from '../types';
import { PSI_INVESTIGATIONS_REGISTRY } from '../data/psiRegistry';

function inferUnitFromColumn(colName: string): string | 'unknown' {
  const c = colName.toLowerCase();
  if (c.endsWith('_c') || c.includes('temp_c') || c.includes('drop_c')) return '°C';
  if (c.endsWith('_k') || c.includes('temp_k')) return 'K';
  if (c.endsWith('_kpa') || c.includes('pressure_kpa')) return 'kPa';
  if (c.endsWith('_ms') || c.includes('velocity_ms') || c.includes('airflow')) return 'm/s';
  if (c.endsWith('_mms')) return 'mm/s';
  if (c.endsWith('_mm2')) return 'mm²';
  if (c.endsWith('_mm')) return 'mm';
  if (c.endsWith('_cm')) return 'cm';
  if (c.endsWith('_uw')) return 'µW';
  if (c.endsWith('_kwm2')) return 'kW/m²';
  if (c.endsWith('_kw')) return 'kW';
  if (c.endsWith('_w')) return 'W';
  if (c.endsWith('_ppm')) return 'ppm';
  if (c.endsWith('_hz')) return 'Hz';
  if (c.includes('decibel') || c.endsWith('_db')) return 'dB';
  if (c.endsWith('_sec') || c.endsWith('_s') || c.startsWith('time')) return 's';
  if (c.endsWith('_ms_time') || c.includes('time_ms')) return 'ms';
  if (c.includes('o2') || c.endsWith('_pct') || c.includes('percent')) return '%';
  if (c.endsWith('_sccm')) return 'sccm';
  return 'unknown';
}

export function profileDatasetColumns(dataset: PsiFileRecord): {
  rows: Record<string, string | number>[];
  columns: DatasetColumnMeta[];
} {
  const rows = dataset.allRows && dataset.allRows.length > 0 ? dataset.allRows : dataset.sampleRows;
  const columns: DatasetColumnMeta[] = dataset.columns.map(col => {
    const vals = rows.map(r => r[col]);
    const nonNull = vals.filter(v => v !== undefined && v !== null && v !== '' && String(v).toLowerCase() !== 'nan');
    const numericCount = nonNull.filter(v => typeof v === 'number' && !Number.isNaN(v)).length;
    const boolCount = nonNull.filter(v => {
      const s = String(v).toLowerCase();
      return s === 'true' || s === 'false' || s === 'yes' || s === 'no';
    }).length;

    const type: DatasetColumnMeta['type'] =
      nonNull.length > 0 && numericCount === nonNull.length
        ? 'numeric'
        : nonNull.length > 0 && boolCount === nonNull.length
        ? 'boolean'
        : 'categorical';

    return {
      name: col,
      type,
      unit: inferUnitFromColumn(col),
      nonNullCount: nonNull.length,
      missingCount: rows.length - nonNull.length,
    };
  });

  return { rows, columns };
}

function calcStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const median = n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  return {
    n,
    min: sorted[0],
    max: sorted[n - 1],
    mean,
    median,
    stdDev,
    q1,
    q3,
    iqr,
  };
}

function pearsonCorrelation(xs: number[], ys: number[]): { r: number; slope: number; intercept: number } | null {
  if (xs.length < 3 || xs.length !== ys.length) return null;
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const denom = Math.sqrt(denX * denY);
  if (denom === 0) return null;
  const r = num / denom;
  const slope = denX === 0 ? 0 : num / denX;
  const intercept = meanY - slope * meanX;
  return { r, slope, intercept };
}

function matchInvestigationForDataset(dataset: PsiFileRecord) {
  if (dataset.investigationId) {
    const exact = PSI_INVESTIGATIONS_REGISTRY.find(i => i.id === dataset.investigationId);
    if (exact) return [exact];
  }
  const lower = `${dataset.mission} ${dataset.investigationName}`.toLowerCase();
  const matches = PSI_INVESTIGATIONS_REGISTRY.filter(
    i => lower.includes(i.acronym.toLowerCase()) || lower.includes(i.id.toLowerCase())
  );
  return matches.slice(0, 2);
}

function findColumnByPattern(columns: DatasetColumnMeta[], patterns: string[], numericOnly = true): DatasetColumnMeta | undefined {
  return columns.find(c => {
    if (numericOnly && c.type !== 'numeric') return false;
    const n = c.name.toLowerCase();
    return patterns.some(p => n.includes(p));
  });
}

export function runExperimentDetective(params: {
  dataset: PsiFileRecord;
  taskType: DetectiveTaskType;
  secondaryDataset?: PsiFileRecord | null;
  xColumn?: string;
  yColumn?: string;
  customPrompt?: string;
}): ExperimentDetectiveResult {
  const { dataset, taskType, secondaryDataset, xColumn, yColumn, customPrompt } = params;
  const { rows, columns } = profileDatasetColumns(dataset);
  const matchedInvs = matchInvestigationForDataset(dataset);

  const isPartialSlice = dataset.qualityReport.totalRows > rows.length;
  const baseLimitations: string[] = [
    isPartialSlice
      ? `Analysis ran on ${rows.length} locally loaded rows out of ${dataset.qualityReport.totalRows} declared PSI repository rows; full-campaign distribution could differ.`
      : `Analysis ran on all ${rows.length} loaded rows in ${dataset.filename}.`,
  ];

  const baseConditions: EvidenceChainItem[] = [
    { label: 'Dataset File', value: `${dataset.filename} (.${dataset.format})`, tag: 'Measured Data', datasetId: dataset.id },
    { label: 'Fuel Specimen', value: dataset.fuelType || 'unknown', tag: dataset.investigationId ? 'NASA-Reported' : 'Measured Data' },
    { label: 'Gravity Condition', value: dataset.gravityCondition || 'unknown', tag: dataset.investigationId ? 'NASA-Reported' : 'Measured Data' },
    { label: 'Declared O₂ / Flow', value: `O₂: ${dataset.oxygenRange || 'unknown'} | Flow: ${dataset.flowRange || 'unknown'}`, tag: dataset.investigationId ? 'NASA-Reported' : 'Unverified' },
  ];

  const mkEvidence = (
    questionLabel: string,
    calculations: { label: string; value: string; detail?: string; tag: EpistemicTag }[],
    interpretation: string,
    limitations: string[]
  ): EvidenceChainRecord => ({
    originalQuestion: customPrompt || questionLabel,
    matchedInvestigations: matchedInvs.map(i => ({ id: i.id, title: i.title, link: i.link })),
    sourceDatasets: [
      { id: dataset.id, filename: dataset.filename, format: dataset.format },
      ...(secondaryDataset ? [{ id: secondaryDataset.id, filename: secondaryDataset.filename, format: secondaryDataset.format }] : []),
    ],
    documentedConditions: baseConditions,
    supportingFindings: matchedInvs.map(i => ({
      label: `${i.id} Documented Finding`,
      value: i.keyFinding,
      tag: 'NASA-Reported',
      investigationId: i.id,
    })),
    calculationsPerformed: calculations.map(c => ({
      label: c.label,
      value: c.detail ? `${c.value} (${c.detail})` : c.value,
      tag: c.tag,
      datasetId: dataset.id,
    })),
    aiInterpretation: interpretation,
    limitationsAndUncertainty: limitations,
  });

  // TASK 1: HIGHEST MEASURED FLAME TEMPERATURE
  if (taskType === 'highest-temperature') {
    const tempCol = columns.find(
      c => c.type === 'numeric' && (c.name.toLowerCase().includes('temp') || c.unit === '°C' || c.unit === 'K')
    );

    if (!tempCol || tempCol.unit === 'unknown') {
      const msg = !tempCol
        ? `No verified temperature column was detected in "${dataset.filename}". Detected columns: [${columns.map(c => c.name).join(', ')}].`
        : `Column "${tempCol.name}" lacks an explicit temperature unit (°C or K) in metadata; refusing to assume temperature units.`;
      const lim = [...baseLimitations, 'Calculation aborted cleanly because temperature metadata/units could not be verified.'];
      return {
        taskType,
        taskTitle: 'Peak Measured Temperature Audit',
        feasible: false,
        datasetAnalyzed: { id: dataset.id, filename: dataset.filename, rowsInspected: rows.length, totalDeclaredRows: dataset.qualityReport.totalRows },
        columnsInspected: columns,
        summaryHeadline: msg,
        calculations: [{ label: 'Temperature Column Check', value: 'Unavailable / Unverified', tag: 'Unverified' }],
        findings: [msg],
        limitations: lim,
        evidenceChain: mkEvidence('Find runs with highest measured flame temperature', [], msg, lim),
      };
    }

    const validRows = rows.filter(r => typeof r[tempCol.name] === 'number');
    const temps = validRows.map(r => r[tempCol.name] as number);
    const stats = calcStats(temps);
    const xCol = columns.find(c => c.type === 'numeric' && c.name !== tempCol.name) || columns[0];
    const sortedDesc = [...validRows].sort((a, b) => (b[tempCol.name] as number) - (a[tempCol.name] as number));
    const peakRow = sortedDesc[0];
    const unit = tempCol.unit;

    const calcs = [
      { label: `Peak (${tempCol.name})`, value: `${stats.max.toFixed(1)} ${unit}`, detail: `Row context: ${xCol.name}=${peakRow[xCol.name]}`, tag: 'Measured Data' as const },
      { label: `Mean ± StdDev`, value: `${stats.mean.toFixed(1)} ± ${stats.stdDev.toFixed(1)} ${unit}`, tag: 'Derived Calculation' as const },
      { label: `Median / Min`, value: `${stats.median.toFixed(1)} ${unit} / ${stats.min.toFixed(1)} ${unit}`, tag: 'Derived Calculation' as const },
    ];

    const interp = `Across ${stats.n} inspected rows in ${dataset.filename}, "${tempCol.name}" (${unit}) spans ${stats.min.toFixed(1)}–${stats.max.toFixed(1)} ${unit}, peaking at ${stats.max.toFixed(1)} ${unit} when ${xCol.name}=${peakRow[xCol.name]}.`;

    return {
      taskType,
      taskTitle: 'Peak Measured Temperature Audit',
      feasible: true,
      datasetAnalyzed: { id: dataset.id, filename: dataset.filename, rowsInspected: rows.length, totalDeclaredRows: dataset.qualityReport.totalRows },
      columnsInspected: columns,
      summaryHeadline: `Peak measured ${tempCol.name}: ${stats.max.toFixed(1)} ${unit} (mean ${stats.mean.toFixed(1)} ${unit}, n=${stats.n})`,
      calculations: calcs,
      findings: [
        `Peak row: ${tempCol.name} = ${peakRow[tempCol.name]} ${unit} (${Object.entries(peakRow).filter(([k]) => k !== tempCol.name).slice(0, 3).map(([k, v]) => `${k}=${v}`).join(', ')}).`,
        `Temperature spread (Max − Min): ${(stats.max - stats.min).toFixed(1)} ${unit} across inspected runs.`,
        tempCol.name.includes('drop') ? 'Note: Metric reflects droplet thermocouple reading; confirm sensor placement relative to flame sheet.' : 'Note: Verify gas-phase vs surface thermocouple distinction before cross-dataset comparison.',
      ],
      chart: {
        type: 'line',
        title: `${tempCol.name} (${unit}) vs ${xCol.name}`,
        xLabel: xCol.name,
        yLabel: `${tempCol.name} (${unit})`,
        points: validRows.map(r => ({
          x: r[xCol.name],
          y: r[tempCol.name] as number,
          highlight: (r[tempCol.name] as number) === stats.max,
        })),
      },
      limitations: [...baseLimitations, 'Peak temperature reflects thermocouple/sensor location and does not by itself verify adiabatic flame equilibrium.'],
      evidenceChain: mkEvidence('Find runs with the highest measured flame temperature', calcs, interp, baseLimitations),
    };
  }

  // TASK 2: AIRFLOW PROGRESSION
  if (taskType === 'airflow-trend') {
    const flowCol = findColumnByPattern(columns, ['flow', 'velocity', 'airflow']);
    const targetCol =
      (yColumn && columns.find(c => c.name === yColumn && c.type === 'numeric' && c.name !== flowCol?.name)) ||
      findColumnByPattern(columns, ['spread', 'temp', 'flame', 'heat', 'co_ppm']);

    if (!flowCol || !targetCol) {
      const msg = !flowCol
        ? `Cannot analyze airflow dependency: "${dataset.filename}" has no numeric forced-airflow velocity column (declared flow metadata: ${dataset.flowRange || 'unknown'}).`
        : `No suitable numeric dependent measurement column found alongside "${flowCol.name}".`;
      const lim = [...baseLimitations, 'Airflow trend requires paired numeric flow-velocity and response columns in the same dataset.'];
      return {
        taskType,
        taskTitle: 'Airflow Sensitivity Analysis',
        feasible: false,
        datasetAnalyzed: { id: dataset.id, filename: dataset.filename, rowsInspected: rows.length, totalDeclaredRows: dataset.qualityReport.totalRows },
        columnsInspected: columns,
        summaryHeadline: msg,
        calculations: [{ label: 'Airflow Column Check', value: flowCol ? flowCol.name : 'Not present in table', tag: 'Unverified' }],
        findings: [msg],
        limitations: lim,
        evidenceChain: mkEvidence('Identify how a measurement changes as airflow increases', [], msg, lim),
      };
    }

    const sorted = [...rows]
      .filter(r => typeof r[flowCol.name] === 'number' && typeof r[targetCol.name] === 'number')
      .sort((a, b) => (a[flowCol.name] as number) - (b[flowCol.name] as number));

    const xs = sorted.map(r => r[flowCol.name] as number);
    const ys = sorted.map(r => r[targetCol.name] as number);
    const statsY = calcStats(ys);
    const corr = pearsonCorrelation(xs, ys);
    const peakRow = sorted.reduce((best, r) => ((r[targetCol.name] as number) > (best[targetCol.name] as number) ? r : best), sorted[0]);
    const isNonMonotonic = (peakRow[flowCol.name] as number) > xs[0] && (peakRow[flowCol.name] as number) < xs[xs.length - 1];

    const calcs = [
      { label: `Peak ${targetCol.name}`, value: `${statsY.max} ${targetCol.unit !== 'unknown' ? targetCol.unit : ''}`, detail: `at ${flowCol.name} = ${peakRow[flowCol.name]} ${flowCol.unit}`, tag: 'Measured Data' as const },
      { label: 'Trend Pattern', value: isNonMonotonic ? 'Non-monotonic (peaks at intermediate flow)' : corr && corr.r > 0 ? 'Positive linear tendency' : 'Negative linear tendency', tag: 'Derived Calculation' as const },
      ...(corr ? [{ label: 'Pearson r (linear fit)', value: corr.r.toFixed(3), detail: 'Note: non-linear peaks reduce linear |r|', tag: 'Derived Calculation' as const }] : []),
    ];

    const interp = isNonMonotonic
      ? `In ${dataset.filename}, "${targetCol.name}" exhibits a clear non-monotonic response: rising from ${ys[0]} at ${xs[0]} ${flowCol.unit} to a maximum of ${peakRow[targetCol.name]} at ${peakRow[flowCol.name]} ${flowCol.unit}, then declining to ${ys[ys.length - 1]} at ${xs[xs.length - 1]} ${flowCol.unit}. Correlation/shape does not by itself prove mechanism without kinetic control checks.`
      : `Across ${sorted.length} flow points (${xs[0]}–${xs[xs.length - 1]} ${flowCol.unit}), "${targetCol.name}" ranges from ${statsY.min} to ${statsY.max} (Pearson r = ${corr ? corr.r.toFixed(3) : 'N/A'}). Correlation does not establish causation.`;

    return {
      taskType,
      taskTitle: 'Airflow Sensitivity Analysis',
      feasible: true,
      datasetAnalyzed: { id: dataset.id, filename: dataset.filename, rowsInspected: rows.length, totalDeclaredRows: dataset.qualityReport.totalRows },
      columnsInspected: columns,
      summaryHeadline: `${targetCol.name} peaks at ${peakRow[targetCol.name]} when ${flowCol.name}=${peakRow[flowCol.name]} ${flowCol.unit}`,
      calculations: calcs,
      findings: [
        `Observed domain: ${flowCol.name} from ${xs[0]} to ${xs[xs.length - 1]} ${flowCol.unit}.`,
        isNonMonotonic
          ? 'Non-monotonic dome observed: intermediate velocity yields higher values than both quiescent (0) and high-velocity limits.'
          : `Linear trend correlation r = ${corr ? corr.r.toFixed(3) : 'insufficient variance'}.`,
      ],
      chart: {
        type: 'line',
        title: `${targetCol.name} vs Increasing ${flowCol.name}`,
        xLabel: `${flowCol.name} (${flowCol.unit})`,
        yLabel: targetCol.name,
        points: sorted.map(r => ({
          x: r[flowCol.name] as number,
          y: r[targetCol.name] as number,
          highlight: r === peakRow,
        })),
      },
      limitations: [...baseLimitations, 'Observed pattern may be non-linear; linear Pearson r should not be over-interpreted as causation.'],
      evidenceChain: mkEvidence('Identify how a measurement changes as airflow increases', calcs, interp, baseLimitations),
    };
  }

  // TASK 3: OXYGEN CONCENTRATION COMPARISON
  if (taskType === 'oxygen-comparison') {
    const o2Col = findColumnByPattern(columns, ['o2', 'oxygen']);
    if (!o2Col) {
      const msg = `Cannot compare numeric O₂ runs: "${dataset.filename}" does not contain a per-row oxygen column (only header metadata: "${dataset.oxygenRange}").`;
      const lim = [...baseLimitations, 'Per-run O₂ comparison requires a numeric O₂ concentration column across rows.'];
      return {
        taskType,
        taskTitle: 'Oxygen Concentration Comparison',
        feasible: false,
        datasetAnalyzed: { id: dataset.id, filename: dataset.filename, rowsInspected: rows.length, totalDeclaredRows: dataset.qualityReport.totalRows },
        columnsInspected: columns,
        summaryHeadline: msg,
        calculations: [{ label: 'O₂ Column Status', value: `Not in rows (Metadata: ${dataset.oxygenRange})`, tag: 'Unverified' }],
        findings: [msg],
        limitations: lim,
        evidenceChain: mkEvidence('Compare experimental runs with different oxygen concentrations', [], msg, lim),
      };
    }

    const o2Vals = rows.map(r => r[o2Col.name]).filter((v): v is number => typeof v === 'number');
    const uniqueO2 = Array.from(new Set(o2Vals));
    if (uniqueO2.length < 2) {
      const msg = `All ${o2Vals.length} inspected rows in "${dataset.filename}" share constant O₂ = ${uniqueO2[0] ?? 'N/A'}%. A multi-level O₂ comparison requires >= 2 distinct O₂ levels (or comparing two datasets).`;
      const lim = [...baseLimitations, 'Single constant O₂ level in inspected rows precludes intra-dataset O₂ contrast.'];
      return {
        taskType,
        taskTitle: 'Oxygen Concentration Comparison',
        feasible: false,
        datasetAnalyzed: { id: dataset.id, filename: dataset.filename, rowsInspected: rows.length, totalDeclaredRows: dataset.qualityReport.totalRows },
        columnsInspected: columns,
        summaryHeadline: msg,
        calculations: [{ label: 'Unique O₂ Levels Found', value: `${uniqueO2.length} (${uniqueO2[0]}%)`, tag: 'Measured Data' }],
        findings: [msg],
        limitations: lim,
        evidenceChain: mkEvidence('Compare experimental runs with different oxygen concentrations', [], msg, lim),
      };
    }

    const targetCol =
      (yColumn && columns.find(c => c.name === yColumn && c.type === 'numeric' && c.name !== o2Col.name)) ||
      findColumnByPattern(columns, ['temp', 'co_ppm', 'diameter', 'spread']) ||
      columns.find(c => c.type === 'numeric' && c.name !== o2Col.name && !c.name.includes('time'));

    if (!targetCol) {
      const msg = 'No secondary numeric outcome variable available to compare against O₂.';
      return {
        taskType,
        taskTitle: 'Oxygen Concentration Comparison',
        feasible: false,
        datasetAnalyzed: { id: dataset.id, filename: dataset.filename, rowsInspected: rows.length, totalDeclaredRows: dataset.qualityReport.totalRows },
        columnsInspected: columns,
        summaryHeadline: msg,
        calculations: [],
        findings: [msg],
        limitations: baseLimitations,
        evidenceChain: mkEvidence('Compare experimental runs with different oxygen concentrations', [], msg, baseLimitations),
      };
    }

    const valid = rows.filter(r => typeof r[o2Col.name] === 'number' && typeof r[targetCol.name] === 'number');
    const o2Stats = calcStats(o2Vals);
    const midpoint = o2Stats.median;
    const lowGroup = valid.filter(r => (r[o2Col.name] as number) <= midpoint);
    const highGroup = valid.filter(r => (r[o2Col.name] as number) > midpoint);

    const lowMean = lowGroup.reduce((a, r) => a + (r[targetCol.name] as number), 0) / Math.max(1, lowGroup.length);
    const highMean = highGroup.reduce((a, r) => a + (r[targetCol.name] as number), 0) / Math.max(1, highGroup.length);
    const corr = pearsonCorrelation(
      valid.map(r => r[o2Col.name] as number),
      valid.map(r => r[targetCol.name] as number)
    );

    const calcs = [
      { label: 'O₂ Span', value: `${o2Stats.min.toFixed(1)}% – ${o2Stats.max.toFixed(1)}% (${uniqueO2.length} levels)`, tag: 'Measured Data' as const },
      { label: `Lower O₂ Group (≤${midpoint.toFixed(1)}%)`, value: `Mean ${targetCol.name} = ${lowMean.toFixed(2)} (n=${lowGroup.length})`, tag: 'Derived Calculation' as const },
      { label: `Higher O₂ Group (>${midpoint.toFixed(1)}%)`, value: `Mean ${targetCol.name} = ${highMean.toFixed(2)} (n=${highGroup.length})`, tag: 'Derived Calculation' as const },
      ...(corr ? [{ label: 'Pearson r (O₂ vs metric)', value: corr.r.toFixed(3), detail: 'Not causal', tag: 'Derived Calculation' as const }] : []),
    ];

    const interp = `In ${dataset.filename}, O₂ varies from ${o2Stats.min.toFixed(1)}% to ${o2Stats.max.toFixed(1)}%. Grouping around median ${midpoint.toFixed(1)}% O₂ yields mean ${targetCol.name} = ${lowMean.toFixed(2)} (lower O₂) vs ${highMean.toFixed(2)} (higher O₂). Note that elapsed time or fuel depletion may confound time-series O₂ shifts.`;

    return {
      taskType,
      taskTitle: 'Oxygen Concentration Comparison',
      feasible: true,
      datasetAnalyzed: { id: dataset.id, filename: dataset.filename, rowsInspected: rows.length, totalDeclaredRows: dataset.qualityReport.totalRows },
      columnsInspected: columns,
      summaryHeadline: `Compared ${uniqueO2.length} O₂ levels (${o2Stats.min.toFixed(1)}%–${o2Stats.max.toFixed(1)}%) against ${targetCol.name}`,
      calculations: calcs,
      findings: [
        `Mean ${targetCol.name} shifts by ${(highMean - lowMean >= 0 ? '+' : '')}${(highMean - lowMean).toFixed(2)} ${targetCol.unit !== 'unknown' ? targetCol.unit : ''} between lower and higher O₂ bins.`,
        `Confounding check: Check whether O₂ variation reflects controlled test setpoints vs sealed-chamber depletion over time.`,
      ],
      chart: {
        type: 'scatter',
        title: `${targetCol.name} vs ${o2Col.name} (%)`,
        xLabel: `${o2Col.name} (%)`,
        yLabel: targetCol.name,
        points: valid.map(r => ({ x: r[o2Col.name] as number, y: r[targetCol.name] as number })),
        regression: corr ? { ...corr } : undefined,
      },
      limitations: [...baseLimitations, 'Covariation with O₂ in time-series runs can reflect simultaneous oxygen consumption and thermal buildup rather than pure O₂ sensitivity.'],
      evidenceChain: mkEvidence('Compare experimental runs with different oxygen concentrations', calcs, interp, baseLimitations),
    };
  }

  // TASK 4: OUTLIER DETECTION (IQR 1.5x)
  if (taskType === 'outlier-detection') {
    const numericCols = columns.filter(c => c.type === 'numeric');
    const outlierEvents: { col: string; rowIdx: number; value: number; lower: number; upper: number; unit: string }[] = [];
    const colChecks: { label: string; value: string; tag: 'Derived Calculation' }[] = [];

    for (const c of numericCols) {
      const vals = rows.map(r => r[c.name]).filter((v): v is number => typeof v === 'number');
      if (vals.length < 4) continue;
      const s = calcStats(vals);
      const lower = s.q1 - 1.5 * s.iqr;
      const upper = s.q3 + 1.5 * s.iqr;
      const found: number[] = [];
      rows.forEach((r, idx) => {
        const v = r[c.name];
        if (typeof v === 'number' && (v < lower || v > upper)) {
          outlierEvents.push({ col: c.name, rowIdx: idx + 1, value: v, lower, upper, unit: c.unit });
          found.push(v);
        }
      });
      colChecks.push({
        label: `${c.name} IQR bounds`,
        value: `[${lower.toFixed(2)}, ${upper.toFixed(2)}] → ${found.length} outlier(s)`,
        tag: 'Derived Calculation',
      });
    }

    const firstNum = numericCols[0];
    const interp =
      outlierEvents.length > 0
        ? `1.5×IQR anomaly scan across ${numericCols.length} numeric columns flagged ${outlierEvents.length} observation(s) outside typical quartile bounds: ${outlierEvents.slice(0, 3).map(o => `${o.col}=${o.value} (row ${o.rowIdx})`).join('; ')}. Unusual points may represent genuine regime transitions (ignition, quench, cool-flame drop) rather than sensor error.`
        : `1.5×IQR anomaly scan across ${numericCols.length} numeric columns found 0 statistical outliers outside Q1−1.5·IQR and Q3+1.5·IQR bounds in the ${rows.length} inspected rows.`;

    return {
      taskType,
      taskTitle: 'IQR Statistical Outlier & Anomaly Scan',
      feasible: numericCols.length > 0,
      datasetAnalyzed: { id: dataset.id, filename: dataset.filename, rowsInspected: rows.length, totalDeclaredRows: dataset.qualityReport.totalRows },
      columnsInspected: columns,
      summaryHeadline: `${outlierEvents.length} statistical outlier(s) flagged across ${numericCols.length} numeric columns (1.5×IQR test)`,
      calculations: colChecks,
      findings:
        outlierEvents.length > 0
          ? outlierEvents.map(o => `Row #${o.rowIdx}: ${o.col} = ${o.value} ${o.unit !== 'unknown' ? o.unit : ''} (outside [${o.lower.toFixed(2)}, ${o.upper.toFixed(2)}]).`)
          : ['No numeric values exceeded 1.5×IQR thresholds in the loaded sample slice.'],
      chart: firstNum
        ? {
            type: 'bar',
            title: `${firstNum.name} distribution & flagged anomalies`,
            xLabel: 'Row #',
            yLabel: firstNum.name,
            points: rows
              .filter(r => typeof r[firstNum.name] === 'number')
              .map((r, i) => ({
                x: `R${i + 1}`,
                y: r[firstNum.name] as number,
                highlight: outlierEvents.some(o => o.col === firstNum.name && o.rowIdx === i + 1),
              })),
          }
        : undefined,
      limitations: [...baseLimitations, 'With small sample counts (n < 15), quartile outlier tests have coarse resolution and physical step-transitions (e.g., ignition/quench) can appear as statistical anomalies.'],
      evidenceChain: mkEvidence('Find unusual measurements', colChecks, interp, baseLimitations),
    };
  }

  // TASK 5: MISSING OR INCONSISTENT DATA AUDIT
  if (taskType === 'missing-inconsistent') {
    const missingTotal = columns.reduce((acc, c) => acc + c.missingCount, 0);
    const unknownUnitCols = columns.filter(c => c.type === 'numeric' && c.unit === 'unknown');
    const rowSignatures = rows.map(r => JSON.stringify(r));
    const dupCount = rowSignatures.length - new Set(rowSignatures).size;

    const calcs = [
      { label: 'Missing / Null Cells (Inspected)', value: `${missingTotal} across ${rows.length * columns.length} cells`, tag: 'Derived Calculation' as const },
      { label: 'Duplicate Inspected Rows', value: `${dupCount}`, tag: 'Derived Calculation' as const },
      { label: 'Numeric Cols Missing Explicit Units', value: unknownUnitCols.length > 0 ? unknownUnitCols.map(c => c.name).join(', ') : 'None (0)', tag: 'Derived Calculation' as const },
    ];

    const interp = `Integrity audit of ${dataset.filename}: ${missingTotal} missing cells and ${dupCount} exact duplicate rows detected in ${rows.length} inspected rows. ${unknownUnitCols.length > 0 ? `Warning: ${unknownUnitCols.length} numeric column(s) lack explicit unit suffixes (${unknownUnitCols.map(c => c.name).join(', ')}).` : 'All numeric column headers carry identifiable physical unit suffixes.'}`;

    return {
      taskType,
      taskTitle: 'Data Quality & Unit Consistency Audit',
      feasible: true,
      datasetAnalyzed: { id: dataset.id, filename: dataset.filename, rowsInspected: rows.length, totalDeclaredRows: dataset.qualityReport.totalRows },
      columnsInspected: columns,
      summaryHeadline: `${missingTotal} missing cells · ${dupCount} duplicates · ${unknownUnitCols.length} ambiguous-unit columns`,
      calculations: calcs,
      findings: columns.map(
        c => `Column "${c.name}" (${c.type}, unit=${c.unit}): ${c.nonNullCount} valid, ${c.missingCount} missing.`
      ),
      chart: {
        type: 'bar',
        title: 'Valid Row Count per Column',
        xLabel: 'Column',
        yLabel: 'Valid Cells',
        points: columns.map(c => ({ x: c.name.slice(0, 12), y: c.nonNullCount, highlight: c.missingCount > 0 })),
      },
      limitations: [...baseLimitations, 'Header-suffix unit checking cannot detect unannounced unit conversions inside raw sensor logs without accompanying calibration sheets.'],
      evidenceChain: mkEvidence('Identify missing or inconsistent data', calcs, interp, baseLimitations),
    };
  }

  // TASK 6: COMPARE TWO DATASETS
  if (taskType === 'compare-datasets') {
    if (!secondaryDataset) {
      const msg = 'Select a second dataset in Experiment Detective to perform a two-dataset comparison.';
      return {
        taskType,
        taskTitle: 'Dual-Dataset Statistical Comparison',
        feasible: false,
        datasetAnalyzed: { id: dataset.id, filename: dataset.filename, rowsInspected: rows.length, totalDeclaredRows: dataset.qualityReport.totalRows },
        columnsInspected: columns,
        summaryHeadline: msg,
        calculations: [],
        findings: [msg],
        limitations: baseLimitations,
        evidenceChain: mkEvidence('Compare two experimental datasets', [], msg, baseLimitations),
      };
    }

    const profB = profileDatasetColumns(secondaryDataset);
    const tempA = columns.find(c => c.type === 'numeric' && (c.name.includes('temp') || c.unit === '°C' || c.unit === 'K'));
    const tempB = profB.columns.find(c => c.type === 'numeric' && (c.name.includes('temp') || c.unit === '°C' || c.unit === 'K'));

    const tempNote =
      tempA && tempB
        ? tempA.unit !== tempB.unit
          ? `Unit mismatch flagged (${tempA.unit} in A vs ${tempB.unit} in B) — values converted to °C where applicable for comparison.`
          : `Both datasets record temperature in ${tempA.unit}.`
        : 'Temperature is not directly comparable across both files (absent in one or both).';

    const toC = (val: number, unit: string) => (unit === 'K' ? val - 273.15 : val);
    const statsTempA = tempA ? calcStats(rows.map(r => r[tempA.name]).filter((v): v is number => typeof v === 'number').map(v => toC(v, tempA.unit))) : null;
    const statsTempB = tempB ? calcStats(profB.rows.map(r => r[tempB.name]).filter((v): v is number => typeof v === 'number').map(v => toC(v, tempB.unit))) : null;

    const calcs = [
      { label: 'Rows Inspected (A vs B)', value: `${rows.length} (of ${dataset.qualityReport.totalRows}) vs ${profB.rows.length} (of ${secondaryDataset.qualityReport.totalRows})`, tag: 'Measured Data' as const },
      { label: 'Fuel Contrast', value: `${dataset.fuelType} vs ${secondaryDataset.fuelType}`, tag: 'NASA-Reported' as const },
      ...(statsTempA && statsTempB
        ? [{
            label: 'Comparable Mean Temp (°C)',
            value: `A: ${statsTempA.mean.toFixed(1)}°C vs B: ${statsTempB.mean.toFixed(1)}°C`,
            detail: `Max A=${statsTempA.max.toFixed(1)}°C, Max B=${statsTempB.max.toFixed(1)}°C`,
            tag: 'Derived Calculation' as const,
          }]
        : []),
    ];

    const interp = `Comparing "${dataset.filename}" (${dataset.mission}) against "${secondaryDataset.filename}" (${secondaryDataset.mission}): ${tempNote} Column schemas share ${columns.filter(ca => profB.columns.some(cb => cb.name === ca.name)).length} exact header match(es).`;

    return {
      taskType,
      taskTitle: 'Dual-Dataset Statistical Comparison',
      feasible: true,
      datasetAnalyzed: { id: dataset.id, filename: dataset.filename, rowsInspected: rows.length, totalDeclaredRows: dataset.qualityReport.totalRows },
      secondaryDataset: { id: secondaryDataset.id, filename: secondaryDataset.filename, rowsInspected: profB.rows.length },
      columnsInspected: columns,
      summaryHeadline: `${dataset.mission} (${dataset.filename}) vs ${secondaryDataset.mission} (${secondaryDataset.filename})`,
      calculations: calcs,
      findings: [
        tempNote,
        `O₂ metadata: A="${dataset.oxygenRange}" vs B="${secondaryDataset.oxygenRange}".`,
        `Airflow metadata: A="${dataset.flowRange}" vs B="${secondaryDataset.flowRange}".`,
      ],
      chart: statsTempA && statsTempB
        ? {
            type: 'bar',
            title: 'Mean & Peak Temperature Comparison (°C)',
            xLabel: 'Metric',
            yLabel: 'Temperature (°C)',
            points: [
              { x: 'A Mean °C', y: +statsTempA.mean.toFixed(1) },
              { x: 'A Peak °C', y: +statsTempA.max.toFixed(1), highlight: true },
              { x: 'B Mean °C', y: +statsTempB.mean.toFixed(1) },
              { x: 'B Peak °C', y: +statsTempB.max.toFixed(1), highlight: true },
            ],
          }
        : undefined,
      limitations: [...baseLimitations, 'Cross-experiment differences reflect fuel phase, hardware geometry, and sensor placement in addition to boundary gases.'],
      evidenceChain: mkEvidence(`Compare ${dataset.filename} and ${secondaryDataset.filename}`, calcs, interp, baseLimitations),
    };
  }

  // TASK 7 / CUSTOM: VARIABLE RELATIONSHIP (SCATTER + PEARSON r)
  const numericCols = columns.filter(c => c.type === 'numeric');
  if (numericCols.length < 2) {
    const msg = `Dataset "${dataset.filename}" contains fewer than 2 numeric columns (${numericCols.length} detected); cannot run bivariate relationship analysis.`;
    return {
      taskType,
      taskTitle: 'Bivariate Relationship Analysis',
      feasible: false,
      datasetAnalyzed: { id: dataset.id, filename: dataset.filename, rowsInspected: rows.length, totalDeclaredRows: dataset.qualityReport.totalRows },
      columnsInspected: columns,
      summaryHeadline: msg,
      calculations: [],
      findings: [msg],
      limitations: baseLimitations,
      evidenceChain: mkEvidence('Investigate relationships between measured variables', [], msg, baseLimitations),
    };
  }

  const colX = (xColumn && numericCols.find(c => c.name === xColumn)) || numericCols[0];
  const colY = (yColumn && numericCols.find(c => c.name === yColumn && c.name !== colX.name)) || numericCols.find(c => c.name !== colX.name) || numericCols[1];

  const paired = rows.filter(r => typeof r[colX.name] === 'number' && typeof r[colY.name] === 'number');
  const xs = paired.map(r => r[colX.name] as number);
  const ys = paired.map(r => r[colY.name] as number);
  const statsX = calcStats(xs);
  const statsY = calcStats(ys);
  const corr = pearsonCorrelation(xs, ys);

  const calcs = [
    { label: `${colX.name} (${colX.unit})`, value: `${statsX.min} – ${statsX.max} (mean ${statsX.mean.toFixed(2)})`, tag: 'Derived Calculation' as const },
    { label: `${colY.name} (${colY.unit})`, value: `${statsY.min} – ${statsY.max} (mean ${statsY.mean.toFixed(2)})`, tag: 'Derived Calculation' as const },
    ...(corr
      ? [
          { label: 'Pearson Correlation r', value: corr.r.toFixed(3), detail: `R² = ${(corr.r * corr.r).toFixed(3)} (does NOT imply causation)`, tag: 'Derived Calculation' as const },
          { label: 'Linear Slope', value: `${corr.slope.toFixed(3)} ${colY.unit}/${colX.unit}`, tag: 'Derived Calculation' as const },
        ]
      : []),
  ];

  const strength = !corr ? 'uncalculable' : Math.abs(corr.r) > 0.8 ? 'strong' : Math.abs(corr.r) > 0.45 ? 'moderate' : 'weak';
  const dir = !corr ? '' : corr.r >= 0 ? 'positive' : 'negative';
  const interp = `Bivariate inspection of "${colX.name}" vs "${colY.name}" across ${paired.length} paired rows shows a ${strength} ${dir} linear association (r = ${corr ? corr.r.toFixed(3) : 'N/A'}, R² = ${corr ? (corr.r * corr.r).toFixed(3) : 'N/A'}). Correlation does not establish causation; shared experimental progression (e.g., time or depletion) can drive covariation.`;

  return {
    taskType,
    taskTitle: `Relationship: ${colX.name} vs ${colY.name}`,
    feasible: true,
    datasetAnalyzed: { id: dataset.id, filename: dataset.filename, rowsInspected: rows.length, totalDeclaredRows: dataset.qualityReport.totalRows },
    columnsInspected: columns,
    summaryHeadline: `Pearson r = ${corr ? corr.r.toFixed(3) : 'N/A'} (${strength} ${dir}) between ${colX.name} and ${colY.name}`,
    calculations: calcs,
    findings: [
      `Sample size n = ${paired.length} valid numeric pairs.`,
      `Statistical caution: Correlation (r) measures linear co-variation only and never proves physical causation.`,
    ],
    chart: {
      type: 'scatter',
      title: `${colY.name} vs ${colX.name}`,
      xLabel: `${colX.name} (${colX.unit})`,
      yLabel: `${colY.name} (${colY.unit})`,
      points: paired.map(r => ({ x: r[colX.name] as number, y: r[colY.name] as number })),
      regression: corr ? { ...corr } : undefined,
    },
    limitations: [...baseLimitations, 'Linear Pearson correlation may miss non-monotonic peaks (such as Low-Flow Extinction Paradox curves) and never proves causation.'],
    evidenceChain: mkEvidence(`Investigate relationship between ${colX.name} and ${colY.name}`, calcs, interp, baseLimitations),
  };
}
