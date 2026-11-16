import {
  CombustionDnaAttribute,
  CombustionDnaComparison,
  CombustionDnaProfile,
  FuelCategory,
  GravityRegime,
  PsiFileRecord,
  PsiInvestigationRecord,
} from '../types';
import { PSI_INVESTIGATIONS_REGISTRY } from '../data/psiRegistry';

function inferHardwareFamily(platform: string): string {
  const p = platform.toLowerCase();
  if (p.includes('cir') && p.includes('acme')) return 'ISS CIR / ACME';
  if (p.includes('mdca')) return 'ISS CIR / MDCA';
  if (p.includes('sofie')) return 'ISS CIR / SoFIE';
  if (p.includes('cir')) return 'ISS CIR';
  if (p.includes('msg')) return 'ISS MSG';
  if (p.includes('cygnus')) return 'Cygnus Cargo Vehicle';
  if (p.includes('cfd')) return 'CFD Synthesis (FLEX Data)';
  if (p.includes('acoustic')) return 'Lab Acoustic Chamber';
  return platform || 'unknown';
}

function inferObjectiveDomain(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('cool flame') || t.includes('s-curve') || t.includes('distillation')) return 'Cool Flames & Low-T Kinetics';
  if (t.includes('suppress') || t.includes('depressuriz') || t.includes('acoustic') || t.includes('electric')) return 'Extinguishment & Suppression';
  if (t.includes('soot') || t.includes('smoke point') || t.includes('pah')) return 'Soot & Smoke Characterization';
  if (t.includes('large') || t.includes('exploration') || t.includes('pressure')) return 'Spacecraft Fire Safety';
  if (t.includes('spread') || t.includes('wire') || t.includes('emulat') || t.includes('stabiliz')) return 'Flame Spread & Ignition';
  return 'Combustion Fundamentals';
}

function isUnknownVal(v?: string | string[]): boolean {
  if (!v) return true;
  if (Array.isArray(v)) {
    return v.length === 0 || (v.length === 1 && v[0].toLowerCase() === 'unknown');
  }
  const lower = v.trim().toLowerCase();
  return lower === '' || lower === 'unknown' || lower.startsWith('unknown ');
}

function extractNumericRangeFromRows(
  rows: Record<string, string | number>[],
  candidateKeys: string[]
): { min: number; max: number; col: string } | null {
  for (const key of candidateKeys) {
    const nums = rows
      .map(r => r[key])
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
    if (nums.length > 0) {
      return {
        min: Math.min(...nums),
        max: Math.max(...nums),
        col: key,
      };
    }
  }
  return null;
}

function inferFuelCategoryFromText(fuel: string): FuelCategory {
  const f = fuel.toLowerCase();
  if (f.includes('wire') || f.includes('polyethylene') || f.includes('etfe')) return 'Electrical Wire Insulation';
  if (f.includes('pmma') || f.includes('acrylic')) return 'Solid Polymer (PMMA)';
  if (f.includes('cloth') || f.includes('fabric') || f.includes('sibal') || f.includes('cotton')) return 'Cellulosic / Composite Fabric';
  if (f.includes('droplet') || f.includes('heptane') || f.includes('decane') || f.includes('methanol')) return 'Liquid Droplet';
  if (f.includes('methane') || f.includes('ethylene') || f.includes('propane') || f.includes('butane') || f.includes('gas')) return 'Gaseous Hydrocarbon';
  if (f.includes('nine') || f.includes('mixed')) return 'Mixed / Multi-Fuel';
  return 'unknown';
}

function inferGravityRegimeFromText(gText: string, titleText = ''): GravityRegime {
  const s = `${gText} ${titleText}`.toLowerCase();
  if (s.includes('e-field') || s.includes('electric field') || s.includes('electric-field')) return 'E-FIELD Microgravity';
  if (s.includes('simulated 0g')) return 'Simulated 0G / 1G';
  if (s.includes('1g') || s.includes('normal gravity')) return 'Normal Gravity (1G)';
  if (s.includes('0.16') || s.includes('0.38') || s.includes('partial')) return 'Partial Gravity (Moon/Mars)';
  if (s.includes('10^-6') || s.includes('10⁻⁶') || s.includes('microgravity') || s.includes('cygnus')) return 'Microgravity (0G / 10⁻⁶ g)';
  return 'unknown';
}

function parseFirstNumber(text: string): number | null {
  const m = text.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

export function buildDnaFromInvestigation(
  inv: PsiInvestigationRecord,
  datasets: PsiFileRecord[] = []
): CombustionDnaProfile {
  const linkedFiles = datasets.filter(
    d => d.investigationId === inv.id || inv.linkedDatasetIds.includes(d.id)
  );
  const allRows = linkedFiles.flatMap(f => f.allRows && f.allRows.length > 0 ? f.allRows : f.sampleRows);

  const o2Stats = extractNumericRangeFromRows(allRows, ['o2_percent', 'o2_concentration', 'oxygen_pct']);
  const flowStats = extractNumericRangeFromRows(allRows, ['flow_velocity_ms', 'airflow_ms']);
  const tempCStats = extractNumericRangeFromRows(allRows, ['droplet_temp_c', 'surface_temp_c', 'wire_core_temp_c', 'temperature_c']);
  const tempKStats = extractNumericRangeFromRows(allRows, ['peak_temp_k', 'temp_k']);
  const pressureStats = extractNumericRangeFromRows(allRows, ['vehicle_pressure_kpa', 'pressure_kpa']);

  const measuredO2 = o2Stats
    ? `${o2Stats.min.toFixed(1)}% – ${o2Stats.max.toFixed(1)}% (measured in ${o2Stats.col})`
    : !isUnknownVal(inv.oxygenConcentration)
    ? inv.oxygenConcentration
    : 'unknown';

  const measuredFlow = flowStats
    ? `${flowStats.min.toFixed(2)} – ${flowStats.max.toFixed(2)} m/s (measured in ${flowStats.col})`
    : !isUnknownVal(inv.airflow)
    ? inv.airflow
    : 'unknown';

  const measuredTemp = tempCStats
    ? `${tempCStats.min.toFixed(1)}°C – ${tempCStats.max.toFixed(1)}°C (measured in ${tempCStats.col})`
    : tempKStats
    ? `${tempKStats.min.toFixed(0)} K – ${tempKStats.max.toFixed(0)} K (${(tempKStats.min - 273.15).toFixed(0)}°C – ${(tempKStats.max - 273.15).toFixed(0)}°C in ${tempKStats.col})`
    : !isUnknownVal(inv.temperatureDocumented)
    ? inv.temperatureDocumented
    : 'unknown';

  const measuredPressure = pressureStats
    ? `${pressureStats.min.toFixed(2)} – ${pressureStats.max.toFixed(2)} kPa (measured in ${pressureStats.col})`
    : !isUnknownVal(inv.pressure)
    ? inv.pressure
    : 'unknown';

  const hasDatasetRows = allRows.length > 0;

  const attributes: CombustionDnaAttribute[] = [
    { key: 'name', label: 'Investigation Name', value: inv.title, kind: 'metadata', tag: 'NASA-Reported' },
    { key: 'id', label: 'Investigation Identifier', value: inv.id, kind: 'metadata', tag: 'NASA-Reported' },
    { key: 'fuelType', label: 'Fuel Type', value: inv.fuel, kind: 'metadata', tag: 'NASA-Reported' },
    {
      key: 'fuelGeometry',
      label: 'Fuel Geometry & Dimensions',
      value: inv.fuelGeometryDimensions,
      kind: isUnknownVal(inv.fuelGeometryDimensions) ? 'unknown' : 'metadata',
      tag: isUnknownVal(inv.fuelGeometryDimensions) ? 'Unverified' : 'NASA-Reported',
    },
    {
      key: 'gravity',
      label: 'Gravity Conditions',
      value: inv.gravityCondition,
      kind: isUnknownVal(inv.gravityCondition) ? 'unknown' : 'metadata',
      tag: 'NASA-Reported',
    },
    {
      key: 'oxygen',
      label: 'Oxygen Concentration',
      value: measuredO2,
      kind: o2Stats ? 'measured' : isUnknownVal(measuredO2) ? 'unknown' : 'metadata',
      tag: o2Stats ? 'Measured Data' : isUnknownVal(measuredO2) ? 'Unverified' : 'NASA-Reported',
    },
    {
      key: 'pressure',
      label: 'Pressure',
      value: measuredPressure,
      kind: pressureStats ? 'measured' : isUnknownVal(measuredPressure) ? 'unknown' : 'metadata',
      tag: pressureStats ? 'Measured Data' : isUnknownVal(measuredPressure) ? 'Unverified' : 'NASA-Reported',
    },
    {
      key: 'airflow',
      label: 'Airflow',
      value: measuredFlow,
      kind: flowStats ? 'measured' : isUnknownVal(measuredFlow) ? 'unknown' : 'metadata',
      tag: flowStats ? 'Measured Data' : isUnknownVal(measuredFlow) ? 'Unverified' : 'NASA-Reported',
    },
    {
      key: 'temperature',
      label: 'Temperature (Where Measured)',
      value: measuredTemp,
      kind: tempCStats || tempKStats ? 'measured' : isUnknownVal(measuredTemp) ? 'unknown' : 'metadata',
      tag: tempCStats || tempKStats ? 'Measured Data' : isUnknownVal(measuredTemp) ? 'Unverified' : 'NASA-Reported',
    },
    { key: 'hardware', label: 'Experimental Hardware', value: inv.platform, kind: 'metadata', tag: 'NASA-Reported' },
    {
      key: 'sensors',
      label: 'Sensors',
      value: isUnknownVal(inv.sensors) ? 'unknown' : inv.sensors.join(', '),
      kind: isUnknownVal(inv.sensors) ? 'unknown' : 'metadata',
      tag: isUnknownVal(inv.sensors) ? 'Unverified' : 'NASA-Reported',
    },
    {
      key: 'measurements',
      label: 'Measurement Types',
      value: inv.measurementTypes.join(', '),
      kind: hasDatasetRows ? 'measured' : 'metadata',
      tag: hasDatasetRows ? 'Measured Data' : 'NASA-Reported',
    },
    { key: 'objective', label: 'Experimental Objective', value: inv.experimentalObjective, kind: 'metadata', tag: 'NASA-Reported' },
    {
      key: 'sourceFiles',
      label: 'Source Files (Indexed)',
      value: linkedFiles.length > 0 ? linkedFiles.map(f => f.filename).join(', ') : 'No local tabular file loaded (PSI accession only)',
      kind: linkedFiles.length > 0 ? 'measured' : 'unknown',
      tag: linkedFiles.length > 0 ? 'Measured Data' : 'Unverified',
    },
    { key: 'nasaLinks', label: 'NASA Source Link', value: inv.link, kind: 'metadata', tag: 'NASA-Reported' },
  ];

  // Build honest radar axes (null when unknown so chart omits or marks as unknown rather than fabricating numbers)
  const o2Num = o2Stats ? o2Stats.max : parseFirstNumber(measuredO2);
  const flowNum = flowStats ? flowStats.max : parseFirstNumber(measuredFlow);
  const pressureNum = pressureStats ? pressureStats.max : parseFirstNumber(measuredPressure);
  const tempNumC = tempCStats
    ? tempCStats.max
    : tempKStats
    ? tempKStats.max - 273.15
    : measuredTemp.includes('K') && parseFirstNumber(measuredTemp)
    ? (parseFirstNumber(measuredTemp) as number) - 273.15
    : measuredTemp.includes('°C')
    ? parseFirstNumber(measuredTemp)
    : null;
  const gNum = inv.gravityRegime === 'Normal Gravity (1G)' ? 1.0 : inv.gravityRegime === 'Microgravity (0G / 10⁻⁶ g)' || inv.gravityRegime === 'E-FIELD Microgravity' ? 0.0 : null;

  const assessedCount = attributes.filter(a => a.kind !== 'unknown').length;

  return {
    entityId: inv.id,
    entityType: 'investigation',
    identifier: inv.id,
    name: inv.title,
    nasaLink: inv.link,
    sourceFiles: linkedFiles.map(f => f.filename),
    assessedFieldCount: assessedCount,
    totalFieldCount: attributes.length,
    attributes,
    measuredSummary: {
      oxygenRange: measuredO2,
      airflowRange: measuredFlow,
      temperatureRange: measuredTemp,
      pressureRange: measuredPressure,
      rowCount: linkedFiles.reduce((acc, f) => acc + f.qualityReport.totalRows, 0) || undefined,
    },
    radarAxes: [
      {
        label: 'Peak O₂ (%)',
        normalizedValue: o2Num !== null ? Math.min(1, o2Num / 35) : null,
        displayValue: o2Num !== null ? `${o2Num.toFixed(1)}%` : 'unknown',
        isMeasured: Boolean(o2Stats),
      },
      {
        label: 'Max Flow (m/s)',
        normalizedValue: flowNum !== null ? Math.min(1, flowNum / 0.4) : null,
        displayValue: flowNum !== null ? `${flowNum.toFixed(2)} m/s` : 'unknown',
        isMeasured: Boolean(flowStats),
      },
      {
        label: 'Pressure (kPa)',
        normalizedValue: pressureNum !== null ? Math.min(1, pressureNum / 110) : null,
        displayValue: pressureNum !== null ? `${pressureNum.toFixed(1)} kPa` : 'unknown',
        isMeasured: Boolean(pressureStats),
      },
      {
        label: 'Peak Temp (°C)',
        normalizedValue: tempNumC !== null ? Math.min(1, Math.max(0.08, tempNumC / 1600)) : null,
        displayValue: tempNumC !== null ? `${tempNumC.toFixed(0)}°C` : 'unknown',
        isMeasured: Boolean(tempCStats || tempKStats),
      },
      {
        label: 'Gravity (g)',
        normalizedValue: gNum !== null ? Math.max(0.06, Math.min(1, gNum)) : null,
        displayValue: gNum !== null ? (gNum === 0 ? '10⁻⁶ g' : `${gNum} g`) : 'unknown',
        isMeasured: false,
      },
      {
        label: 'Metadata Density',
        normalizedValue: assessedCount / attributes.length,
        displayValue: `${assessedCount}/${attributes.length} fields`,
        isMeasured: true,
      },
    ],
    categoricalTags: {
      fuelCategory: inv.fuelCategory,
      gravityRegime: inv.gravityRegime,
      hardwareFamily: inferHardwareFamily(inv.platform),
      objectiveDomain: inferObjectiveDomain(`${inv.title} ${inv.experimentalObjective} ${inv.keyFinding}`),
    },
  };
}

export function buildDnaFromDataset(file: PsiFileRecord): CombustionDnaProfile {
  const rows = file.allRows && file.allRows.length > 0 ? file.allRows : file.sampleRows;
  const o2Stats = extractNumericRangeFromRows(rows, ['o2_percent', 'o2_concentration', 'oxygen_pct', 'o2']);
  const flowStats = extractNumericRangeFromRows(rows, ['flow_velocity_ms', 'airflow_ms', 'flow']);
  const tempCStats = extractNumericRangeFromRows(rows, ['droplet_temp_c', 'surface_temp_c', 'wire_core_temp_c', 'temperature_c', 'temp_c']);
  const tempKStats = extractNumericRangeFromRows(rows, ['peak_temp_k', 'temp_k']);
  const pressureStats = extractNumericRangeFromRows(rows, ['vehicle_pressure_kpa', 'pressure_kpa']);

  const measuredO2 = o2Stats
    ? `${o2Stats.min.toFixed(1)}% – ${o2Stats.max.toFixed(1)}% (${o2Stats.col})`
    : !isUnknownVal(file.oxygenRange)
    ? file.oxygenRange
    : 'unknown';

  const measuredFlow = flowStats
    ? `${flowStats.min.toFixed(2)} – ${flowStats.max.toFixed(2)} m/s (${flowStats.col})`
    : !isUnknownVal(file.flowRange)
    ? file.flowRange
    : 'unknown';

  const measuredTemp = tempCStats
    ? `${tempCStats.min.toFixed(1)}°C – ${tempCStats.max.toFixed(1)}°C (${tempCStats.col})`
    : tempKStats
    ? `${tempKStats.min.toFixed(0)} K – ${tempKStats.max.toFixed(0)} K (${tempKStats.col})`
    : 'unknown';

  const measuredPressure = pressureStats
    ? `${pressureStats.min.toFixed(2)} – ${pressureStats.max.toFixed(2)} kPa (${pressureStats.col})`
    : !isUnknownVal(file.pressureRange)
    ? (file.pressureRange as string)
    : 'unknown';

  const fuelCategory = inferFuelCategoryFromText(file.fuelType);
  const gravityRegime = inferGravityRegimeFromText(file.gravityCondition, file.investigationName);
  const hardware = file.hardware || (file.mission === 'Acoustic-FlameFrags' ? 'Acoustic Chamber (Lab Reference)' : 'unknown');

  const attributes: CombustionDnaAttribute[] = [
    { key: 'name', label: 'Investigation Name', value: file.investigationName, kind: 'metadata', tag: file.investigationId ? 'NASA-Reported' : 'Measured Data' },
    { key: 'id', label: 'Investigation Identifier', value: file.investigationId || file.id, kind: 'metadata', tag: file.investigationId ? 'NASA-Reported' : 'Measured Data' },
    { key: 'fuelType', label: 'Fuel Type', value: file.fuelType || 'unknown', kind: isUnknownVal(file.fuelType) ? 'unknown' : 'metadata', tag: file.investigationId ? 'NASA-Reported' : 'Measured Data' },
    { key: 'fuelGeometry', label: 'Fuel Geometry & Dimensions', value: file.fuelType.includes('3.2 mm') ? 'Isolated droplet d₀ = 3.2 mm' : file.fuelType.includes('SIBAL') ? '0.4 m × 1.0 m sheet' : 'unknown', kind: file.fuelType.includes('3.2 mm') || file.fuelType.includes('SIBAL') ? 'metadata' : 'unknown', tag: file.fuelType.includes('3.2 mm') || file.fuelType.includes('SIBAL') ? 'NASA-Reported' : 'Unverified' },
    { key: 'gravity', label: 'Gravity Conditions', value: file.gravityCondition || 'unknown', kind: isUnknownVal(file.gravityCondition) ? 'unknown' : 'metadata', tag: 'Measured Data' },
    { key: 'oxygen', label: 'Oxygen Concentration', value: measuredO2, kind: o2Stats ? 'measured' : isUnknownVal(measuredO2) ? 'unknown' : 'metadata', tag: o2Stats ? 'Measured Data' : isUnknownVal(measuredO2) ? 'Unverified' : 'NASA-Reported' },
    { key: 'pressure', label: 'Pressure', value: measuredPressure, kind: pressureStats ? 'measured' : isUnknownVal(measuredPressure) ? 'unknown' : 'metadata', tag: pressureStats ? 'Measured Data' : isUnknownVal(measuredPressure) ? 'Unverified' : 'NASA-Reported' },
    { key: 'airflow', label: 'Airflow', value: measuredFlow, kind: flowStats ? 'measured' : isUnknownVal(measuredFlow) ? 'unknown' : 'metadata', tag: flowStats ? 'Measured Data' : isUnknownVal(measuredFlow) ? 'Unverified' : 'NASA-Reported' },
    { key: 'temperature', label: 'Temperature (Where Measured)', value: measuredTemp, kind: tempCStats || tempKStats ? 'measured' : 'unknown', tag: tempCStats || tempKStats ? 'Measured Data' : 'Unverified' },
    { key: 'hardware', label: 'Experimental Hardware', value: hardware, kind: isUnknownVal(hardware) ? 'unknown' : 'metadata', tag: file.investigationId ? 'NASA-Reported' : 'Measured Data' },
    { key: 'sensors', label: 'Sensors', value: isUnknownVal(file.sensors) ? 'unknown' : (file.sensors as string[]).join(', '), kind: isUnknownVal(file.sensors) ? 'unknown' : 'metadata', tag: isUnknownVal(file.sensors) ? 'Unverified' : 'Measured Data' },
    { key: 'measurements', label: 'Measurement Types', value: file.columns.join(', '), kind: 'measured', tag: 'Measured Data' },
    { key: 'objective', label: 'Experimental Objective', value: file.description, kind: 'metadata', tag: file.investigationId ? 'NASA-Reported' : 'Measured Data' },
    { key: 'sourceFiles', label: 'Source Files', value: `${file.filename} (${file.qualityReport.totalRows} rows)`, kind: 'measured', tag: 'Measured Data' },
    { key: 'nasaLinks', label: 'NASA Source Link', value: file.nasaLink || 'unknown (Local/User Dataset)', kind: file.nasaLink ? 'metadata' : 'unknown', tag: file.nasaLink ? 'NASA-Reported' : 'Unverified' },
  ];

  const o2Num = o2Stats ? o2Stats.max : parseFirstNumber(measuredO2);
  const flowNum = flowStats ? flowStats.max : parseFirstNumber(measuredFlow);
  const pressureNum = pressureStats ? pressureStats.max : parseFirstNumber(measuredPressure);
  const tempNumC = tempCStats ? tempCStats.max : tempKStats ? tempKStats.max - 273.15 : null;
  const gNum = gravityRegime === 'Normal Gravity (1G)' ? 1.0 : gravityRegime === 'Microgravity (0G / 10⁻⁶ g)' ? 0.0 : null;
  const assessedCount = attributes.filter(a => a.kind !== 'unknown').length;

  return {
    entityId: file.id,
    entityType: 'dataset',
    identifier: file.investigationId ? `${file.investigationId} · ${file.filename}` : file.filename,
    name: file.investigationName,
    nasaLink: file.nasaLink,
    sourceFiles: [file.filename],
    assessedFieldCount: assessedCount,
    totalFieldCount: attributes.length,
    attributes,
    measuredSummary: {
      oxygenRange: measuredO2,
      airflowRange: measuredFlow,
      temperatureRange: measuredTemp,
      pressureRange: measuredPressure,
      rowCount: file.qualityReport.totalRows,
    },
    radarAxes: [
      { label: 'Peak O₂ (%)', normalizedValue: o2Num !== null ? Math.min(1, o2Num / 35) : null, displayValue: o2Num !== null ? `${o2Num.toFixed(1)}%` : 'unknown', isMeasured: Boolean(o2Stats) },
      { label: 'Max Flow (m/s)', normalizedValue: flowNum !== null ? Math.min(1, flowNum / 0.4) : null, displayValue: flowNum !== null ? `${flowNum.toFixed(2)} m/s` : 'unknown', isMeasured: Boolean(flowStats) },
      { label: 'Pressure (kPa)', normalizedValue: pressureNum !== null ? Math.min(1, pressureNum / 110) : null, displayValue: pressureNum !== null ? `${pressureNum.toFixed(1)} kPa` : 'unknown', isMeasured: Boolean(pressureStats) },
      { label: 'Peak Temp (°C)', normalizedValue: tempNumC !== null ? Math.min(1, Math.max(0.08, tempNumC / 1600)) : null, displayValue: tempNumC !== null ? `${tempNumC.toFixed(0)}°C` : 'unknown', isMeasured: Boolean(tempCStats || tempKStats) },
      { label: 'Gravity (g)', normalizedValue: gNum !== null ? Math.max(0.06, Math.min(1, gNum)) : null, displayValue: gNum !== null ? (gNum === 0 ? '10⁻⁶ g' : `${gNum} g`) : 'unknown', isMeasured: false },
      { label: 'Metadata Density', normalizedValue: assessedCount / attributes.length, displayValue: `${assessedCount}/${attributes.length} fields`, isMeasured: true },
    ],
    categoricalTags: {
      fuelCategory,
      gravityRegime,
      hardwareFamily: inferHardwareFamily(hardware),
      objectiveDomain: inferObjectiveDomain(`${file.investigationName} ${file.description}`),
    },
  };
}

export function getAllInvestigationDnaProfiles(datasets: PsiFileRecord[]): CombustionDnaProfile[] {
  return PSI_INVESTIGATIONS_REGISTRY.map(inv => buildDnaFromInvestigation(inv, datasets));
}

export function compareCombustionDna(
  profileA: CombustionDnaProfile,
  profileB: CombustionDnaProfile
): CombustionDnaComparison {
  const sharedAttributes: CombustionDnaComparison['sharedAttributes'] = [];
  const differingAttributes: CombustionDnaComparison['differingAttributes'] = [];
  const uncomparableAttributes: CombustionDnaComparison['uncomparableAttributes'] = [];

  // Compare categorical scientific dimensions cleanly & transparently
  const dims: {
    label: string;
    a: string;
    b: string;
    matchFn?: (va: string, vb: string) => boolean;
  }[] = [
    { label: 'Fuel Category', a: profileA.categoricalTags.fuelCategory, b: profileB.categoricalTags.fuelCategory },
    { label: 'Gravity Regime', a: profileA.categoricalTags.gravityRegime, b: profileB.categoricalTags.gravityRegime },
    { label: 'Hardware Family', a: profileA.categoricalTags.hardwareFamily, b: profileB.categoricalTags.hardwareFamily },
    { label: 'Experimental Objective Domain', a: profileA.categoricalTags.objectiveDomain, b: profileB.categoricalTags.objectiveDomain },
    {
      label: 'Oxygen Concentration',
      a: profileA.measuredSummary.oxygenRange || 'unknown',
      b: profileB.measuredSummary.oxygenRange || 'unknown',
      matchFn: (va, vb) => va.includes('21') && vb.includes('21'),
    },
    {
      label: 'Airflow Condition',
      a: profileA.measuredSummary.airflowRange || 'unknown',
      b: profileB.measuredSummary.airflowRange || 'unknown',
      matchFn: (va, vb) =>
        (va.toLowerCase().includes('quiescent') && vb.toLowerCase().includes('quiescent')) ||
        (va.toLowerCase().includes('coflow') && vb.toLowerCase().includes('coflow')) ||
        (va.includes('0.2') && vb.includes('0.2')),
    },
    {
      label: 'Pressure Condition',
      a: profileA.measuredSummary.pressureRange || 'unknown',
      b: profileB.measuredSummary.pressureRange || 'unknown',
    },
    {
      label: 'Temperature Documented',
      a: profileA.measuredSummary.temperatureRange || 'unknown',
      b: profileB.measuredSummary.temperatureRange || 'unknown',
      matchFn: (va, vb) =>
        va.toLowerCase().includes('cool') && vb.toLowerCase().includes('cool'),
    },
  ];

  for (const d of dims) {
    const uA = isUnknownVal(d.a);
    const uB = isUnknownVal(d.b);
    if (uA || uB) {
      uncomparableAttributes.push({ label: d.label, valueA: d.a, valueB: d.b });
      continue;
    }
    const isMatch = d.matchFn ? d.matchFn(d.a, d.b) : d.a.toLowerCase() === d.b.toLowerCase();
    if (isMatch) {
      sharedAttributes.push({
        label: d.label,
        valueA: d.a,
        valueB: d.b,
        reason: `Both documented under "${d.a}"`,
      });
    } else {
      differingAttributes.push({ label: d.label, valueA: d.a, valueB: d.b });
    }
  }

  const comparableCount = sharedAttributes.length + differingAttributes.length;
  const documentedOverlapRatio = comparableCount > 0 ? sharedAttributes.length / comparableCount : 0;

  return {
    profileA,
    profileB,
    sharedAttributes,
    differingAttributes,
    uncomparableAttributes,
    documentedOverlapRatio,
    comparableCount,
    sharedCount: sharedAttributes.length,
    methodNote: `Explicit categorical attribute overlap (${sharedAttributes.length} shared / ${comparableCount} mutually documented dimensions; ${uncomparableAttributes.length} omitted due to unknown metadata). No inferred or interpolated similarity score used.`,
  };
}

export function findSimilarInvestigations(
  target: CombustionDnaProfile,
  allProfiles: CombustionDnaProfile[],
  limit = 4
): { profile: CombustionDnaProfile; comparison: CombustionDnaComparison }[] {
  return allProfiles
    .filter(p => p.entityId !== target.entityId)
    .map(p => ({
      profile: p,
      comparison: compareCombustionDna(target, p),
    }))
    .sort((a, b) => {
      if (b.comparison.sharedCount !== a.comparison.sharedCount) {
        return b.comparison.sharedCount - a.comparison.sharedCount;
      }
      return b.comparison.documentedOverlapRatio - a.comparison.documentedOverlapRatio;
    })
    .slice(0, limit);
}
