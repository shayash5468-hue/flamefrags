import { HabitatAssumptions, HabitatEnvironmentId, PsiInvestigationRecord } from '../types';
import { PSI_INVESTIGATIONS_REGISTRY } from '../data/psiRegistry';

/**
 * Editable User-Defined Baseline Assumptions for Exploration Environments.
 * CRITICAL POLICY:
 * These are NOT presented as official NASA flight rules or design specifications.
 * Users can adjust every assumption freely; comparisons strictly distinguish
 * actual NASA PSI experimental parameters from user-defined habitat assumptions.
 */
export const DEFAULT_HABITAT_PROFILES: Record<HabitatEnvironmentId, HabitatAssumptions> = {
  iss: {
    environmentId: 'iss',
    label: 'International Space Station',
    oxygenPct: 21.0,
    pressureKpa: 101.3,
    airflowMs: 0.15,
    gravityG: 0.0,
    fuelClass: 'Electrical Wire Insulation',
    assumptionNotes: 'User-editable baseline approximating sea-level pressure air with active module ventilation in orbital microgravity.',
  },
  'lunar-habitat': {
    environmentId: 'lunar-habitat',
    label: 'Lunar Habitat',
    oxygenPct: 34.0,
    pressureKpa: 56.5,
    airflowMs: 0.12,
    gravityG: 0.16,
    fuelClass: 'Cellulosic / Composite Fabric',
    assumptionNotes: 'User-editable exploration atmosphere assumption (reduced pressure, enriched O₂ to limit pre-breathe) under 0.16g lunar gravity.',
  },
  'lunar-rover': {
    environmentId: 'lunar-rover',
    label: 'Pressurised Lunar Rover',
    oxygenPct: 34.0,
    pressureKpa: 56.5,
    airflowMs: 0.18,
    gravityG: 0.16,
    fuelClass: 'Electrical Wire Insulation',
    assumptionNotes: 'User-editable compact cabin volume assumption with enriched O₂, tight equipment density, and 0.16g partial gravity.',
  },
  'mars-habitat': {
    environmentId: 'mars-habitat',
    label: 'Mars Habitat',
    oxygenPct: 26.0,
    pressureKpa: 70.0,
    airflowMs: 0.14,
    gravityG: 0.38,
    fuelClass: 'Mixed / Multi-Fuel',
    assumptionNotes: 'User-editable intermediate exploration atmosphere assumption under 0.38g Martian gravity.',
  },
  'mars-rover': {
    environmentId: 'mars-rover',
    label: 'Pressurised Mars Rover',
    oxygenPct: 30.0,
    pressureKpa: 62.0,
    airflowMs: 0.20,
    gravityG: 0.38,
    fuelClass: 'Solid Polymer (PMMA)',
    assumptionNotes: 'User-editable compact rover interior assumption with forced avionics cooling airflow under 0.38g Martian gravity.',
  },
};

export type ParameterComparisonState = 'match' | 'differ' | 'missing';

export interface HabitatParameterComparison {
  parameter: 'Gravity' | 'Oxygen Concentration' | 'Pressure' | 'Airflow' | 'Fuel / Material Class';
  assumedValue: string;
  psiDocumentedValue: string;
  state: ParameterComparisonState;
  explanation: string;
}

export interface HabitatInvestigationBridge {
  investigation: PsiInvestigationRecord;
  matchCount: number;
  differCount: number;
  missingCount: number;
  parameters: HabitatParameterComparison[];
}

function checkGravityMatch(inv: PsiInvestigationRecord, g: number): HabitatParameterComparison {
  const assumed = `${g.toFixed(2)} g`;
  if (g < 0.05 && inv.gravityRegime === 'Microgravity (0G / 10⁻⁶ g)') {
    return {
      parameter: 'Gravity',
      assumedValue: assumed,
      psiDocumentedValue: inv.gravityCondition,
      state: 'match',
      explanation: 'Both environment assumption and PSI experiment operate in orbital microgravity (~10⁻⁶ g).',
    };
  }
  if (g >= 0.05 && g < 0.9) {
    return {
      parameter: 'Gravity',
      assumedValue: assumed,
      psiDocumentedValue: inv.gravityCondition,
      state: 'missing',
      explanation: `Partial gravity (${assumed}) has NO matching flight data in the currently indexed PSI collection (PSI tests ran in 10⁻⁶ g microgravity).`,
    };
  }
  return {
    parameter: 'Gravity',
    assumedValue: assumed,
    psiDocumentedValue: inv.gravityCondition,
    state: 'differ',
    explanation: `Assumed ${assumed} differs from PSI test condition (${inv.gravityCondition}).`,
  };
}

function checkOxygenMatch(inv: PsiInvestigationRecord, o2: number): HabitatParameterComparison {
  const assumed = `${o2.toFixed(1)}% O₂`;
  const doc = inv.oxygenConcentration;
  if (!doc || doc === 'unknown') {
    return {
      parameter: 'Oxygen Concentration',
      assumedValue: assumed,
      psiDocumentedValue: 'unknown in local index',
      state: 'missing',
      explanation: 'Exact O₂ boundaries for this investigation are not verified in our local metadata index.',
    };
  }
  const nums = doc.match(/\d+(\.\d+)?/g)?.map(Number) || [];
  if (nums.length >= 2) {
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const inRange = o2 >= min - 0.5 && o2 <= max + 0.5;
    return {
      parameter: 'Oxygen Concentration',
      assumedValue: assumed,
      psiDocumentedValue: doc,
      state: inRange ? 'match' : 'differ',
      explanation: inRange
        ? `Assumed ${assumed} falls within documented PSI range (${doc}).`
        : `Assumed ${assumed} falls outside documented PSI range (${doc}).`,
    };
  }
  if (nums.length === 1) {
    const close = Math.abs(o2 - nums[0]) <= 2.0;
    return {
      parameter: 'Oxygen Concentration',
      assumedValue: assumed,
      psiDocumentedValue: doc,
      state: close ? 'match' : 'differ',
      explanation: close
        ? `Assumed ${assumed} aligns closely with documented test concentration (${doc}).`
        : `Assumed ${assumed} differs significantly from documented test condition (${doc}).`,
    };
  }
  return {
    parameter: 'Oxygen Concentration',
    assumedValue: assumed,
    psiDocumentedValue: doc,
    state: 'missing',
    explanation: 'Cannot numerically evaluate O₂ range from indexed text.',
  };
}

function checkPressureMatch(inv: PsiInvestigationRecord, pKpa: number): HabitatParameterComparison {
  const assumed = `${pKpa.toFixed(1)} kPa`;
  const doc = inv.pressure;
  if (!doc || doc === 'unknown' || doc.toLowerCase().includes('unknown')) {
    return {
      parameter: 'Pressure',
      assumedValue: assumed,
      psiDocumentedValue: doc || 'unknown',
      state: 'missing',
      explanation: 'Ambient pressure is unverified/unknown for this investigation in our local catalogue.',
    };
  }
  const kpaMatches = doc.match(/(\d+(\.\d+)?)\s*kpa/gi);
  if (kpaMatches && kpaMatches.length > 0) {
    const vals = kpaMatches.map(s => parseFloat(s));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const close = pKpa >= min - 6 && pKpa <= max + 6;
    return {
      parameter: 'Pressure',
      assumedValue: assumed,
      psiDocumentedValue: doc,
      state: close ? 'match' : 'differ',
      explanation: close
        ? `Assumed ${assumed} aligns with documented test pressure (${doc}).`
        : `Assumed ${assumed} differs from documented test pressure (${doc}).`,
    };
  }
  return {
    parameter: 'Pressure',
    assumedValue: assumed,
    psiDocumentedValue: doc,
    state: 'missing',
    explanation: 'Pressure comparison cannot be resolved numerically from indexed metadata.',
  };
}

function checkAirflowMatch(inv: PsiInvestigationRecord, flow: number): HabitatParameterComparison {
  const assumed = `${flow.toFixed(2)} m/s`;
  const doc = inv.airflow;
  if (!doc || doc === 'unknown' || doc.toLowerCase().includes('exact')) {
    return {
      parameter: 'Airflow',
      assumedValue: assumed,
      psiDocumentedValue: doc || 'unknown',
      state: 'missing',
      explanation: 'Exact flow velocity bounds are not documented in our local index for this investigation.',
    };
  }
  const nums = doc.match(/\d+(\.\d+)?/g)?.map(Number) || [];
  if (nums.length >= 2) {
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const inRange = flow >= min - 0.02 && flow <= max + 0.02;
    return {
      parameter: 'Airflow',
      assumedValue: assumed,
      psiDocumentedValue: doc,
      state: inRange ? 'match' : 'differ',
      explanation: inRange
        ? `Assumed ${assumed} falls within documented PSI flow sweep (${doc}).`
        : `Assumed ${assumed} lies outside documented PSI flow velocity (${doc}).`,
    };
  }
  if (nums.length === 1) {
    const close = Math.abs(flow - nums[0]) <= 0.06;
    return {
      parameter: 'Airflow',
      assumedValue: assumed,
      psiDocumentedValue: doc,
      state: close ? 'match' : 'differ',
      explanation: close
        ? `Assumed ${assumed} is comparable to documented test flow (${doc}).`
        : `Assumed ${assumed} differs from documented flow (${doc}).`,
    };
  }
  return {
    parameter: 'Airflow',
    assumedValue: assumed,
    psiDocumentedValue: doc,
    state: 'missing',
    explanation: 'Flow velocity could not be numerically matched from indexed text.',
  };
}

function checkFuelMatch(inv: PsiInvestigationRecord, fuelClass: HabitatAssumptions['fuelClass']): HabitatParameterComparison {
  const isMatch = inv.fuelCategory === fuelClass || (inv.fuelCategory === 'Mixed / Multi-Fuel' && (fuelClass === 'Cellulosic / Composite Fabric' || fuelClass === 'Solid Polymer (PMMA)' || fuelClass === 'Electrical Wire Insulation'));
  return {
    parameter: 'Fuel / Material Class',
    assumedValue: fuelClass,
    psiDocumentedValue: `${inv.fuelCategory} (${inv.fuel})`,
    state: isMatch ? 'match' : 'differ',
    explanation: isMatch
      ? `PSI fuel specimen aligns with selected material category (${fuelClass}).`
      : `PSI test used ${inv.fuelCategory}, which differs from selected ${fuelClass}.`,
  };
}

export function evaluateHabitatRelevance(assumptions: HabitatAssumptions): {
  bridges: HabitatInvestigationBridge[];
  summary: {
    relevantCount: number;
    hasPartialGravityGap: boolean;
    totalMatches: number;
    totalDiffers: number;
    totalMissing: number;
  };
} {
  const bridges: HabitatInvestigationBridge[] = PSI_INVESTIGATIONS_REGISTRY.map(inv => {
    const parameters: HabitatParameterComparison[] = [
      checkGravityMatch(inv, assumptions.gravityG),
      checkOxygenMatch(inv, assumptions.oxygenPct),
      checkPressureMatch(inv, assumptions.pressureKpa),
      checkAirflowMatch(inv, assumptions.airflowMs),
      checkFuelMatch(inv, assumptions.fuelClass),
    ];

    const matchCount = parameters.filter(p => p.state === 'match').length;
    const differCount = parameters.filter(p => p.state === 'differ').length;
    const missingCount = parameters.filter(p => p.state === 'missing').length;

    return {
      investigation: inv,
      matchCount,
      differCount,
      missingCount,
      parameters,
    };
  }).sort((a, b) => {
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    return a.differCount - b.differCount;
  });

  const topBridges = bridges.slice(0, 8);
  return {
    bridges: topBridges,
    summary: {
      relevantCount: bridges.filter(b => b.matchCount >= 2).length,
      hasPartialGravityGap: assumptions.gravityG >= 0.05 && assumptions.gravityG < 0.9,
      totalMatches: topBridges.reduce((a, b) => a + b.matchCount, 0),
      totalDiffers: topBridges.reduce((a, b) => a + b.differCount, 0),
      totalMissing: topBridges.reduce((a, b) => a + b.missingCount, 0),
    },
  };
}
