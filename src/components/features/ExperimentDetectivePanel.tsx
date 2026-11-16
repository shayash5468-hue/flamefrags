import React, { useEffect, useMemo, useState } from 'react';
import {
  DetectiveChartSeries,
  DetectiveTaskType,
  ExperimentDetectiveResult,
  PsiFileRecord,
} from '../../types';
import {
  profileDatasetColumns,
  runExperimentDetective,
} from '../../services/experimentDetectiveService';
import { EvidenceChainPanel, EpistemicBadge } from './EvidenceChainPanel';
import { sound } from '../../utils/audio';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Calculator,
  CheckCircle2,
  Database,
  Play,
  Search,
} from 'lucide-react';

interface ExperimentDetectivePanelProps {
  datasets: PsiFileRecord[];
  activeDatasetId?: string;
  onSelectDatasetId?: (id: string) => void;
  onInspectDataset?: (datasetId: string) => void;
  onInspectInvestigationDna?: (investigationId: string) => void;
  onSendSummaryToAi?: (prompt: string) => void;
  initialTask?: DetectiveTaskType;
}

const DETECTIVE_TASKS: { id: DetectiveTaskType; label: string; promptExample: string }[] = [
  { id: 'highest-temperature', label: 'Highest Measured Temp', promptExample: 'Find runs with the highest measured flame temperature' },
  { id: 'airflow-trend', label: 'Airflow Trend', promptExample: 'Identify how a measurement changes as airflow increases' },
  { id: 'oxygen-comparison', label: 'Compare O₂ Runs', promptExample: 'Compare experimental runs with different oxygen concentrations' },
  { id: 'outlier-detection', label: 'Unusual Measurements', promptExample: 'Find unusual measurements (1.5×IQR outliers)' },
  { id: 'missing-inconsistent', label: 'Missing / Unit Audit', promptExample: 'Identify missing or inconsistent data' },
  { id: 'compare-datasets', label: 'Compare Two Datasets', promptExample: 'Compare two experimental datasets' },
  { id: 'variable-relationship', label: 'Variable Relationship', promptExample: 'Investigate relationships between measured variables' },
];

const DetectiveSvgChart: React.FC<{ chart: DetectiveChartSeries }> = ({ chart }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const w = 540;
  const h = 230;
  const padL = 54;
  const padR = 20;
  const padT = 22;
  const padB = 38;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const points = chart.points;
  if (points.length === 0) return null;

  const yVals = points.map(p => p.y);
  const yMinRaw = Math.min(...yVals);
  const yMaxRaw = Math.max(...yVals);
  const yPad = (yMaxRaw - yMinRaw) * 0.12 || 1;
  const yMin = yMinRaw - yPad;
  const yMax = yMaxRaw + yPad;

  const numericX = points.every(p => typeof p.x === 'number');
  const xNums = numericX ? points.map(p => p.x as number) : points.map((_, i) => i);
  const xMin = Math.min(...xNums);
  const xMax = Math.max(...xNums);
  const xSpan = xMax - xMin || 1;

  const mapX = (i: number) => {
    if (chart.type === 'bar' || !numericX) {
      return padL + ((i + 0.5) / points.length) * plotW;
    }
    return padL + ((xNums[i] - xMin) / xSpan) * plotW;
  };

  const mapY = (val: number) => padT + plotH - ((val - yMin) / (yMax - yMin || 1)) * plotH;

  return (
    <div className="p-3.5 rounded-lg bg-[#050812] border border-slate-800 space-y-2">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-slate-200 font-semibold">{chart.title}</span>
        {hoverIdx !== null && points[hoverIdx] ? (
          <span className="text-cyan-300 tabular-nums">
            ({String(points[hoverIdx].x)}, {points[hoverIdx].y})
          </span>
        ) : (
          <span className="text-slate-500">Hover point for exact value</span>
        )}
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56 select-none">
        {/* Horizontal Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => {
          const yy = padT + plotH * (1 - frac);
          const labelVal = yMin + (yMax - yMin) * frac;
          return (
            <g key={frac}>
              <line x1={padL} y1={yy} x2={w - padR} y2={yy} stroke="#1e293b" strokeWidth={1} />
              <text
                x={padL - 6}
                y={yy + 3}
                textAnchor="end"
                fontSize="9"
                fill="#64748b"
                fontFamily="JetBrains Mono, monospace"
              >
                {Math.abs(labelVal) >= 100 ? labelVal.toFixed(0) : labelVal.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke="#334155" strokeWidth={1.2} />
        <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="#334155" strokeWidth={1.2} />

        {/* Regression Line if Scatter */}
        {chart.regression && numericX && (
          <line
            x1={mapX(0)}
            y1={mapY(chart.regression.slope * xMin + chart.regression.intercept)}
            x2={padL + plotW}
            y2={mapY(chart.regression.slope * xMax + chart.regression.intercept)}
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            opacity={0.7}
          />
        )}

        {/* Line Path */}
        {chart.type === 'line' && points.length > 1 && (
          <polyline
            fill="none"
            stroke="#06b6d4"
            strokeWidth={2}
            points={points.map((p, i) => `${mapX(i).toFixed(1)},${mapY(p.y).toFixed(1)}`).join(' ')}
          />
        )}

        {/* Bars or Points */}
        {points.map((p, i) => {
          const px = mapX(i);
          const py = mapY(p.y);
          if (chart.type === 'bar') {
            const barW = Math.max(10, Math.min(36, (plotW / points.length) * 0.6));
            const barH = Math.max(2, h - padB - py);
            return (
              <g
                key={i}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                className="cursor-crosshair"
              >
                <rect
                  x={px - barW / 2}
                  y={py}
                  width={barW}
                  height={barH}
                  rx={2}
                  fill={p.highlight ? '#f59e0b' : '#06b6d4'}
                  opacity={hoverIdx === i ? 1 : 0.8}
                />
                <text
                  x={px}
                  y={h - padB + 12}
                  textAnchor="middle"
                  fontSize="8.5"
                  fill="#94a3b8"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {String(p.x).slice(0, 8)}
                </text>
              </g>
            );
          }

          return (
            <g
              key={i}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              className="cursor-crosshair"
            >
              <circle
                cx={px}
                cy={py}
                r={hoverIdx === i ? 6 : p.highlight ? 5 : 4}
                fill={p.highlight ? '#f59e0b' : '#22d3ee'}
                stroke="#020617"
                strokeWidth={1.2}
              />
              {points.length <= 12 && (
                <text
                  x={px}
                  y={h - padB + 12}
                  textAnchor="middle"
                  fontSize="8.5"
                  fill="#94a3b8"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {String(p.x)}
                </text>
              )}
            </g>
          );
        })}

        {/* Axis Labels */}
        <text
          x={padL + plotW / 2}
          y={h - 6}
          textAnchor="middle"
          fontSize="9.5"
          fill="#94a3b8"
          fontFamily="JetBrains Mono, monospace"
        >
          {chart.xLabel}
        </text>
      </svg>
    </div>
  );
};

export const ExperimentDetectivePanel: React.FC<ExperimentDetectivePanelProps> = ({
  datasets,
  activeDatasetId,
  onSelectDatasetId,
  onInspectDataset,
  onInspectInvestigationDna,
  onSendSummaryToAi,
  initialTask = 'highest-temperature',
}) => {
  const [internalDsId, setInternalDsId] = useState<string>(datasets[0]?.id || '');
  const selectedDsId =
    activeDatasetId && datasets.some(d => d.id === activeDatasetId) ? activeDatasetId : internalDsId;
  const dataset = datasets.find(d => d.id === selectedDsId) || datasets[0];

  const [secondaryDsId, setSecondaryDsId] = useState<string>(datasets[1]?.id || datasets[0]?.id || '');
  const secondaryDataset = datasets.find(d => d.id === secondaryDsId && d.id !== dataset?.id) || datasets[1] || null;

  const [taskType, setTaskType] = useState<DetectiveTaskType>(initialTask);
  const [naturalQuery, setNaturalQuery] = useState('');

  const schema = useMemo(() => (dataset ? profileDatasetColumns(dataset) : { rows: [], columns: [] }), [dataset]);
  const numericCols = schema.columns.filter(c => c.type === 'numeric');

  const [xCol, setXCol] = useState<string>(numericCols[0]?.name || '');
  const [yCol, setYCol] = useState<string>(numericCols[1]?.name || numericCols[0]?.name || '');

  // Keep X/Y valid when dataset switches
  useEffect(() => {
    if (numericCols.length > 0 && !numericCols.some(c => c.name === xCol)) {
      setXCol(numericCols[0].name);
    }
    if (numericCols.length > 1 && !numericCols.some(c => c.name === yCol)) {
      setYCol(numericCols[1].name);
    }
  }, [dataset?.id]);

  const result: ExperimentDetectiveResult | null = useMemo(() => {
    if (!dataset) return null;
    return runExperimentDetective({
      dataset,
      taskType,
      secondaryDataset,
      xColumn: xCol,
      yColumn: yCol,
      customPrompt: naturalQuery || undefined,
    });
  }, [dataset, taskType, secondaryDataset, xCol, yCol, naturalQuery]);

  const handleNaturalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = naturalQuery.toLowerCase().trim();
    if (!q) return;
    sound.playClick();
    if (q.includes('temp') || q.includes('hot') || q.includes('highest')) setTaskType('highest-temperature');
    else if (q.includes('airflow') || q.includes('flow') || q.includes('wind') || q.includes('velocity')) setTaskType('airflow-trend');
    else if (q.includes('oxygen') || q.includes('o2')) setTaskType('oxygen-comparison');
    else if (q.includes('unusual') || q.includes('outlier') || q.includes('anomal')) setTaskType('outlier-detection');
    else if (q.includes('missing') || q.includes('inconsistent') || q.includes('duplicate') || q.includes('unit')) setTaskType('missing-inconsistent');
    else if (q.includes('compare') || q.includes('two') || q.includes('dataset')) setTaskType('compare-datasets');
    else setTaskType('variable-relationship');
  };

  if (!dataset || !result) {
    return (
      <div className="p-6 rounded-lg border border-slate-800 bg-[#0a0f1c] text-xs text-slate-400">
        No datasets loaded for Experiment Detective.
      </div>
    );
  }

  return (
    <div className="space-y-5 font-sans">
      {/* Control Header */}
      <div className="rounded-lg border border-slate-800 bg-[#0a0f1c]/95 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-cyan-400">
              <Search className="w-4 h-4" />
              <span>EXPERIMENT DETECTIVE · VERIFIED STATISTICAL DATA ANALYSIS</span>
            </div>
            <h3 className="text-lg sm:text-xl font-display font-bold text-white mt-1">
              Dataset Profiling, Statistical Tests & Anomaly Investigation
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Computes descriptive statistics, Pearson correlation, IQR outliers, and missing-value audits strictly from actual selected dataset rows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={dataset.id}
              onChange={(e) => {
                sound.playClick();
                setInternalDsId(e.target.value);
                onSelectDatasetId?.(e.target.value);
              }}
              className="px-3 py-2 rounded bg-[#060913] border border-slate-700 text-slate-100 max-w-[280px]"
            >
              {datasets.map(d => (
                <option key={d.id} value={d.id}>
                  {d.filename} ({d.mission})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Natural Query Form */}
        <form onSubmit={handleNaturalSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={naturalQuery}
            onChange={(e) => setNaturalQuery(e.target.value)}
            placeholder="Describe a statistical task (e.g., 'Find highest flame temperature', 'Check how spread changes with airflow', 'Detect outliers')..."
            className="flex-1 px-3.5 py-2 rounded-md bg-[#060913] border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Investigation</span>
          </button>
        </form>

        {/* 7 Preset Tasks */}
        <div className="flex flex-wrap gap-1.5">
          {DETECTIVE_TASKS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                sound.playClick();
                setTaskType(t.id);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors cursor-pointer ${
                taskType === t.id
                  ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200 font-semibold'
                  : 'bg-[#060913] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Extra Variable / Secondary Dataset Selectors when relevant */}
        {(taskType === 'variable-relationship' || taskType === 'airflow-trend' || taskType === 'oxygen-comparison' || taskType === 'compare-datasets') && (
          <div className="p-3 rounded bg-[#060913] border border-slate-800 flex flex-wrap items-center gap-3 text-xs font-mono">
            {taskType === 'compare-datasets' ? (
              <>
                <span className="text-slate-400">Compare against Dataset B:</span>
                <select
                  value={secondaryDsId}
                  onChange={(e) => {
                    sound.playClick();
                    setSecondaryDsId(e.target.value);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-amber-300"
                >
                  {datasets
                    .filter(d => d.id !== dataset.id)
                    .map(d => (
                      <option key={d.id} value={d.id}>
                        {d.filename} ({d.mission})
                      </option>
                    ))}
                </select>
              </>
            ) : (
              <>
                {taskType === 'variable-relationship' && (
                  <>
                    <span className="text-slate-400">X Variable:</span>
                    <select
                      value={xCol}
                      onChange={(e) => setXCol(e.target.value)}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-cyan-300"
                    >
                      {numericCols.map(c => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.unit})
                        </option>
                      ))}
                    </select>
                  </>
                )}
                <span className="text-slate-400">Response (Y):</span>
                <select
                  value={yCol}
                  onChange={(e) => setYCol(e.target.value)}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-emerald-300"
                >
                  {numericCols.map(c => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.unit})
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}
      </div>

      {/* Column Schema Strip */}
      <div className="rounded-lg border border-slate-800 bg-[#0a0f1c]/95 p-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300 font-semibold">
            INSPECTED SCHEMA · {dataset.filename} ({schema.rows.length} rows evaluated / {dataset.qualityReport.totalRows} declared)
          </span>
          <span className="text-slate-400">{schema.columns.length} columns</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {schema.columns.map(col => (
            <div key={col.name} className="px-2.5 py-1 rounded bg-[#060913] border border-slate-800 text-[11px] font-mono">
              <span className="text-slate-100">{col.name}</span>
              <span className="text-slate-500"> · {col.type}</span>
              <span className={col.unit === 'unknown' ? 'text-amber-400' : 'text-cyan-400'}>
                {' '}· {col.unit}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Analysis Output */}
      <div className="rounded-lg border border-slate-800 bg-[#0a0f1c]/95 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs">
              {result.feasible ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>● ANALYSIS EXECUTED ON REAL ROWS</span>
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>▲ CANNOT COMPUTE REQUESTED METHOD</span>
                </span>
              )}
            </div>
            <h4 className="text-base sm:text-lg font-display font-bold text-white">
              {result.summaryHeadline}
            </h4>
          </div>

          {onSendSummaryToAi && result.feasible && (
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onSendSummaryToAi(
                  `[Experiment Detective Computed Statistics for ${dataset.filename}]\nTask: ${result.taskTitle}\nHeadline: ${result.summaryHeadline}\nCalculations: ${result.calculations.map(c => `${c.label}: ${c.value}`).join(' | ')}\nFindings: ${result.findings.join(' ')}\nLimitations: ${result.limitations.join(' ')}\n\nPlease interpret the combustion physics behind these verified calculations without inventing any additional measurements.`
                );
              }}
              className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-cyan-700/70 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Discuss Findings with Frags AI</span>
            </button>
          )}
        </div>

        {/* Calculations Grid */}
        {result.calculations.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {result.calculations.map((calc, i) => (
              <div key={i} className="p-3 rounded-lg bg-[#060913] border border-slate-800 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
                    <Calculator className="w-3 h-3 text-indigo-400" />
                    <span>{calc.label}</span>
                  </span>
                  <EpistemicBadge tag={calc.tag} />
                </div>
                <div className="font-mono tabular-nums text-sm font-semibold text-white">{calc.value}</div>
                {calc.detail && <div className="text-[11px] text-slate-400">{calc.detail}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Interactive Chart */}
        {result.chart && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
              <span>CHART GENERATED DIRECTLY FROM INSPECTED ROWS</span>
            </div>
            <DetectiveSvgChart chart={result.chart} />
          </div>
        )}

        {/* Structured Findings + Limitations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-[#060913] border border-slate-800 space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-wider text-cyan-400">
              Verified Observations
            </div>
            <ul className="space-y-1.5 text-slate-200 list-disc pl-4 leading-relaxed">
              {result.findings.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>

          <div className="p-3.5 rounded-lg bg-[#110c10] border border-amber-900/50 space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-wider text-amber-400">
              Statistical Limitations & Uncertainty
            </div>
            <ul className="space-y-1.5 text-amber-100/90 list-disc pl-4 leading-relaxed">
              {result.limitations.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Full Expandable Evidence Chain */}
        <EvidenceChainPanel
          chain={result.evidenceChain}
          defaultOpen={false}
          onInspectDataset={onInspectDataset}
          onInspectInvestigationDna={onInspectInvestigationDna}
        />
      </div>
    </div>
  );
};
