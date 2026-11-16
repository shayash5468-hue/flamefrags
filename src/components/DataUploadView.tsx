import React, { useState, useEffect } from 'react';
import { PSI_INVESTIGATIONS_REGISTRY } from '../data/psiRegistry';
import { DetectiveTaskType, PsiFileRecord, PsiInvestigationRecord } from '../types';
import { sound } from '../utils/audio';
import { CombustionDnaPanel } from './features/CombustionDnaPanel';
import { ResearchGapPanel } from './features/ResearchGapPanel';
import {
  Upload,
  Table,
  Search,
  CheckCircle2,
  AlertCircle,
  Download,
  ExternalLink,
  ArrowUpRight,
  Dna,
  Activity,
  Bot,
  ShieldCheck,
  Grid3x3,
  ChevronRight,
} from 'lucide-react';

export type DataUploadSubTab = 'files' | 'psi24' | 'dna' | 'gaps';

interface DataUploadViewProps {
  datasets: PsiFileRecord[];
  selectedDatasetId: string;
  onSelectDatasetId: (id: string) => void;
  onAddDataset: (record: PsiFileRecord) => void;
  selectedInvestigationId: string;
  onSelectInvestigationId: (id: string) => void;
  activeSubTab: DataUploadSubTab;
  onChangeSubTab: (tab: DataUploadSubTab) => void;
  onExplainWithAi?: (record: PsiFileRecord) => void;
  onRunDetectiveOnDataset?: (datasetId: string, task?: DetectiveTaskType) => void;
  onAskAiAboutInvestigation?: (investigationId: string) => void;
  onAskAiAboutGap?: (prompt: string, relatedIds?: string[]) => void;
  onOpenHabitatBridge?: (investigationId?: string) => void;
}

export const DataUploadView: React.FC<DataUploadViewProps> = ({
  datasets,
  selectedDatasetId,
  onSelectDatasetId,
  onAddDataset,
  selectedInvestigationId,
  onSelectInvestigationId,
  activeSubTab,
  onChangeSubTab,
  onExplainWithAi,
  onRunDetectiveOnDataset,
  onAskAiAboutInvestigation,
  onAskAiAboutGap,
  onOpenHabitatBridge,
}) => {
  const selectedFile = datasets.find(d => d.id === selectedDatasetId) || datasets[0];

  const [searchQuery, setSearchQuery] = useState('');
  const [missionFilter, setMissionFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [uploadNotice, setUploadNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [psiList, setPsiList] = useState<PsiInvestigationRecord[]>(PSI_INVESTIGATIONS_REGISTRY);
  const [psiSearch, setPsiSearch] = useState('');

  useEffect(() => {
    fetch('/api/psi/investigations')
      .then(async (res) => {
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Merge server findings cleanly into structured registry without losing structured metadata
            setPsiList(prev =>
              prev.map(regItem => {
                const srv = data.find((d: any) => d.id === regItem.id);
                return srv ? { ...regItem, keyFinding: srv.keyFinding || regItem.keyFinding } : regItem;
              })
            );
          }
        }
      })
      .catch(() => {
        // Registry already initialized cleanly
      });
  }, []);

  const filteredFiles = datasets.filter((f) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      f.filename.toLowerCase().includes(q) ||
      f.investigationName.toLowerCase().includes(q) ||
      f.fuelType.toLowerCase().includes(q) ||
      f.piName.toLowerCase().includes(q);

    const matchesMission = missionFilter === 'all' || f.mission === missionFilter;
    const matchesFormat = formatFilter === 'all' || f.format === formatFilter;

    return matchesSearch && matchesMission && matchesFormat;
  });

  const filteredPsi = psiList.filter((item) => {
    const q = psiSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      item.id.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.fuel.toLowerCase().includes(q) ||
      item.pi.toLowerCase().includes(q) ||
      item.platform.toLowerCase().includes(q) ||
      item.keyFinding.toLowerCase().includes(q)
    );
  });

  const activePsiInvestigation =
    psiList.find(p => p.id === selectedInvestigationId) || psiList[0];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    sound.playClick();
    const file = files[0];
    e.target.value = '';
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!['csv', 'txt', 'xlsx'].includes(extension || '')) {
      setUploadNotice({
        type: 'error',
        text: `Unsupported format ".${extension || 'unknown'}". Please select a .csv, .xlsx, or .txt scientific data file.`,
      });
      setTimeout(() => setUploadNotice(null), 5000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text ? text.split(/\r?\n/).filter(l => l.trim().length > 0) : [];
      let parsedCols: string[] = ['index', 'measurement'];
      let allRows: Record<string, string | number>[] = [];
      let missingCount = 0;

      if (lines.length > 0) {
        const delimiter = lines[0].includes(',') ? ',' : lines[0].includes('\t') ? '\t' : ' ';
        parsedCols = lines[0].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));

        allRows = lines.slice(1, 2001).map((line) => {
          const cells = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
          const rowObj: Record<string, string | number> = {};
          parsedCols.forEach((col, cIdx) => {
            const val = cells[cIdx] ?? '';
            if (val === '' || val.toLowerCase() === 'null' || val.toLowerCase() === 'nan') {
              missingCount++;
              rowObj[col] = '';
            } else {
              rowObj[col] = !isNaN(Number(val)) ? Number(val) : val;
            }
          });
          return rowObj;
        });
      }

      const rowSigs = allRows.map(r => JSON.stringify(r));
      const dupCount = rowSigs.length - new Set(rowSigs).size;
      const sampleRows = allRows.slice(0, 15);

      const newRecord: PsiFileRecord = {
        id: `custom-${Date.now()}`,
        filename: file.name,
        format: extension as 'csv' | 'xlsx' | 'txt',
        mission: 'Custom-Upload',
        investigationName: file.name.replace(/\.[^/.]+$/, ''),
        piName: 'Local Researcher Session',
        fuelType: 'unknown (User-Imported File)',
        gravityCondition: 'unknown',
        oxygenRange: 'unknown',
        flowRange: 'unknown',
        pressureRange: 'unknown',
        hardware: 'unknown',
        sensors: ['unknown'],
        fileSizeBytes: file.size,
        uploadedAt: new Date().toISOString().split('T')[0],
        description: `Imported scientific dataset (${allRows.length} data rows parsed across ${parsedCols.length} columns). Ready for Experiment Detective statistical audit and Combustion DNA extraction.`,
        columns: parsedCols,
        sampleRows: sampleRows.length > 0 ? sampleRows : [{ note: 'No rows parsed' }],
        allRows: allRows.length > 0 ? allRows : undefined,
        qualityReport: {
          totalRows: Math.max(allRows.length, Math.max(0, lines.length - 1)),
          missingValues: missingCount,
          duplicateRows: dupCount,
          inconsistentUnits: 0,
          status: missingCount > 0 || dupCount > 0 ? 'warning' : 'validated',
        },
      };

      onAddDataset(newRecord);
      onSelectDatasetId(newRecord.id);
      onChangeSubTab('files');
      setUploadNotice({
        type: 'success',
        text: `Loaded "${file.name}" (${newRecord.qualityReport.totalRows} rows, ${parsedCols.length} columns, ${missingCount} missing cells).`,
      });
      setTimeout(() => setUploadNotice(null), 5000);
    };

    reader.readAsText(file);
  };

  const downloadSampleCsv = (fileRecord: PsiFileRecord) => {
    sound.playClick();
    const rowsToExport = fileRecord.allRows && fileRecord.allRows.length > 0 ? fileRecord.allRows : fileRecord.sampleRows;
    const headers = fileRecord.columns.join(',');
    const rows = rowsToExport
      .map(r => fileRecord.columns.map(c => (r[c] !== undefined ? `"${r[c]}"` : '')).join(','))
      .join('\n');
    const csvContent = `${headers}\n${rows}`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileRecord.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5 font-sans">
      {/* Workspace Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-slate-800/90">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-bold tracking-wide text-white">
            PSI Combustion Archive & Investigation Library
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Inspect experimental datasets, browse the 24 indexed NASA Physical Sciences Informatics investigations, generate Combustion DNA fingerprints, or audit research gaps.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Clean Segmented Control */}
          <div className="inline-flex flex-wrap items-center bg-[#0b101b] p-1 rounded-lg border border-slate-800 text-xs font-sans font-medium">
            <button
              onClick={() => { sound.playClick(); onChangeSubTab('files'); }}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeSubTab === 'files'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Datasets & Upload
            </button>
            <button
              onClick={() => { sound.playClick(); onChangeSubTab('psi24'); }}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeSubTab === 'psi24'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              24 Investigations
            </button>
            <button
              onClick={() => { sound.playClick(); onChangeSubTab('gaps'); }}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'gaps'
                  ? 'bg-amber-950 text-amber-300 border border-amber-700/60 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid3x3 className="w-3.5 h-3.5" />
              <span>Research Gaps</span>
            </button>
          </div>

          <label className="cursor-pointer px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-sans font-semibold flex items-center gap-2 transition-colors whitespace-nowrap">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
            <input
              type="file"
              accept=".csv,.xlsx,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Inline Upload Notice */}
      {uploadNotice && (
        <div
          className={`px-4 py-2.5 rounded-lg border text-xs sm:text-sm flex items-center gap-2 ${
            uploadNotice.type === 'success'
              ? 'bg-[#0b151a] border-emerald-800/80 text-emerald-300'
              : 'bg-[#1a0d11] border-red-800/80 text-red-300'
          }`}
        >
          {uploadNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{uploadNotice.text}</span>
        </div>
      )}

      {/* SUBVIEW 1: COMBUSTION DNA */}
      {activeSubTab === 'dna' && (
        <CombustionDnaPanel
          datasets={datasets}
          selectedEntityId={selectedInvestigationId}
          onSelectEntityId={onSelectInvestigationId}
          onRunDetectiveOnDataset={(dsId) => onRunDetectiveOnDataset?.(dsId)}
          onAskAiAboutInvestigation={onAskAiAboutInvestigation}
          onOpenHabitatBridge={onOpenHabitatBridge}
          onViewGapsForInvestigation={() => onChangeSubTab('gaps')}
        />
      )}

      {/* SUBVIEW 2: RESEARCH GAP DETECTOR */}
      {activeSubTab === 'gaps' && (
        <ResearchGapPanel
          datasets={datasets}
          onAskAiAboutGap={onAskAiAboutGap}
          onInspectInvestigationDna={(invId) => {
            onSelectInvestigationId(invId);
            onChangeSubTab('dna');
          }}
        />
      )}

      {/* SUBVIEW 3: 24 PSI INVESTIGATIONS LIBRARY (Clickable Master-Detail + Cross-Module Actions) */}
      {activeSubTab === 'psi24' && (
        <div className="space-y-5">
          {/* Active Investigation Action Dossier */}
          {activePsiInvestigation && (
            <div className="rounded-lg border border-cyan-800/50 bg-[#0a0f1c]/95 p-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                    <span className="text-cyan-400 font-bold">{activePsiInvestigation.id}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-300">{activePsiInvestigation.platform}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-emerald-300">{activePsiInvestigation.metadataVerificationStatus}</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-display font-bold text-white leading-snug">
                    {activePsiInvestigation.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {activePsiInvestigation.keyFinding}
                  </p>
                </div>

                <a
                  href={activePsiInvestigation.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-cyan-300 flex items-center gap-1.5 shrink-0 self-start"
                >
                  <span>psi.nasa.gov</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded bg-[#060913] border border-slate-800">
                  <span className="font-mono text-[10px] text-slate-400 block">FUEL & GEOMETRY</span>
                  <span className="text-slate-200 mt-0.5 block">{activePsiInvestigation.fuel}</span>
                </div>
                <div className="p-2.5 rounded bg-[#060913] border border-slate-800">
                  <span className="font-mono text-[10px] text-slate-400 block">GRAVITY & O₂</span>
                  <span className="text-slate-200 mt-0.5 block">
                    {activePsiInvestigation.gravityRegime} · O₂: {activePsiInvestigation.oxygenConcentration}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-[#060913] border border-slate-800">
                  <span className="font-mono text-[10px] text-slate-400 block">PRESSURE & AIRFLOW</span>
                  <span className="text-slate-200 font-mono mt-0.5 block">
                    P: {activePsiInvestigation.pressure} · Flow: {activePsiInvestigation.airflow}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-[#060913] border border-slate-800">
                  <span className="font-mono text-[10px] text-slate-400 block">PRINCIPAL INVESTIGATOR</span>
                  <span className="text-slate-200 mt-0.5 block">{activePsiInvestigation.pi}</span>
                </div>
              </div>

              {/* Unified Cross-Module Workflow Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onChangeSubTab('dna');
                  }}
                  className="px-3.5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Dna className="w-3.5 h-3.5" />
                  <span>Open Combustion DNA</span>
                </button>
                {activePsiInvestigation.linkedDatasetIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      onRunDetectiveOnDataset?.(activePsiInvestigation.linkedDatasetIds[0]);
                    }}
                    className="px-3.5 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Run Experiment Detective</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onAskAiAboutInvestigation?.(activePsiInvestigation.id);
                  }}
                  className="px-3.5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Ask Frags AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onOpenHabitatBridge?.(activePsiInvestigation.id);
                  }}
                  className="px-3.5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-purple-300 font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Explore Habitat Relevance</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onChangeSubTab('gaps');
                  }}
                  className="px-3.5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Grid3x3 className="w-3.5 h-3.5" />
                  <span>View Related Gaps</span>
                </button>
              </div>
            </div>
          )}

          {/* Investigation Catalogue Table */}
          <div className="rounded-lg border border-slate-800 bg-[#0a0f1c]/95 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-display font-bold tracking-wide text-white">
                  NASA Physical Sciences Informatics Combustion Investigations
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select any row to inspect metadata, Combustion DNA, linked datasets, or launch Habitat Relevance
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={psiSearch}
                    onChange={(e) => setPsiSearch(e.target.value)}
                    placeholder="Filter 24 investigations..."
                    className="pl-8 pr-3 py-1.5 rounded bg-[#060913] border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <span className="font-mono tabular-nums text-xs text-slate-300 shrink-0">
                  {filteredPsi.length} / {psiList.length}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#0e1525] text-slate-300 border-b border-slate-800 font-mono text-xs">
                  <tr>
                    <th className="py-2.5 px-4 font-medium whitespace-nowrap">ID</th>
                    <th className="py-2.5 px-4 font-medium">Investigation</th>
                    <th className="py-2.5 px-4 font-medium whitespace-nowrap">Platform</th>
                    <th className="py-2.5 px-4 font-medium">Fuel Category</th>
                    <th className="py-2.5 px-4 font-medium text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-slate-300">
                  {filteredPsi.map((item) => {
                    const isSelected = activePsiInvestigation?.id === item.id;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => {
                          sound.playClick();
                          onSelectInvestigationId(item.id);
                        }}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-slate-800/80' : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono tabular-nums text-xs text-cyan-400 font-semibold whitespace-nowrap">
                          {item.id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-100">{item.title}</div>
                          <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.keyFinding}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-300 whitespace-nowrap">{item.platform}</td>
                        <td className="py-3 px-4 text-xs text-slate-300 whitespace-nowrap">{item.fuelCategory}</td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                sound.playClick();
                                onSelectInvestigationId(item.id);
                                onChangeSubTab('dna');
                              }}
                              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-emerald-300 cursor-pointer"
                            >
                              DNA
                            </button>
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-semibold hover:underline"
                            >
                              <span>PSI</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 4: DATASETS & UPLOAD (Master-Detail Archive Split, ZERO Supabase) */}
      {activeSubTab === 'files' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Panel: File Index (5 cols) */}
          <div className="lg:col-span-5 rounded-lg border border-slate-800 bg-[#0a0f1c]/95 overflow-hidden">
            {/* Search & Filters */}
            <div className="p-4 border-b border-slate-800 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by filename, investigation, fuel, or PI..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-md bg-[#060913] border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-600"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1">
                  {['all', 'ACME', 'FLEX', 'BASS', 'SoFIE', 'Saffire', 'Acoustic-FlameFrags', 'Custom-Upload'].map((m) => (
                    <button
                      key={m}
                      onClick={() => { sound.playClick(); setMissionFilter(m); }}
                      className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                        missionFilter === m
                          ? 'bg-slate-800 text-white font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m === 'all' ? 'All' : m === 'Acoustic-FlameFrags' ? 'Acoustic' : m === 'Custom-Upload' ? 'Uploads' : m}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 font-mono text-xs">
                  {['all', 'csv', 'xlsx', 'txt'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => { sound.playClick(); setFormatFilter(fmt); }}
                      className={`px-1.5 py-0.5 rounded uppercase transition-colors cursor-pointer ${
                        formatFilter === fmt
                          ? 'bg-slate-800 text-cyan-300 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dataset Index Rows */}
            <div className="divide-y divide-slate-800/70 max-h-[580px] overflow-y-auto">
              {filteredFiles.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">
                  No datasets match the current filter.
                </div>
              ) : (
                filteredFiles.map((file) => {
                  const isSelected = selectedFile.id === file.id;
                  return (
                    <button
                      key={file.id}
                      onClick={() => { sound.playClick(); onSelectDatasetId(file.id); }}
                      className={`w-full text-left px-4 py-3.5 transition-colors flex flex-col gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800/80'
                          : 'hover:bg-slate-900/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-mono text-xs font-semibold truncate ${isSelected ? 'text-cyan-300' : 'text-slate-100'}`}>
                          {file.filename}
                        </span>
                        <span className="font-mono tabular-nums text-xs text-slate-400 shrink-0">
                          .{file.format}
                        </span>
                      </div>

                      <div className="text-sm font-medium text-slate-200 line-clamp-1">
                        {file.investigationName}
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="truncate">{file.mission} · {file.fuelType.split('(')[0].trim()}</span>
                        <span className="shrink-0 font-mono tabular-nums">{(file.fileSizeBytes / 1024).toFixed(1)} KB</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Dataset Inspector (7 cols) */}
          <div className="lg:col-span-7 rounded-lg border border-slate-800 bg-[#0a0f1c]/95 overflow-hidden divide-y divide-slate-800/80">
            {/* 1. Investigation Header & Actions */}
            <div className="p-6 space-y-4">
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-300">
                  <span className="font-mono text-cyan-400 font-semibold">{selectedFile.mission}</span>
                  {selectedFile.investigationId && (
                    <>
                      <span className="text-slate-600" aria-hidden="true">·</span>
                      <span className="font-mono text-emerald-300 font-semibold">{selectedFile.investigationId}</span>
                    </>
                  )}
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span className="font-sans text-slate-300">{selectedFile.piName}</span>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-slate-400">{selectedFile.uploadedAt}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-display font-bold tracking-wide text-white leading-snug">
                  {selectedFile.investigationName}
                </h3>
                <p className="text-sm font-sans font-normal text-slate-300 leading-relaxed">
                  {selectedFile.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  onClick={() => {
                    sound.playClick();
                    onExplainWithAi?.(selectedFile);
                  }}
                  className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-sans font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Analyze with AI</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    onRunDetectiveOnDataset?.(selectedFile.id, 'highest-temperature');
                  }}
                  className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-800/70 text-xs font-sans font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Experiment Detective</span>
                </button>
                <button
                  onClick={() => downloadSampleCsv(selectedFile)}
                  className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-sans font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* 2. Dataset Quality Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80">
              <div className="px-5 py-4">
                <div className="text-xs text-slate-400">Total Rows</div>
                <div className="text-lg font-mono tabular-nums font-semibold text-white mt-1">
                  {selectedFile.qualityReport.totalRows.toLocaleString()}
                </div>
              </div>
              <div className="px-5 py-4">
                <div className="text-xs text-slate-400">Missing Values</div>
                <div className="text-lg font-mono tabular-nums font-semibold text-slate-100 mt-1">
                  {selectedFile.qualityReport.missingValues}
                </div>
              </div>
              <div className="px-5 py-4">
                <div className="text-xs text-slate-400">Duplicate Rows</div>
                <div className="text-lg font-mono tabular-nums font-semibold text-slate-100 mt-1">
                  {selectedFile.qualityReport.duplicateRows}
                </div>
              </div>
              <div className="px-5 py-4">
                <div className="text-xs text-slate-400">Validation</div>
                <div className="text-sm font-mono font-semibold text-emerald-400 mt-1.5 flex items-center gap-1.5 capitalize">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{selectedFile.qualityReport.status}</span>
                </div>
              </div>
            </div>

            {/* 3. Experimental Boundary Conditions */}
            <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-12 gap-4 text-xs sm:text-sm">
              <div className="sm:col-span-6">
                <div className="text-xs text-slate-400">Fuel Specimen</div>
                <div className="text-slate-100 font-sans font-medium mt-1 leading-snug">{selectedFile.fuelType}</div>
              </div>
              <div className="sm:col-span-3">
                <div className="text-xs text-slate-400">Oxygen Range</div>
                <div className="text-slate-100 font-mono tabular-nums text-xs sm:text-sm mt-1">{selectedFile.oxygenRange}</div>
              </div>
              <div className="sm:col-span-3">
                <div className="text-xs text-slate-400">Airflow Velocity</div>
                <div className="text-slate-100 font-mono tabular-nums text-xs sm:text-sm mt-1">{selectedFile.flowRange}</div>
              </div>
            </div>

            {/* 4. Data Preview Table */}
            <div>
              <div className="px-6 py-3 flex items-center justify-between text-xs border-b border-slate-800/80 bg-[#080c17]">
                <span className="text-slate-200 font-medium flex items-center gap-2">
                  <Table className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tabular Preview ({selectedFile.filename})</span>
                </span>
                <span className="font-mono tabular-nums text-xs text-slate-400">
                  {selectedFile.sampleRows.length} preview rows × {selectedFile.columns.length} cols
                </span>
              </div>

              <div className="overflow-x-auto max-h-64 bg-[#060912]">
                <table className="w-full text-left font-mono tabular-nums text-xs">
                  <thead className="bg-[#0d1322] text-slate-300 border-b border-slate-800 sticky top-0">
                    <tr>
                      {selectedFile.columns.map((col) => (
                        <th key={col} className="py-2.5 px-3.5 font-medium whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {selectedFile.sampleRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-900/50">
                        {selectedFile.columns.map((col) => (
                          <td key={col} className="py-2 px-3.5 whitespace-nowrap">
                            {row[col] !== undefined && row[col] !== '' ? String(row[col]) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
