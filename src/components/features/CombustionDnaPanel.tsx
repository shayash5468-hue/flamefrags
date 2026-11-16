import React, { useMemo, useState } from 'react';
import { CombustionDnaProfile, PsiFileRecord } from '../../types';
import {
  buildDnaFromDataset,
  compareCombustionDna,
  findSimilarInvestigations,
  getAllInvestigationDnaProfiles,
} from '../../services/combustionDnaService';
import { sound } from '../../utils/audio';
import { EpistemicBadge } from './EvidenceChainPanel';
import {
  Dna,
  GitCompare,
  ExternalLink,
  Search,
  Sparkles,
  Bot,
  Activity,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface CombustionDnaPanelProps {
  datasets: PsiFileRecord[];
  selectedEntityId?: string;
  onSelectEntityId?: (id: string) => void;
  onRunDetectiveOnDataset?: (datasetId: string) => void;
  onAskAiAboutInvestigation?: (investigationId: string) => void;
  onOpenHabitatBridge?: (investigationId: string) => void;
  onViewGapsForInvestigation?: (investigationId: string) => void;
}

const FingerprintBarcodeSvg: React.FC<{ profile: CombustionDnaProfile }> = ({ profile }) => {
  return (
    <svg viewBox="0 0 360 54" className="w-full h-14 rounded border border-slate-800 bg-[#050812]">
      {profile.attributes.map((attr, idx) => {
        const x = 10 + idx * 23;
        const fill =
          attr.kind === 'measured'
            ? '#10b981'
            : attr.kind === 'metadata'
            ? '#06b6d4'
            : '#334155';
        const h = attr.kind === 'measured' ? 32 : attr.kind === 'metadata' ? 24 : 10;
        const y = 38 - h;
        return (
          <g key={attr.key}>
            <rect x={x} y={y} width={14} height={h} rx={2} fill={fill} opacity={attr.kind === 'unknown' ? 0.5 : 0.9} />
            <text
              x={x + 7}
              y={49}
              textAnchor="middle"
              fontSize="7"
              fill="#64748b"
              fontFamily="JetBrains Mono, monospace"
            >
              {idx + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const DnaRadarSvg: React.FC<{ profileA: CombustionDnaProfile; profileB?: CombustionDnaProfile | null }> = ({
  profileA,
  profileB,
}) => {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 92;
  const axes = profileA.radarAxes;
  const step = (Math.PI * 2) / axes.length;

  const polygonPoints = (prof: CombustionDnaProfile) =>
    prof.radarAxes
      .map((ax, idx) => {
        const ang = idx * step - Math.PI / 2;
        const val = ax.normalizedValue === null ? 0.04 : Math.max(0.08, ax.normalizedValue);
        const r = maxR * val;
        return `${(cx + Math.cos(ang) * r).toFixed(1)},${(cy + Math.sin(ang) * r).toFixed(1)}`;
      })
      .join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[290px] aspect-square mx-auto bg-[#050812] rounded-lg border border-slate-800">
      {[0.25, 0.5, 0.75, 1.0].map(lvl => (
        <polygon
          key={lvl}
          points={axes
            .map((_, idx) => {
              const ang = idx * step - Math.PI / 2;
              return `${(cx + Math.cos(ang) * maxR * lvl).toFixed(1)},${(cy + Math.sin(ang) * maxR * lvl).toFixed(1)}`;
            })
            .join(' ')}
          fill="none"
          stroke="#1e293b"
          strokeWidth={1}
        />
      ))}

      {axes.map((ax, idx) => {
        const ang = idx * step - Math.PI / 2;
        const x2 = cx + Math.cos(ang) * maxR;
        const y2 = cy + Math.sin(ang) * maxR;
        const lx = cx + Math.cos(ang) * (maxR + 24);
        const ly = cy + Math.sin(ang) * (maxR + 18);
        return (
          <g key={ax.label}>
            <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="#1e293b" strokeWidth={1} />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="8.5"
              fill={ax.normalizedValue === null ? '#475569' : '#94a3b8'}
              fontFamily="JetBrains Mono, monospace"
            >
              {ax.label}
            </text>
          </g>
        );
      })}

      {/* Profile A */}
      <polygon
        points={polygonPoints(profileA)}
        fill="rgba(6, 182, 212, 0.22)"
        stroke="#06b6d4"
        strokeWidth={2}
      />

      {/* Profile B (Optional comparison overlay) */}
      {profileB && (
        <polygon
          points={polygonPoints(profileB)}
          fill="rgba(245, 158, 11, 0.16)"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="4 3"
        />
      )}

      {/* Vertex Markers (Gray hollow circle if unknown!) */}
      {axes.map((ax, idx) => {
        const ang = idx * step - Math.PI / 2;
        const val = ax.normalizedValue === null ? 0.04 : Math.max(0.08, ax.normalizedValue);
        const px = cx + Math.cos(ang) * maxR * val;
        const py = cy + Math.sin(ang) * maxR * val;
        return (
          <circle
            key={ax.label}
            cx={px}
            cy={py}
            r={ax.normalizedValue === null ? 3 : 3.5}
            fill={ax.normalizedValue === null ? '#0f172a' : '#22d3ee'}
            stroke={ax.normalizedValue === null ? '#475569' : '#ecfeff'}
            strokeWidth={1.2}
          />
        );
      })}
    </svg>
  );
};

export const CombustionDnaPanel: React.FC<CombustionDnaPanelProps> = ({
  datasets,
  selectedEntityId,
  onSelectEntityId,
  onRunDetectiveOnDataset,
  onAskAiAboutInvestigation,
  onOpenHabitatBridge,
  onViewGapsForInvestigation,
}) => {
  const allProfiles = useMemo(() => {
    const invProfiles = getAllInvestigationDnaProfiles(datasets);
    const customProfiles = datasets
      .filter(d => !d.investigationId)
      .map(d => buildDnaFromDataset(d));
    return [...invProfiles, ...customProfiles];
  }, [datasets]);

  const [internalId, setInternalId] = useState<string>(allProfiles[1]?.entityId || allProfiles[0]?.entityId);
  const activeId = selectedEntityId && allProfiles.some(p => p.entityId === selectedEntityId)
    ? selectedEntityId
    : internalId;

  const setActiveId = (id: string) => {
    setInternalId(id);
    onSelectEntityId?.(id);
  };

  const [compareId, setCompareId] = useState<string>('PSI-159');
  const [compareMode, setCompareMode] = useState<boolean>(false);

  const activeProfile = allProfiles.find(p => p.entityId === activeId) || allProfiles[0];
  const compareProfile = compareMode
    ? allProfiles.find(p => p.entityId === compareId && p.entityId !== activeProfile.entityId) ||
      allProfiles.find(p => p.entityId !== activeProfile.entityId) ||
      null
    : null;

  const comparison = useMemo(
    () => (compareProfile ? compareCombustionDna(activeProfile, compareProfile) : null),
    [activeProfile, compareProfile]
  );

  const similarList = useMemo(
    () => findSimilarInvestigations(activeProfile, allProfiles, 4),
    [activeProfile, allProfiles]
  );

  const linkedDataset = useMemo(
    () =>
      datasets.find(
        d =>
          d.id === activeProfile.entityId ||
          d.investigationId === activeProfile.entityId ||
          activeProfile.sourceFiles.includes(d.filename)
      ),
    [datasets, activeProfile]
  );

  return (
    <div className="space-y-5 font-sans">
      {/* Header & Selector Toolbar */}
      <div className="rounded-lg border border-slate-800 bg-[#0a0f1c]/95 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400">
              <Dna className="w-4 h-4" />
              <span>COMBUSTION DNA · SCIENTIFIC INVESTIGATION FINGERPRINT</span>
            </div>
            <h3 className="text-lg sm:text-xl font-display font-bold text-white mt-1">
              {activeProfile.identifier}: {activeProfile.name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Generated strictly from indexed PSI metadata and loaded dataset measurements. Unavailable parameters are labeled <span className="font-mono text-slate-300">unknown</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              value={activeProfile.entityId}
              onChange={(e) => {
                sound.playClick();
                setActiveId(e.target.value);
              }}
              className="px-3 py-2 rounded-md bg-[#060913] border border-slate-700 text-xs font-mono text-slate-100 max-w-[260px]"
            >
              {allProfiles.map(p => (
                <option key={p.entityId} value={p.entityId}>
                  {p.identifier} — {p.name.slice(0, 36)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setCompareMode(prev => !prev);
              }}
              className={`px-3 py-2 rounded-md border text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                compareMode
                  ? 'bg-amber-950/60 border-amber-600 text-amber-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>{compareMode ? 'Comparing Two' : 'Compare Fingerprint'}</span>
            </button>
          </div>
        </div>

        {/* Cross-Module Scientific Actions */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {linkedDataset && onRunDetectiveOnDataset && (
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onRunDetectiveOnDataset(linkedDataset.id);
              }}
              className="px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Run Experiment Detective ({linkedDataset.filename.slice(0, 22)})</span>
            </button>
          )}
          {onAskAiAboutInvestigation && (
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onAskAiAboutInvestigation(activeProfile.entityId);
              }}
              className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Ask Frags AI</span>
            </button>
          )}
          {onOpenHabitatBridge && (
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenHabitatBridge(activeProfile.entityId);
              }}
              className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-purple-300 font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Explore Habitat Relevance</span>
            </button>
          )}
          {onViewGapsForInvestigation && (
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onViewGapsForInvestigation(activeProfile.entityId);
              }}
              className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>View Related Gaps</span>
            </button>
          )}
          {activeProfile.nasaLink && (
            <a
              href={activeProfile.nasaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs flex items-center gap-1.5 ml-auto"
            >
              <span>NASA PSI Record</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Visual Fingerprint Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 items-start">
          {/* Left: Radar + Barcode */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-lg bg-[#060a14] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-300 font-semibold">RADIAL PARAMETER SIGNATURE</span>
                <span className="text-slate-400">
                  {activeProfile.assessedFieldCount}/{activeProfile.totalFieldCount} fields known
                </span>
              </div>
              <DnaRadarSvg profileA={activeProfile} profileB={compareProfile} />
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-cyan-500/40 border border-cyan-400 inline-block" />
                  <span>{activeProfile.identifier}</span>
                </span>
                {compareProfile && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-amber-500/30 border border-amber-400 inline-block" />
                    <span>{compareProfile.identifier}</span>
                  </span>
                )}
                <span>Hollow ring = unknown</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#060a14] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>15-LOCUS METADATA & TELEMETRY BARCODE</span>
                <span className="text-emerald-400">■ Measured</span>
              </div>
              <FingerprintBarcodeSvg profile={activeProfile} />
              <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
                <span><span className="text-emerald-400">■</span> Measured Dataset</span>
                <span><span className="text-cyan-400">■</span> Documented Metadata</span>
                <span><span className="text-slate-500">■</span> Unknown</span>
              </div>
            </div>
          </div>

          {/* Right: Complete 15-Attribute Structured Fingerprint */}
          <div className="lg:col-span-7 rounded-lg border border-slate-800 bg-[#060a14] divide-y divide-slate-800/80 max-h-[470px] overflow-y-auto">
            {activeProfile.attributes.map((attr, idx) => (
              <div key={attr.key} className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] text-slate-400">
                    #{idx + 1} · {attr.label}
                  </div>
                  <div className={`mt-0.5 break-words ${attr.kind === 'unknown' ? 'font-mono text-slate-500 italic' : 'text-slate-100'}`}>
                    {attr.key === 'nasaLinks' && attr.value.startsWith('http') ? (
                      <a href={attr.value} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline font-mono text-[11px]">
                        {attr.value}
                      </a>
                    ) : (
                      attr.value
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <EpistemicBadge tag={attr.tag} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison Panel (When Compare Mode Enabled) */}
      {compareMode && comparison && (
        <div className="rounded-lg border border-amber-800/60 bg-[#0a0f1c]/95 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="font-mono text-[11px] text-amber-400 font-semibold">
                FINGERPRINT COMPARISON · TRANSPARENT ATTRIBUTE OVERLAP
              </div>
              <p className="text-xs text-slate-300 mt-0.5">{comparison.methodNote}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Compare with:</span>
              <select
                value={compareId}
                onChange={(e) => {
                  sound.playClick();
                  setCompareId(e.target.value);
                }}
                className="px-2.5 py-1.5 rounded bg-[#060913] border border-slate-700 text-xs font-mono text-amber-300 max-w-[240px]"
              >
                {allProfiles
                  .filter(p => p.entityId !== activeProfile.entityId)
                  .map(p => (
                    <option key={p.entityId} value={p.entityId}>
                      {p.identifier} — {p.name.slice(0, 30)}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Shared */}
            <div className="p-3.5 rounded-lg bg-[#071112] border border-emerald-900/60 space-y-2">
              <div className="font-mono text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Shared Conditions ({comparison.sharedAttributes.length})</span>
              </div>
              {comparison.sharedAttributes.length === 0 ? (
                <div className="text-slate-400">No mutually documented matching dimensions.</div>
              ) : (
                comparison.sharedAttributes.map(s => (
                  <div key={s.label} className="p-2 rounded bg-[#050b0c] border border-slate-800/80">
                    <div className="font-mono text-[10px] text-slate-400">{s.label}</div>
                    <div className="text-emerald-200 mt-0.5">{s.valueA}</div>
                  </div>
                ))
              )}
            </div>

            {/* Differing */}
            <div className="p-3.5 rounded-lg bg-[#140e08] border border-amber-900/60 space-y-2">
              <div className="font-mono text-[11px] text-amber-400 font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Differing Conditions ({comparison.differingAttributes.length})</span>
              </div>
              {comparison.differingAttributes.length === 0 ? (
                <div className="text-slate-400">No differing documented dimensions found.</div>
              ) : (
                comparison.differingAttributes.map(d => (
                  <div key={d.label} className="p-2 rounded bg-[#0c0805] border border-slate-800/80 space-y-0.5">
                    <div className="font-mono text-[10px] text-slate-400">{d.label}</div>
                    <div className="text-cyan-300">A: {d.valueA}</div>
                    <div className="text-amber-300">B: {d.valueB}</div>
                  </div>
                ))
              )}
            </div>

            {/* Uncomparable */}
            <div className="p-3.5 rounded-lg bg-[#0b0e18] border border-slate-800 space-y-2">
              <div className="font-mono text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Unassessable / Unknown ({comparison.uncomparableAttributes.length})</span>
              </div>
              {comparison.uncomparableAttributes.map(u => (
                <div key={u.label} className="p-2 rounded bg-[#060911] border border-slate-800/80 space-y-0.5">
                  <div className="font-mono text-[10px] text-slate-400">{u.label}</div>
                  <div className="text-slate-400 font-mono text-[11px]">A: {u.valueA}</div>
                  <div className="text-slate-400 font-mono text-[11px]">B: {u.valueB}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Investigations with Similar Documented Conditions */}
      <div className="rounded-lg border border-slate-800 bg-[#0a0f1c]/95 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-mono text-xs text-slate-200 font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Investigations with Similar Documented Conditions</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            Ranked by verified shared attributes (never unverified %)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {similarList.map(({ profile, comparison: comp }) => (
            <div
              key={profile.entityId}
              className="p-3.5 rounded-lg bg-[#060913] border border-slate-800 flex flex-col justify-between gap-2.5"
            >
              <div>
                <div className="flex items-center justify-between gap-2 font-mono text-xs">
                  <span className="text-cyan-300 font-semibold">{profile.identifier}</span>
                  <span className="text-emerald-300 tabular-nums">
                    {comp.sharedCount}/{comp.comparableCount} match
                  </span>
                </div>
                <div className="text-xs text-slate-100 font-medium mt-1 line-clamp-2">{profile.name}</div>
                <div className="text-[11px] text-slate-400 mt-1.5">
                  Shared: {comp.sharedAttributes.map(s => s.label).join(', ') || 'None'}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setActiveId(profile.entityId);
                  }}
                  className="text-cyan-400 hover:underline cursor-pointer"
                >
                  Open DNA
                </button>
                <span className="text-slate-700">·</span>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setCompareId(profile.entityId);
                    setCompareMode(true);
                  }}
                  className="text-amber-300 hover:underline cursor-pointer"
                >
                  Compare
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
