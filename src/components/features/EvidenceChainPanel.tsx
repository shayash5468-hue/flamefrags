import React, { useState } from 'react';
import { EpistemicTag, EvidenceChainRecord } from '../../types';
import { sound } from '../../utils/audio';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileSpreadsheet,
  GitBranch,
  AlertTriangle,
  FlaskConical,
  Calculator,
  Bot,
} from 'lucide-react';

interface EvidenceChainPanelProps {
  chain: EvidenceChainRecord;
  defaultOpen?: boolean;
  onInspectDataset?: (datasetId: string) => void;
  onInspectInvestigationDna?: (investigationId: string) => void;
}

const TAG_STYLES: Record<EpistemicTag, string> = {
  'NASA-Reported': 'bg-cyan-950/70 text-cyan-300 border-cyan-800/80',
  'Measured Data': 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80',
  'Derived Calculation': 'bg-indigo-950/70 text-indigo-300 border-indigo-800/80',
  'AI Interpretation': 'bg-amber-950/70 text-amber-300 border-amber-800/80',
  Unverified: 'bg-slate-900 text-slate-400 border-slate-700',
};

export const EpistemicBadge: React.FC<{ tag: EpistemicTag }> = ({ tag }) => (
  <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-mono font-medium whitespace-nowrap ${TAG_STYLES[tag]}`}>
    {tag}
  </span>
);

export const EvidenceChainPanel: React.FC<EvidenceChainPanelProps> = ({
  chain,
  defaultOpen = false,
  onInspectDataset,
  onInspectInvestigationDna,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mt-3 rounded-lg border border-slate-800 bg-[#070b15] overflow-hidden font-sans">
      <button
        type="button"
        onClick={() => {
          sound.playClick();
          setOpen(prev => !prev);
        }}
        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-900/70 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <GitBranch className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-mono text-xs font-semibold text-slate-200 truncate">
            Evidence Chain
          </span>
          <span className="font-mono text-[10px] text-slate-400 hidden sm:inline">
            · {chain.matchedInvestigations.length} PSI ref(s) · {chain.sourceDatasets.length} dataset(s) · {chain.calculationsPerformed.length} calc(s)
          </span>
        </div>
        <span className="flex items-center gap-1 font-mono text-[10px] text-cyan-400 shrink-0">
          <span>{open ? 'Collapse' : 'Inspect Traceability'}</span>
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-800/90 divide-y divide-slate-800/70 text-xs">
          {/* 1. Original Question */}
          <div className="p-3.5 space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              1. Original Question / Task
            </div>
            <div className="text-slate-200 font-medium">{chain.originalQuestion}</div>
          </div>

          {/* 2 & 3. Investigations + Source Datasets */}
          <div className="p-3.5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FlaskConical className="w-3 h-3 text-cyan-400" />
                <span>2. Relevant NASA Investigation(s)</span>
              </div>
              {chain.matchedInvestigations.length === 0 ? (
                <div className="text-slate-400 font-mono text-[11px]">
                  No specific PSI accession matched in local index <EpistemicBadge tag="Unverified" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  {chain.matchedInvestigations.map(inv => (
                    <div
                      key={inv.id}
                      className="p-2 rounded bg-[#0b1120] border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-[11px] text-cyan-300 font-semibold">{inv.id}</div>
                        <div className="text-xs text-slate-200 truncate">{inv.title}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {onInspectInvestigationDna && (
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick();
                              onInspectInvestigationDna(inv.id);
                            }}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-emerald-300 cursor-pointer"
                          >
                            DNA
                          </button>
                        )}
                        {inv.link && (
                          <a
                            href={inv.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="Open NASA PSI Accession"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                <span>3. Source Dataset(s) / Documents</span>
              </div>
              {chain.sourceDatasets.length === 0 ? (
                <div className="text-slate-400 font-mono text-[11px]">
                  Grounded in indexed PSI investigation metadata (no tabular file loaded for this query).
                </div>
              ) : (
                <div className="space-y-1.5">
                  {chain.sourceDatasets.map(ds => (
                    <button
                      key={ds.id}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        onInspectDataset?.(ds.id);
                      }}
                      className="w-full p-2 rounded bg-[#0b1120] hover:bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-left cursor-pointer transition-colors"
                    >
                      <span className="font-mono text-[11px] text-emerald-300 truncate">{ds.filename}</span>
                      <span className="font-mono text-[10px] text-slate-400 uppercase shrink-0">Inspect .{ds.format} →</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 4. Documented Experimental Conditions */}
          {chain.documentedConditions.length > 0 && (
            <div className="p-3.5 space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                4. Experimental Conditions
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {chain.documentedConditions.map((cond, i) => (
                  <div key={i} className="p-2 rounded bg-[#0b1120] border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-slate-400">{cond.label}</span>
                      <EpistemicBadge tag={cond.tag} />
                    </div>
                    <div className="text-xs text-slate-200 leading-snug">{cond.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Supporting Measurements / Reported Findings */}
          {chain.supportingFindings.length > 0 && (
            <div className="p-3.5 space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                5. Supporting Measurements & Reported Findings
              </div>
              <div className="space-y-1.5">
                {chain.supportingFindings.map((f, i) => (
                  <div key={i} className="p-2 rounded bg-[#0b1120] border border-slate-800/80 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="font-mono text-[10px] text-slate-400">{f.label}: </span>
                      <span className="text-slate-200">{f.value}</span>
                    </div>
                    <EpistemicBadge tag={f.tag} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Calculations Performed */}
          {chain.calculationsPerformed.length > 0 && (
            <div className="p-3.5 space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calculator className="w-3 h-3 text-indigo-400" />
                <span>6. Calculations Performed on Data</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {chain.calculationsPerformed.map((c, i) => (
                  <div key={i} className="p-2 rounded bg-[#0b1120] border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-slate-400">{c.label}</span>
                      <EpistemicBadge tag={c.tag} />
                    </div>
                    <div className="font-mono tabular-nums text-xs text-slate-100">{c.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. AI Interpretation */}
          <div className="p-3.5 space-y-1.5 bg-[#090e1a]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Bot className="w-3 h-3 text-amber-400" />
                <span>7. Interpretation & Synthesis</span>
              </span>
              <EpistemicBadge tag="AI Interpretation" />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{chain.aiInterpretation}</p>
          </div>

          {/* 8. Limitations and Uncertainties */}
          <div className="p-3.5 space-y-1.5 bg-[#0c0a12]">
            <div className="font-mono text-[10px] uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" />
              <span>8. Limitations & Uncertainty</span>
            </div>
            <ul className="space-y-1 text-[11px] text-slate-300 list-disc pl-4">
              {chain.limitationsAndUncertainty.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
