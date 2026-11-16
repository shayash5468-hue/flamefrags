import React, { useMemo, useState } from 'react';
import { PsiFileRecord } from '../../types';
import {
  analyzePartialGravityAndGaps,
  buildResearchCoverageMatrix,
  COVERAGE_DIMENSIONS,
  CoverageDimensionKey,
  CoverageMatrixCell,
} from '../../services/researchGapService';
import { PSI_INVESTIGATIONS_REGISTRY } from '../../data/psiRegistry';
import { sound } from '../../utils/audio';
import {
  AlertTriangle,
  Bot,
  Compass,
  Dna,
  Grid3x3,
  HelpCircle,
  Layers,
  Zap,
} from 'lucide-react';

interface ResearchGapPanelProps {
  datasets: PsiFileRecord[];
  onAskAiAboutGap?: (gapPrompt: string, relatedInvestigationIds?: string[]) => void;
  onInspectInvestigationDna?: (investigationId: string) => void;
}

export const ResearchGapPanel: React.FC<ResearchGapPanelProps> = ({
  datasets,
  onAskAiAboutGap,
  onInspectInvestigationDna,
}) => {
  const [rowDim, setRowDim] = useState<CoverageDimensionKey>('fuelType');
  const [colDim, setColDim] = useState<CoverageDimensionKey>('gravityCondition');
  const [selectedCell, setSelectedCell] = useState<CoverageMatrixCell | null>(null);

  const matrix = useMemo(
    () => buildResearchCoverageMatrix(rowDim, colDim, datasets),
    [rowDim, colDim, datasets]
  );

  const partialGravity = useMemo(() => analyzePartialGravityAndGaps(), []);

  const cellStyle = (status: CoverageMatrixCell['status'], isSelected: boolean) => {
    const ring = isSelected ? 'ring-2 ring-cyan-400' : '';
    switch (status) {
      case 'substantial':
        return `bg-emerald-950/65 border-emerald-700/70 text-emerald-200 hover:bg-emerald-900/70 ${ring}`;
      case 'limited':
        return `bg-amber-950/55 border-amber-700/70 text-amber-200 hover:bg-amber-900/60 ${ring}`;
      case 'unassessable':
        return `bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800 ${ring}`;
      case 'zero':
      default:
        return `bg-[#160b10] border-rose-900/60 text-rose-300/90 hover:bg-rose-950/40 ${ring}`;
    }
  };

  return (
    <div className="space-y-5 font-sans">
      {/* 1. Interactive Coverage Matrix */}
      <div className="rounded-lg border border-slate-800 bg-[#0a0f1c]/95 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-amber-400">
              <Grid3x3 className="w-4 h-4" />
              <span>RESEARCH GAP DETECTOR · INDEXED PSI CATALOGUE AUDIT</span>
            </div>
            <h3 className="text-lg sm:text-xl font-display font-bold text-white mt-1">
              Interactive Combustion Research Coverage Matrix
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Evaluates coverage strictly across the {matrix.summary.totalIndexedInvestigations} indexed PSI investigations. Absent cells indicate gaps in the indexed catalogue—not necessarily absence of any historical study worldwide.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <label className="text-slate-400">Rows:</label>
            <select
              value={rowDim}
              onChange={(e) => {
                sound.playClick();
                setRowDim(e.target.value as CoverageDimensionKey);
                setSelectedCell(null);
              }}
              className="px-2.5 py-1.5 rounded bg-[#060913] border border-slate-700 text-slate-100"
            >
              {COVERAGE_DIMENSIONS.map(d => (
                <option key={d.key} value={d.key}>{d.label}</option>
              ))}
            </select>

            <label className="text-slate-400 ml-1">Cols:</label>
            <select
              value={colDim}
              onChange={(e) => {
                sound.playClick();
                setColDim(e.target.value as CoverageDimensionKey);
                setSelectedCell(null);
              }}
              className="px-2.5 py-1.5 rounded bg-[#060913] border border-slate-700 text-cyan-300"
            >
              {COVERAGE_DIMENSIONS.map(d => (
                <option key={d.key} value={d.key}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded bg-[#061210] border border-emerald-900/60">
            <div className="font-mono text-[10px] text-emerald-400">● SUBSTANTIAL COVERAGE</div>
            <div className="font-mono tabular-nums text-xl font-bold text-white mt-0.5">
              {matrix.summary.substantialCells} <span className="text-xs font-normal text-slate-400">cells (≥3)</span>
            </div>
          </div>
          <div className="p-3 rounded bg-[#151007] border border-amber-900/60">
            <div className="font-mono text-[10px] text-amber-400">▲ LIMITED COVERAGE</div>
            <div className="font-mono tabular-nums text-xl font-bold text-white mt-0.5">
              {matrix.summary.limitedCells} <span className="text-xs font-normal text-slate-400">cells (1–2)</span>
            </div>
          </div>
          <div className="p-3 rounded bg-[#17090d] border border-rose-900/60">
            <div className="font-mono text-[10px] text-rose-400">✖ ZERO MATCHING RECORDS</div>
            <div className="font-mono tabular-nums text-xl font-bold text-white mt-0.5">
              {matrix.summary.zeroRecordCells} <span className="text-xs font-normal text-slate-400">gap cells</span>
            </div>
          </div>
          <div className="p-3 rounded bg-[#0c101b] border border-slate-800">
            <div className="font-mono text-[10px] text-slate-400">? MISSING METADATA</div>
            <div className="font-mono tabular-nums text-xl font-bold text-white mt-0.5">
              {matrix.summary.unknownBucketRecords} <span className="text-xs font-normal text-slate-400">records unassessed</span>
            </div>
          </div>
        </div>

        {/* Matrix Grid */}
        <div className="overflow-x-auto border border-slate-800 rounded-lg bg-[#050812]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0b1120] border-b border-slate-800 font-mono text-[11px] text-slate-300">
                <th className="p-3 border-r border-slate-800 min-w-[180px]">
                  {COVERAGE_DIMENSIONS.find(d => d.key === rowDim)?.label} \ {COVERAGE_DIMENSIONS.find(d => d.key === colDim)?.label}
                </th>
                {matrix.colBuckets.map(cb => (
                  <th key={cb} className="p-2.5 text-center font-medium min-w-[130px] border-r border-slate-800/70">
                    {cb}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {matrix.rowBuckets.map(rb => (
                <tr key={rb}>
                  <td className="p-3 font-medium text-slate-200 bg-[#080d19] border-r border-slate-800">
                    {rb}
                  </td>
                  {matrix.colBuckets.map(cb => {
                    const cell = matrix.cells.find(c => c.rowBucket === rb && c.colBucket === cb)!;
                    const isSelected = selectedCell?.rowBucket === rb && selectedCell?.colBucket === cb;
                    return (
                      <td key={cb} className="p-1.5 border-r border-slate-800/50">
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setSelectedCell(cell);
                          }}
                          className={`w-full py-2.5 px-2 rounded border font-mono text-center transition-colors cursor-pointer ${cellStyle(cell.status, isSelected)}`}
                        >
                          <div className="text-sm font-bold tabular-nums">{cell.count}</div>
                          <div className="text-[9px] uppercase tracking-wider opacity-85">
                            {cell.status === 'zero'
                              ? '0 records'
                              : cell.status === 'unassessable'
                              ? 'unassessed'
                              : cell.status}
                          </div>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected Cell Drilldown */}
        {selectedCell && (
          <div className="p-4 rounded-lg bg-[#060913] border border-cyan-800/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="font-mono text-[11px] text-cyan-300 font-semibold">
                  CELL AUDIT: {selectedCell.rowBucket} × {selectedCell.colBucket}
                </div>
                <p className="text-xs text-slate-200 mt-0.5">{selectedCell.note}</p>
              </div>
              {onAskAiAboutGap && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onAskAiAboutGap(
                      `Analyze this PSI research coverage finding for "${selectedCell.rowBucket}" under "${selectedCell.colBucket}": ${selectedCell.note} (${selectedCell.investigationIds.length > 0 ? `Matching records: ${selectedCell.investigationIds.join(', ')}` : 'No matching records found in the currently indexed PSI collection.'}). Why is this gap or concentration scientifically important for orbital and Artemis fire safety?`,
                      selectedCell.investigationIds
                    );
                  }}
                  className="px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Ask Frags AI to Explain This Gap</span>
                </button>
              )}
            </div>

            {selectedCell.investigationIds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedCell.investigationIds.map(id => {
                  const inv = PSI_INVESTIGATIONS_REGISTRY.find(i => i.id === id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        onInspectInvestigationDna?.(id);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-emerald-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Dna className="w-3 h-3" />
                      <span>{id}{inv ? ` · ${inv.acronym}` : ''}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-2.5 rounded bg-[#160b10] border border-rose-900/50 text-xs text-rose-200 font-mono">
                No matching records found in the currently indexed PSI collection for this combination.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Dedicated Partial-Gravity Research Section */}
      <div className="rounded-lg border border-amber-800/50 bg-[#0a0f1c]/95 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-amber-400">
              <Compass className="w-4 h-4" />
              <span>DEDICATED PARTIAL-GRAVITY & REGIME COVERAGE ANALYSIS</span>
            </div>
            <h4 className="text-base sm:text-lg font-display font-bold text-white mt-1">
              Why Partial-Gravity (Moon 0.16g & Mars 0.38g) Is Missing in PSI
            </h4>
          </div>
          {onAskAiAboutGap && (
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onAskAiAboutGap(
                  'Explain the Partial-Gravity combustion research gap described in the NASA Space Apps Flame in Freefall challenge: why does PSI contain microgravity (0G), normal-gravity baseline comparisons (1G), and E-FIELD investigations (PSI-68), yet zero partial-gravity (0.16g Lunar / 0.38g Martian) combustion datasets in the currently indexed PSI collection, and why does weak buoyancy make smoldering-to-flaming transition risky?'
                );
              }}
              className="px-3.5 py-2 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Ask Frags AI About Partial-Gravity Gaps</span>
            </button>
          )}
        </div>

        <div className="p-3.5 rounded-lg bg-[#140d08] border border-amber-900/60 text-xs sm:text-sm text-amber-100 leading-relaxed">
          <strong className="text-amber-300 font-mono text-xs block mb-1">
            NASA CHALLENGE CONTEXT · PARTIAL-GRAVITY DATA AVAILABILITY:
          </strong>
          The NASA Flame in Freefall challenge notes that <strong>no actual partial-gravity (0.16g Lunar / 0.38g Martian) combustion experimental datasets are currently available in PSI</strong>. Our automated audit confirms <strong>{partialGravity.partialGravityInvestigations.length} matching records found in the currently indexed PSI collection</strong> for partial gravity, alongside <strong>{partialGravity.pressureUnknownCount} records lacking documented ambient pressure</strong> in local metadata.
        </div>

        {/* Regime Separation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="p-3.5 rounded-lg bg-[#060d14] border border-cyan-900/60 space-y-1.5">
            <div className="font-mono text-[10px] text-cyan-400 font-semibold">1. ACTUAL MICROGRAVITY (0G)</div>
            <div className="font-mono tabular-nums text-xl font-bold text-white">
              {partialGravity.microgravityInvestigations.length} <span className="text-xs font-normal text-slate-400">PSI records</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Orbital ISS (CIR, MSG, MDCA, SoFIE) and free-flying Cygnus (Saffire I–V) experiments at ~10⁻⁶ g.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#090d16] border border-slate-800 space-y-1.5">
            <div className="font-mono text-[10px] text-slate-300 font-semibold">2. NORMAL GRAVITY (1G BASELINE)</div>
            <div className="font-mono tabular-nums text-xl font-bold text-white">
              {partialGravity.normalGravityInvestigations.length} <span className="text-xs font-normal text-slate-400">indexed · Ref only</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Ground reference curves (e.g., NASA-STD-6001 upward tests in PSI-26 BASS & lab acoustic baseline).
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0d0a1a] border border-purple-900/60 space-y-1.5">
            <div className="font-mono text-[10px] text-purple-300 font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>3. ELECTRIC-FIELD (E-FIELD)</span>
            </div>
            <div className="font-mono tabular-nums text-xl font-bold text-white">
              {partialGravity.eFieldInvestigations.length} <span className="text-xs font-normal text-slate-400">PSI-68</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              DC electrode ionic wind body-force modulation in 0G—distinct from gravitational buoyancy.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#160a0e] border border-rose-900/60 space-y-1.5">
            <div className="font-mono text-[10px] text-rose-400 font-semibold">4. PARTIAL GRAVITY (0.16–0.38g)</div>
            <div className="font-mono tabular-nums text-xl font-bold text-rose-300">
              0 <span className="text-xs font-normal text-rose-200/80">in indexed PSI</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              No matching records found in the currently indexed PSI collection for Lunar or Martian gravity.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#07120e] border border-emerald-900/60 space-y-1.5">
            <div className="font-mono text-[10px] text-emerald-400 font-semibold">5. FUTURE OPPORTUNITIES</div>
            <div className="font-mono tabular-nums text-xl font-bold text-white">
              {partialGravity.opportunityBriefs.length} <span className="text-xs font-normal text-slate-400">priorities</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Centrifuge drop-towers, parabolic partial-g runs, and Artemis exploration atmosphere testing.
            </p>
          </div>
        </div>

        {/* Future Research Opportunity Briefs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {partialGravity.opportunityBriefs.map((opp, i) => (
            <div key={i} className="p-3.5 rounded-lg bg-[#060913] border border-slate-800 space-y-2 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="font-mono text-[10px] text-cyan-400">{opp.regime}</div>
                <div className="text-xs font-semibold text-white">{opp.title}</div>
                <p className="text-[11px] text-rose-300/90 leading-snug">{opp.gapSummary}</p>
                <p className="text-[11px] text-slate-300 leading-relaxed">{opp.importance}</p>
              </div>
              {onAskAiAboutGap && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onAskAiAboutGap(`Explain the research gap and engineering importance of: ${opp.title}. ${opp.gapSummary} ${opp.importance}`);
                  }}
                  className="pt-2 border-t border-slate-800 text-left font-mono text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <Bot className="w-3 h-3" />
                  <span>Ask Frags AI to explain gap →</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
