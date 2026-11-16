import React, { useEffect, useMemo, useState } from 'react';
import { FuelCategory, HabitatAssumptions, HabitatEnvironmentId } from '../../types';
import {
  DEFAULT_HABITAT_PROFILES,
  evaluateHabitatRelevance,
  ParameterComparisonState,
} from '../../services/habitatBridgeService';
import { sound } from '../../utils/audio';
import { ExternalLink, RotateCcw } from 'lucide-react';

interface HabitatRelevancePanelProps {
  onInspectInvestigationDna?: (investigationId: string) => void;
  onAskAiAboutHabitat?: (prompt: string, investigationIds: string[]) => void;
  focusInvestigationId?: string;
}

const FUEL_OPTIONS: FuelCategory[] = [
  'Electrical Wire Insulation',
  'Cellulosic / Composite Fabric',
  'Solid Polymer (PMMA)',
  'Liquid Droplet',
  'Gaseous Hydrocarbon',
  'Mixed / Multi-Fuel',
];

const ENV_LIST: { id: HabitatEnvironmentId; shortLabel: string }[] = [
  { id: 'iss', shortLabel: 'ISS' },
  { id: 'lunar-habitat', shortLabel: 'Lunar Habitat' },
  { id: 'lunar-rover', shortLabel: 'Lunar Rover' },
  { id: 'mars-habitat', shortLabel: 'Mars Habitat' },
  { id: 'mars-rover', shortLabel: 'Mars Rover' },
];

export const HabitatRelevancePanel: React.FC<HabitatRelevancePanelProps> = ({
  onInspectInvestigationDna,
  onAskAiAboutHabitat,
  focusInvestigationId,
}) => {
  const [selectedEnv, setSelectedEnv] = useState<HabitatEnvironmentId>('lunar-habitat');
  const [assumptions, setAssumptions] = useState<HabitatAssumptions>(
    DEFAULT_HABITAT_PROFILES['lunar-habitat']
  );

  const handleSelectEnv = (envId: HabitatEnvironmentId) => {
    sound.playClick();
    setSelectedEnv(envId);
    setAssumptions(DEFAULT_HABITAT_PROFILES[envId]);
  };

  const resetCurrent = () => {
    sound.playClick();
    setAssumptions(DEFAULT_HABITAT_PROFILES[selectedEnv]);
  };

  const evaluation = useMemo(() => evaluateHabitatRelevance(assumptions), [assumptions]);

  const sortedBridges = useMemo(() => {
    if (!focusInvestigationId) return evaluation.bridges;
    const focused = evaluation.bridges.find(b => b.investigation.id === focusInvestigationId);
    if (!focused) return evaluation.bridges;
    return [focused, ...evaluation.bridges.filter(b => b.investigation.id !== focusInvestigationId)];
  }, [evaluation.bridges, focusInvestigationId]);

  const [selectedBridgeId, setSelectedBridgeId] = useState<string>(
    sortedBridges[0]?.investigation.id || 'PSI-20'
  );

  useEffect(() => {
    if (focusInvestigationId && sortedBridges.some(b => b.investigation.id === focusInvestigationId)) {
      setSelectedBridgeId(focusInvestigationId);
    } else if (!sortedBridges.some(b => b.investigation.id === selectedBridgeId) && sortedBridges[0]) {
      setSelectedBridgeId(sortedBridges[0].investigation.id);
    }
  }, [focusInvestigationId, sortedBridges, selectedBridgeId]);

  const activeBridge =
    sortedBridges.find(b => b.investigation.id === selectedBridgeId) || sortedBridges[0];

  const renderStateLabel = (state: ParameterComparisonState) => {
    if (state === 'match') {
      return (
        <span className="font-mono text-[11px] text-emerald-400 whitespace-nowrap">
          ✓ Matches PSI
        </span>
      );
    }
    if (state === 'differ') {
      return (
        <span className="font-mono text-[11px] text-amber-400 whitespace-nowrap">
          ≠ Differs
        </span>
      );
    }
    return (
      <span className="font-mono text-[11px] text-rose-400 whitespace-nowrap">
        — Missing evidence
      </span>
    );
  };

  const totalChecked = Math.max(
    1,
    evaluation.summary.totalMatches +
      evaluation.summary.totalDiffers +
      evaluation.summary.totalMissing
  );
  const pctMatch = (evaluation.summary.totalMatches / totalChecked) * 100;
  const pctDiffer = (evaluation.summary.totalDiffers / totalChecked) * 100;
  const pctMissing = (evaluation.summary.totalMissing / totalChecked) * 100;

  return (
    <div className="space-y-6 font-sans">
      {/* Header & Environment Switcher */}
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-display font-semibold text-white">
              Habitat Relevance Explorer
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Compare user-defined environment assumptions against indexed NASA PSI combustion experiments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Segmented Environment Control */}
            <div className="inline-flex flex-wrap items-center p-1 rounded-lg bg-[#0b101b] border border-slate-800 text-xs">
              {ENV_LIST.map(item => {
                const active = selectedEnv === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectEnv(item.id)}
                    className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.shortLabel}
                  </button>
                );
              })}
            </div>

            {onAskAiAboutHabitat && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  const topIds = sortedBridges.slice(0, 3).map(b => b.investigation.id);
                  onAskAiAboutHabitat(
                    `Compare user-defined habitat assumptions for "${assumptions.label}" (${assumptions.gravityG}g, ${assumptions.oxygenPct}% O₂, ${assumptions.pressureKpa} kPa, ${assumptions.airflowMs} m/s, Fuel: ${assumptions.fuelClass}) against the most relevant indexed NASA PSI investigations (${topIds.join(', ')}). Clearly state which parameters match, which differ, and why partial-gravity or missing PSI evidence means PSI experiments do not directly predict real habitat fires.`,
                    topIds
                  );
                }}
                className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
              >
                Ask Frags AI
              </button>
            )}
          </div>
        </div>

        {/* Quiet Inline Methodological Boundary Note */}
        <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800/70 pt-3">
          <span className="text-slate-200 font-medium">Note on assumptions:</span>{' '}
          The parameters on the left are editable user assumptions, not official NASA vehicle specifications. Documented PSI experiments serve as comparative reference conditions and do not directly predict full-scale fires inside real lunar or Martian habitats.
        </p>
      </div>

      {/* Main Split Console: Left = Assumptions Control Column, Right = Ranked PSI Matrix & Parameter Diff */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (4 cols): User Assumption Inputs & Overall Coverage Bar */}
        <div className="lg:col-span-4 rounded-lg border border-slate-800 bg-[#0a0f1c]/95 divide-y divide-slate-800/80">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-white">{assumptions.label}</div>
              <div className="text-[11px] text-slate-400">User-defined environment assumptions</div>
            </div>
            <button
              type="button"
              onClick={resetCurrent}
              className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
              title="Reset to baseline assumptions"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400">Gravity</span>
                <span className="font-mono tabular-nums text-slate-100 font-medium">
                  {assumptions.gravityG.toFixed(2)} g
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={assumptions.gravityG}
                onChange={(e) => setAssumptions(p => ({ ...p, gravityG: parseFloat(e.target.value) }))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400">Oxygen concentration</span>
                <span className="font-mono tabular-nums text-slate-100 font-medium">
                  {assumptions.oxygenPct.toFixed(1)} % O₂
                </span>
              </div>
              <input
                type="range"
                min={14}
                max={36}
                step={0.5}
                value={assumptions.oxygenPct}
                onChange={(e) => setAssumptions(p => ({ ...p, oxygenPct: parseFloat(e.target.value) }))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400">Cabin pressure</span>
                <span className="font-mono tabular-nums text-slate-100 font-medium">
                  {assumptions.pressureKpa.toFixed(1)} kPa
                </span>
              </div>
              <input
                type="range"
                min={30}
                max={105}
                step={0.5}
                value={assumptions.pressureKpa}
                onChange={(e) => setAssumptions(p => ({ ...p, pressureKpa: parseFloat(e.target.value) }))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400">Ventilation airflow</span>
                <span className="font-mono tabular-nums text-slate-100 font-medium">
                  {assumptions.airflowMs.toFixed(2)} m/s
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={0.4}
                step={0.01}
                value={assumptions.airflowMs}
                onChange={(e) => setAssumptions(p => ({ ...p, airflowMs: parseFloat(e.target.value) }))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-xs text-slate-400 block">Fuel / material class</label>
              <select
                value={assumptions.fuelClass}
                onChange={(e) => setAssumptions(p => ({ ...p, fuelClass: e.target.value as FuelCategory }))}
                className="w-full px-2.5 py-2 rounded-md bg-[#060913] border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
              >
                {FUEL_OPTIONS.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              {assumptions.assumptionNotes}
            </p>
          </div>

          {/* Aggregate Evidence Summary */}
          <div className="p-4 space-y-2.5 bg-[#070b14]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Top-8 PSI parameter overlap</span>
              <span className="font-mono tabular-nums text-[11px] text-slate-400">
                {evaluation.summary.relevantCount} with ≥2 matches
              </span>
            </div>

            <div className="h-2 w-full rounded-sm overflow-hidden flex bg-slate-900">
              <div style={{ width: `${pctMatch}%` }} className="bg-emerald-500/80" />
              <div style={{ width: `${pctDiffer}%` }} className="bg-amber-500/80" />
              <div style={{ width: `${pctMissing}%` }} className="bg-rose-500/80" />
            </div>

            <div className="flex items-center justify-between font-mono tabular-nums text-[11px] text-slate-400">
              <span className="text-emerald-400">{evaluation.summary.totalMatches} match</span>
              <span className="text-amber-400">{evaluation.summary.totalDiffers} differ</span>
              <span className="text-rose-400">{evaluation.summary.totalMissing} missing</span>
            </div>

            {evaluation.summary.hasPartialGravityGap && (
              <p className="text-[11px] text-rose-300 leading-relaxed pt-1 border-t border-slate-800/70">
                Partial gravity ({assumptions.gravityG.toFixed(2)} g) has zero flight combustion records in the currently indexed PSI collection.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (8 cols): Ranked PSI Matrix + Active Parameter-by-Parameter Table */}
        <div className="lg:col-span-8 space-y-5 min-w-0">
          {/* 1. Ranked PSI Comparison Table */}
          <div className="rounded-lg border border-slate-800 bg-[#0a0f1c]/95 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Most Relevant Indexed PSI Investigations
                </h4>
                <p className="text-[11px] text-slate-400">
                  Select any row to inspect parameter matches, differences, and missing experimental evidence.
                </p>
              </div>
              <span className="font-mono tabular-nums text-[11px] text-slate-400 whitespace-nowrap">
                {sortedBridges.length} shown
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#070b14] font-mono text-[11px] text-slate-400">
                    <th className="py-2.5 px-4 font-medium">PSI ID</th>
                    <th className="py-2.5 px-3 font-medium">Investigation</th>
                    <th className="py-2.5 px-3 font-medium hidden sm:table-cell">Fuel Class</th>
                    <th className="py-2.5 px-3 font-medium text-right">Match</th>
                    <th className="py-2.5 px-3 font-medium text-right">Differ</th>
                    <th className="py-2.5 px-4 font-medium text-right">Missing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {sortedBridges.map(bridge => {
                    const isSelected = activeBridge?.investigation.id === bridge.investigation.id;
                    return (
                      <tr
                        key={bridge.investigation.id}
                        onClick={() => {
                          sound.playClick();
                          setSelectedBridgeId(bridge.investigation.id);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-slate-800/80 text-white'
                            : 'text-slate-300 hover:bg-slate-900/70'
                        }`}
                      >
                        <td className="py-2.5 px-4 font-mono tabular-nums text-cyan-300 font-medium whitespace-nowrap">
                          {bridge.investigation.id}
                        </td>
                        <td className="py-2.5 px-3 font-medium max-w-[260px] truncate">
                          {bridge.investigation.title}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 hidden sm:table-cell max-w-[180px] truncate">
                          {bridge.investigation.fuelCategory}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-400">
                          {bridge.matchCount}/5
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-400">
                          {bridge.differCount}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-rose-400">
                          {bridge.missingCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Selected Investigation Parameter-by-Parameter Delta Table */}
          {activeBridge && (
            <div className="rounded-lg border border-slate-800 bg-[#0a0f1c]/95 overflow-hidden">
              <div className="px-4 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                    <span className="text-cyan-300 font-semibold">{activeBridge.investigation.id}</span>
                    <span>·</span>
                    <span>{activeBridge.investigation.acronym}</span>
                    <span>·</span>
                    <span>{activeBridge.investigation.platform}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white mt-0.5">
                    {activeBridge.investigation.title}
                  </h4>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs">
                  {onInspectInvestigationDna && (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        onInspectInvestigationDna(activeBridge.investigation.id);
                      }}
                      className="text-cyan-300 hover:text-white underline underline-offset-4 cursor-pointer whitespace-nowrap"
                    >
                      Open Combustion DNA
                    </button>
                  )}
                  <a
                    href={activeBridge.investigation.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-slate-300 hover:text-white underline underline-offset-4 whitespace-nowrap"
                  >
                    <span>NASA PSI record</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-[#070b14] font-mono text-[11px] text-slate-400">
                      <th className="py-2.5 px-4 font-medium">Parameter</th>
                      <th className="py-2.5 px-3 font-medium">User Assumption</th>
                      <th className="py-2.5 px-3 font-medium">PSI Documented</th>
                      <th className="py-2.5 px-4 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {activeBridge.parameters.map(param => (
                      <tr key={param.parameter} className="align-top">
                        <td className="py-3 px-4 font-medium text-slate-200 whitespace-nowrap">
                          {param.parameter}
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-slate-300">
                          {param.assumedValue}
                        </td>
                        <td className="py-3 px-3 space-y-1">
                          <div className="font-mono text-slate-200">{param.psiDocumentedValue}</div>
                          <div className="text-[11px] text-slate-400 leading-relaxed">
                            {param.explanation}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {renderStateLabel(param.state)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

