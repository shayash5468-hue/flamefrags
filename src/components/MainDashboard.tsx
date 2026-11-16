import React from 'react';
import { DashboardSection, DetectiveTaskType, PsiFileRecord } from '../types';
import { sound } from '../utils/audio';
import flameFragsLogo from '../assets/flamefrags-logo.png';
import { FragsAIView, FragsAiMode } from './FragsAIView';
import { DataUploadView, DataUploadSubTab } from './DataUploadView';
import { FlameVisualView, FlameVisualSubTab } from './FlameVisualView';
import { DrillGame } from './DrillGame';
import { 
  ArrowRight, 
  ArrowLeft
} from 'lucide-react';

interface MainDashboardProps {
  currentSection: DashboardSection;
  onSelectSection: (section: DashboardSection) => void;
  onOpenDiscoveryEngine: () => void;

  // Shared repository & selection state
  datasets: PsiFileRecord[];
  selectedDatasetId: string;
  onSelectDatasetId: (id: string) => void;
  onAddDataset: (record: PsiFileRecord) => void;
  uploadedDataset?: PsiFileRecord | null;
  onClearUploadedData?: () => void;

  selectedInvestigationId: string;
  onSelectInvestigationId: (id: string) => void;

  // Controlled subviews
  dataUploadSubTab: DataUploadSubTab;
  onChangeDataUploadSubTab: (tab: DataUploadSubTab) => void;
  flameVisualSubTab: FlameVisualSubTab;
  onChangeFlameVisualSubTab: (tab: FlameVisualSubTab) => void;
  fragsAiMode: FragsAiMode;
  onChangeFragsAiMode: (mode: FragsAiMode) => void;

  // Pending cross-module triggers
  pendingAiRequest: { query: string; investigationId?: string; nonce: number } | null;
  pendingDetectiveTask: { task: DetectiveTaskType; datasetId?: string; nonce: number } | null;

  // Cross-module workflow actions
  onExplainUploadedData: (record: PsiFileRecord) => void;
  onRunDetectiveOnDataset: (datasetId: string, task?: DetectiveTaskType) => void;
  onAskAiAboutInvestigation: (investigationId: string) => void;
  onAskAiWithPrompt: (prompt: string, investigationIds?: string[]) => void;
  onInspectDataset: (datasetId: string) => void;
  onInspectInvestigationDna: (investigationId: string) => void;
  onOpenResearchGaps: (investigationId?: string) => void;
  onOpenHabitatBridge: (investigationId?: string) => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  currentSection,
  onSelectSection,
  datasets,
  selectedDatasetId,
  onSelectDatasetId,
  onAddDataset,
  uploadedDataset,
  onClearUploadedData,
  selectedInvestigationId,
  onSelectInvestigationId,
  dataUploadSubTab,
  onChangeDataUploadSubTab,
  flameVisualSubTab,
  onChangeFlameVisualSubTab,
  fragsAiMode,
  onChangeFragsAiMode,
  pendingAiRequest,
  pendingDetectiveTask,
  onExplainUploadedData,
  onRunDetectiveOnDataset,
  onAskAiAboutInvestigation,
  onAskAiWithPrompt,
  onInspectDataset,
  onInspectInvestigationDna,
  onOpenResearchGaps,
  onOpenHabitatBridge,
}) => {
  // The 4 Primary Modules
  const primaryModules = [
    {
      id: 'frags-ai' as DashboardSection,
      name: 'FRAGS AI',
      shortName: 'AI',
      description:
        'Interactive AI research assistant grounded in NASA PSI combustion science. Generates multi-level scientific explanations, hypotheses, and citations.',
      arrowClass: 'text-cyan-400 group-hover:text-cyan-200',
      cardClass:
        'border-cyan-400/45 hover:border-cyan-300/85 bg-gradient-to-br from-cyan-900/45 via-sky-950/60 to-[#061224]/85 shadow-[0_8px_32px_rgba(8,145,178,0.22)] hover:shadow-[0_12px_38px_rgba(34,211,238,0.32)]',
    },
    {
      id: 'data-upload' as DashboardSection,
      name: 'DATA UPLOAD',
      shortName: 'DATA',
      description:
        'Explore 24+ NASA PSI non-video investigation datasets (.csv, .xlsx, .txt) with automated quality analysis, missing-value audits, and direct AI dataset explanation.',
      arrowClass: 'text-emerald-400 group-hover:text-emerald-200',
      cardClass:
        'border-emerald-400/45 hover:border-emerald-300/85 bg-gradient-to-br from-emerald-900/45 via-teal-950/60 to-[#051a1b]/85 shadow-[0_8px_32px_rgba(16,185,129,0.2)] hover:shadow-[0_12px_38px_rgba(52,211,153,0.3)]',
    },
    {
      id: 'flame-visual' as DashboardSection,
      name: 'FLAME VISUAL',
      shortName: 'VISUAL',
      description:
        'Real-time microgravity flame simulator. Compare 0G spherical blue chemiluminescence with 1G buoyant flames, adjust live parameters, and merge into FlameTwin.',
      arrowClass: 'text-purple-400 group-hover:text-purple-200',
      cardClass:
        'border-purple-400/45 hover:border-purple-300/85 bg-gradient-to-br from-purple-900/45 via-indigo-950/60 to-[#110822]/85 shadow-[0_8px_32px_rgba(147,51,234,0.22)] hover:shadow-[0_12px_38px_rgba(192,132,252,0.32)]',
    },
    {
      id: 'minigame' as DashboardSection,
      name: 'SIMULATION',
      shortName: 'SIM',
      description:
        'First-person 3D orbital microgravity fire drill simulation. Navigate zero-G smoke physics, locate thermal hotspots, and execute emergency suppression protocols across ISS, Moon, and Mars.',
      arrowClass: 'text-amber-400 group-hover:text-amber-200',
      cardClass:
        'border-amber-400/45 hover:border-amber-300/85 bg-gradient-to-br from-amber-900/45 via-orange-950/55 to-[#1a0e05]/85 shadow-[0_8px_32px_rgba(217,119,6,0.2)] hover:shadow-[0_12px_38px_rgba(251,191,36,0.3)]',
    },
  ];

  const currentModule = primaryModules.find(m => m.id === currentSection);

  // ==========================================
  // VIEW 1: MAIN HOME SCREEN (MODULE SELECTION)
  // ==========================================
  if (currentSection === 'overview') {
    return (
      <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-8 sm:py-12 pl-12 sm:pl-16">
        <div className="max-w-4xl w-full mx-auto space-y-8 animate-fade-up">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="py-4 sm:py-6 px-2 flex items-center justify-center">
              <img
                src={flameFragsLogo}
                alt="FlameFrags - Flame in Freefall"
                className="w-full max-w-lg sm:max-w-xl h-auto max-h-[160px] sm:max-h-[190px] object-contain select-none drop-shadow-[0_0_35px_rgba(56,189,248,0.7)] transition-transform duration-300 hover:scale-[1.02]"
              />
            </div>

            <p className="max-w-xl mx-auto text-xs sm:text-sm text-slate-300 font-medium">
              Orbital fire safety intelligence, microgravity combustion science informatics, and real-time physics drills.
            </p>
          </div>

          {/* CENTRAL 2x2 SQUARE GRID OF 4 LARGE INTERACTIVE MODULE BUTTONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 w-full">
            {primaryModules.map((module) => (
              <button
                key={module.id}
                onClick={() => {
                  sound.playHapticLaunch();
                  onSelectSection(module.id);
                }}
                className={`group p-6 sm:p-7 text-left transition duration-200 hover:-translate-y-0.5 flex flex-col justify-start rounded-2xl border backdrop-blur-md cursor-pointer relative overflow-hidden ${module.cardClass}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg sm:text-xl font-bold tracking-wide text-white">
                    {module.name}
                  </h3>
                  <ArrowRight className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 group-hover:translate-x-1 ${module.arrowClass}`} />
                </div>

                <p className="mt-3 text-xs sm:text-[13px] leading-relaxed text-slate-200/90 font-sans">
                  {module.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: DEDICATED SEPARATE FULL-SCREEN MODULE VIEW
  // ==========================================
  return (
    <div className="flex-1 flex flex-col w-full pl-10 sm:pl-12">
      {/* Module Top Navigation Bar with Back-to-Hub Button */}
      <div className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#070b18]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sound.playHapticClick('medium');
                onSelectSection('overview');
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-cyan-300 hover:text-white text-xs font-mono font-semibold transition group cursor-pointer shadow-sm"
              title="Return to Main Module Selection Screen"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              <span>Return to Hub</span>
            </button>

            <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-500 hidden sm:inline">Module:</span>
              <span className="text-white font-bold">
                {currentSection === 'iss-fire-drill' || currentSection === 'minigame' ? 'ISS FIRE DRILL' : currentModule?.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Render the actual dedicated module view */}
      <div className="flex-1 w-full pb-8 pt-6">
        {/* 1. Frags the AI */}
        {currentSection === 'frags-ai' && (
          <FragsAIView
            datasets={datasets}
            selectedDatasetId={selectedDatasetId}
            onSelectDatasetId={onSelectDatasetId}
            uploadedDataset={uploadedDataset}
            onClearUploadedData={onClearUploadedData}
            selectedInvestigationId={selectedInvestigationId}
            onSelectInvestigationId={onSelectInvestigationId}
            mode={fragsAiMode}
            onChangeMode={onChangeFragsAiMode}
            pendingAiRequest={pendingAiRequest}
            pendingDetectiveTask={pendingDetectiveTask}
            onInspectDataset={onInspectDataset}
            onInspectInvestigationDna={onInspectInvestigationDna}
            onOpenResearchGaps={() => onOpenResearchGaps()}
            onOpenHabitatBridge={(invId) => onOpenHabitatBridge(invId)}
          />
        )}

        {/* 2. Data Upload */}
        {currentSection === 'data-upload' && (
          <DataUploadView
            datasets={datasets}
            selectedDatasetId={selectedDatasetId}
            onSelectDatasetId={onSelectDatasetId}
            onAddDataset={onAddDataset}
            selectedInvestigationId={selectedInvestigationId}
            onSelectInvestigationId={onSelectInvestigationId}
            activeSubTab={dataUploadSubTab}
            onChangeSubTab={onChangeDataUploadSubTab}
            onExplainWithAi={onExplainUploadedData}
            onRunDetectiveOnDataset={onRunDetectiveOnDataset}
            onAskAiAboutInvestigation={onAskAiAboutInvestigation}
            onAskAiAboutGap={(prompt, relatedIds) => onAskAiWithPrompt(prompt, relatedIds)}
            onOpenHabitatBridge={(invId) => onOpenHabitatBridge(invId)}
          />
        )}

        {/* 3. Flame Visual */}
        {currentSection === 'flame-visual' && (
          <FlameVisualView
            datasets={datasets}
            activeSubTab={flameVisualSubTab}
            onChangeSubTab={onChangeFlameVisualSubTab}
            selectedInvestigationId={selectedInvestigationId}
            onSelectInvestigationId={onSelectInvestigationId}
            onRunDetectiveOnDataset={onRunDetectiveOnDataset}
            onAskAiAboutInvestigation={onAskAiAboutInvestigation}
            onAskAiWithPrompt={onAskAiWithPrompt}
            onViewGapsForInvestigation={(invId) => onOpenResearchGaps(invId)}
          />
        )}

        {/* 4. Minigame / ISS Fire Drill Launch Console */}
        {(currentSection === 'minigame' || currentSection === 'iss-fire-drill') && (
          <DrillGame onReturnToDashboard={() => onSelectSection('overview')} />
        )}
      </div>
    </div>
  );
};
