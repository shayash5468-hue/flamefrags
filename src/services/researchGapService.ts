import { PsiFileRecord, PsiInvestigationRecord } from '../types';
import { PSI_INVESTIGATIONS_REGISTRY } from '../data/psiRegistry';

export type CoverageDimensionKey =
  | 'fuelType'
  | 'gravityCondition'
  | 'oxygenConcentration'
  | 'pressure'
  | 'airflow'
  | 'hardware'
  | 'measurementType'
  | 'experimentalObjective';

export const COVERAGE_DIMENSIONS: { key: CoverageDimensionKey; label: string }[] = [
  { key: 'fuelType', label: 'Fuel Type' },
  { key: 'gravityCondition', label: 'Gravity Condition' },
  { key: 'oxygenConcentration', label: 'Oxygen Concentration' },
  { key: 'pressure', label: 'Pressure' },
  { key: 'airflow', label: 'Airflow' },
  { key: 'hardware', label: 'Hardware' },
  { key: 'measurementType', label: 'Measurement Type' },
  { key: 'experimentalObjective', label: 'Experimental Objective' },
];

export type CellCoverageStatus = 'substantial' | 'limited' | 'zero' | 'unassessable';

export interface CoverageMatrixCell {
  rowBucket: string;
  colBucket: string;
  status: CellCoverageStatus;
  count: number;
  investigationIds: string[];
  note: string;
}

export interface CoverageMatrixReport {
  rowDimension: CoverageDimensionKey;
  colDimension: CoverageDimensionKey;
  rowBuckets: string[];
  colBuckets: string[];
  cells: CoverageMatrixCell[];
  summary: {
    totalIndexedInvestigations: number;
    substantialCells: number;
    limitedCells: number;
    zeroRecordCells: number;
    unknownBucketRecords: number;
  };
}

export function classifyRecordDimension(
  inv: PsiInvestigationRecord,
  dim: CoverageDimensionKey
): string {
  switch (dim) {
    case 'fuelType':
      return inv.fuelCategory;
    case 'gravityCondition':
      return inv.gravityRegime;
    case 'oxygenConcentration': {
      const o = inv.oxygenConcentration.toLowerCase();
      if (o === 'unknown') return 'Unknown Metadata';
      if (o.includes('34') || o.includes('30')) return 'Enriched O₂ (>23%)';
      if (o.includes('14') || o.includes('15') || o.includes('16') || o.includes('18')) return 'Hypoxic / Varied O₂ (14–22%)';
      if (o.includes('21')) return 'Standard Air (21% O₂)';
      return 'Varied O₂ (Documented)';
    }
    case 'pressure': {
      const p = inv.pressure.toLowerCase();
      if (p === 'unknown') return 'Unknown Metadata';
      if (p.includes('30 kpa') || p.includes('depressur')) return 'Emergency Depress (<35 kPa)';
      if (p.includes('56.5') || p.includes('8.2')) return 'Reduced Exploration (56.5 kPa)';
      if (p.includes('101') || p.includes('103')) return 'Atmospheric (~101 kPa)';
      return 'Pressure-Monitored (Bounds Unknown)';
    }
    case 'airflow': {
      const a = inv.airflow.toLowerCase();
      if (a === 'unknown') return 'Unknown Metadata';
      if (a.includes('0.00') || a.includes('quiescent')) return 'Quiescent (0 m/s)';
      if (a.includes('0.01') || a.includes('0.04') || a.includes('0.05') || a.includes('0.2') || a.includes('low-flow')) return 'Low / Forced Flow (0.01–0.35 m/s)';
      if (a.includes('high')) return 'High Duct Flow';
      return 'Forced / Strain Flow (Exact Rate Unknown)';
    }
    case 'hardware': {
      const h = inv.platform.toLowerCase();
      if (h.includes('cir') && h.includes('acme')) return 'ISS CIR / ACME';
      if (h.includes('mdca') || h.includes('cir')) return 'ISS CIR / MDCA / SoFIE';
      if (h.includes('msg')) return 'ISS MSG Glovebox';
      if (h.includes('cygnus')) return 'Cygnus Cargo Vehicle';
      if (h.includes('cfd')) return 'CFD Model Synthesis';
      return inv.platform;
    }
    case 'measurementType': {
      const m = inv.measurementTypes.join(' ').toLowerCase();
      if (m.includes('cool') || m.includes('d²') || m.includes('radiative') || m.includes('s-curve')) return 'Cool-Flame / Extinction Kinetics';
      if (m.includes('spread') || m.includes('pyrolysis') || m.includes('obscuration')) return 'Flame Spread & Pyrolysis';
      if (m.includes('soot') || m.includes('smoke point') || m.includes('pah')) return 'Soot & Smoke Diagnostics';
      if (m.includes('pressure') || m.includes('depressur')) return 'Vehicle Pressure & Heat Release';
      if (m.includes('ionic') || m.includes('electric')) return 'Electrostatic Flame Control';
      return 'Stabilization / Liftoff';
    }
    case 'experimentalObjective': {
      const t = `${inv.title} ${inv.experimentalObjective}`.toLowerCase();
      if (t.includes('cool flame') || t.includes('s-curve') || t.includes('distillation')) return 'Cool-Flame Kinetics';
      if (t.includes('suppress') || t.includes('depressuriz') || t.includes('ionic')) return 'Suppression & Quenching';
      if (t.includes('soot') || t.includes('smoke')) return 'Soot & Emissions';
      if (t.includes('spread') || t.includes('wire') || t.includes('flammability') || t.includes('large')) return 'Material Flammability & Spread';
      return 'Flame Stabilization & Emulation';
    }
  }
}

const CANONICAL_BUCKETS: Record<CoverageDimensionKey, string[]> = {
  fuelType: [
    'Gaseous Hydrocarbon',
    'Liquid Droplet',
    'Solid Polymer (PMMA)',
    'Cellulosic / Composite Fabric',
    'Electrical Wire Insulation',
    'Mixed / Multi-Fuel',
  ],
  gravityCondition: [
    'Microgravity (0G / 10⁻⁶ g)',
    'E-FIELD Microgravity',
    'Partial Gravity (Moon/Mars)',
    'Normal Gravity (1G)',
  ],
  oxygenConcentration: [
    'Standard Air (21% O₂)',
    'Hypoxic / Varied O₂ (14–22%)',
    'Enriched O₂ (>23%)',
    'Unknown Metadata',
  ],
  pressure: [
    'Atmospheric (~101 kPa)',
    'Reduced Exploration (56.5 kPa)',
    'Emergency Depress (<35 kPa)',
    'Pressure-Monitored (Bounds Unknown)',
    'Unknown Metadata',
  ],
  airflow: [
    'Quiescent (0 m/s)',
    'Low / Forced Flow (0.01–0.35 m/s)',
    'High Duct Flow',
    'Forced / Strain Flow (Exact Rate Unknown)',
    'Unknown Metadata',
  ],
  hardware: [
    'ISS CIR / MDCA / SoFIE',
    'ISS CIR / ACME',
    'ISS MSG Glovebox',
    'Cygnus Cargo Vehicle',
    'CFD Model Synthesis',
  ],
  measurementType: [
    'Cool-Flame / Extinction Kinetics',
    'Flame Spread & Pyrolysis',
    'Soot & Smoke Diagnostics',
    'Vehicle Pressure & Heat Release',
    'Electrostatic Flame Control',
    'Stabilization / Liftoff',
  ],
  experimentalObjective: [
    'Cool-Flame Kinetics',
    'Material Flammability & Spread',
    'Soot & Emissions',
    'Suppression & Quenching',
    'Flame Stabilization & Emulation',
  ],
};

export function buildResearchCoverageMatrix(
  rowDim: CoverageDimensionKey,
  colDim: CoverageDimensionKey,
  _datasets: PsiFileRecord[] = []
): CoverageMatrixReport {
  const rowBuckets = [...CANONICAL_BUCKETS[rowDim]];
  const colBuckets = [...CANONICAL_BUCKETS[colDim]];

  // Ensure any dynamic value present is included cleanly
  PSI_INVESTIGATIONS_REGISTRY.forEach(inv => {
    const rb = classifyRecordDimension(inv, rowDim);
    const cb = classifyRecordDimension(inv, colDim);
    if (!rowBuckets.includes(rb)) rowBuckets.push(rb);
    if (!colBuckets.includes(cb)) colBuckets.push(cb);
  });

  const cells: CoverageMatrixCell[] = [];
  let substantialCells = 0;
  let limitedCells = 0;
  let zeroRecordCells = 0;

  for (const rb of rowBuckets) {
    for (const cb of colBuckets) {
      const matching = PSI_INVESTIGATIONS_REGISTRY.filter(
        inv => classifyRecordDimension(inv, rowDim) === rb && classifyRecordDimension(inv, colDim) === cb
      );
      const count = matching.length;
      const isUnknownBucket = rb === 'Unknown Metadata' || cb === 'Unknown Metadata';

      let status: CellCoverageStatus;
      let note: string;
      if (isUnknownBucket) {
        status = count > 0 ? 'unassessable' : 'zero';
        note = count > 0
          ? `${count} investigation(s) cannot be assessed along this axis because metadata is missing/unknown in the local index.`
          : 'No matching records found in the currently indexed PSI collection.';
      } else if (count >= 3) {
        status = 'substantial';
        substantialCells++;
        note = `Substantial coverage (${count} indexed investigations).`;
      } else if (count >= 1) {
        status = 'limited';
        limitedCells++;
        note = `Limited coverage (${count} indexed investigation${count > 1 ? 's' : ''}).`;
      } else {
        status = 'zero';
        zeroRecordCells++;
        note = 'No matching records found in the currently indexed PSI collection.';
      }

      cells.push({
        rowBucket: rb,
        colBucket: cb,
        status,
        count,
        investigationIds: matching.map(m => m.id),
        note,
      });
    }
  }

  const unknownBucketRecords = PSI_INVESTIGATIONS_REGISTRY.filter(
    inv =>
      classifyRecordDimension(inv, rowDim) === 'Unknown Metadata' ||
      classifyRecordDimension(inv, colDim) === 'Unknown Metadata'
  ).length;

  return {
    rowDimension: rowDim,
    colDimension: colDim,
    rowBuckets,
    colBuckets,
    cells,
    summary: {
      totalIndexedInvestigations: PSI_INVESTIGATIONS_REGISTRY.length,
      substantialCells,
      limitedCells,
      zeroRecordCells,
      unknownBucketRecords,
    },
  };
}

export interface PartialGravityBreakdown {
  microgravityInvestigations: PsiInvestigationRecord[];
  eFieldInvestigations: PsiInvestigationRecord[];
  normalGravityInvestigations: PsiInvestigationRecord[];
  partialGravityInvestigations: PsiInvestigationRecord[];
  pressureUnknownCount: number;
  oxygenUnknownCount: number;
  opportunityBriefs: {
    title: string;
    regime: string;
    gapSummary: string;
    importance: string;
  }[];
}

export function analyzePartialGravityAndGaps(): PartialGravityBreakdown {
  const microgravityInvestigations = PSI_INVESTIGATIONS_REGISTRY.filter(
    i => i.gravityRegime === 'Microgravity (0G / 10⁻⁶ g)'
  );
  const eFieldInvestigations = PSI_INVESTIGATIONS_REGISTRY.filter(
    i => i.gravityRegime === 'E-FIELD Microgravity'
  );
  const normalGravityInvestigations = PSI_INVESTIGATIONS_REGISTRY.filter(
    i => i.gravityRegime === 'Normal Gravity (1G)'
  );
  const partialGravityInvestigations = PSI_INVESTIGATIONS_REGISTRY.filter(
    i => i.gravityRegime === 'Partial Gravity (Moon/Mars)'
  );

  return {
    microgravityInvestigations,
    eFieldInvestigations,
    normalGravityInvestigations,
    partialGravityInvestigations,
    pressureUnknownCount: PSI_INVESTIGATIONS_REGISTRY.filter(i => i.pressure === 'unknown').length,
    oxygenUnknownCount: PSI_INVESTIGATIONS_REGISTRY.filter(i => i.oxygenConcentration === 'unknown').length,
    opportunityBriefs: [
      {
        title: 'Lunar (0.16g) & Martian (0.38g) Partial-Gravity Smoldering-to-Flaming Transition',
        regime: 'Partial Gravity (0.16g – 0.38g)',
        gapSummary: 'No matching partial-gravity combustion flight records found in the currently indexed PSI collection (0 of 24 indexed records).',
        importance: 'Weak non-zero buoyancy may sustain fresh air inflow without clearing heat as rapidly as 1G, creating unvalidated material flammability margins for Artemis and Mars habitats.',
      },
      {
        title: 'Exploration Atmosphere Pressure × Elevated O₂ Matrix Expansion',
        regime: '56.5 kPa / 34% O₂ across Solid Polymers & Wire Harnesses',
        gapSummary: 'Only 1 indexed campaign (PSI-101 Saffire-IV) explicitly documents 34% O₂ at 56.5 kPa (8.2 psia) in our catalogue.',
        importance: 'Artemis & rover cabins operate at reduced pressure and higher O₂ fractions to minimize pre-breathe time, yet droplet cool flames and wire insulation lack systematic PSI validation at 56.5 kPa.',
      },
      {
        title: 'Acoustic & Non-Chemical Suppression Integration in PSI',
        regime: 'Active Field Suppression (Beyond E-FIELD)',
        gapSummary: 'Only PSI-68 (ACME E-FIELD) documents electrostatic field control; acoustic wave quenching has no flight PSI accession in the currently indexed collection.',
        importance: 'Clean physical suppression (electrostatic or acoustic) avoids toxic post-fire cleanup in closed-loop spacecraft ECLSS hardware.',
      },
    ],
  };
}
