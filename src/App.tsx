/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardSection, DetectiveTaskType, PsiFileRecord } from './types';
import { NASA_PSI_FILES } from './data/nasaPsiDatasets';
import { PSI_INVESTIGATIONS_REGISTRY } from './data/psiRegistry';
import { sound } from './utils/audio';
import { IntroScreen } from './components/IntroScreen';
import { BootSplash } from './components/BootSplash';
import { MainDashboard } from './components/MainDashboard';
import { SideMenu } from './components/SideMenu';
import { DiscoveryEngineModal } from './components/DiscoveryEngineModal';
import { Footer } from './components/Footer';
import type { DataUploadSubTab } from './components/DataUploadView';
import type { FlameVisualSubTab } from './components/FlameVisualView';
import type { FragsAiMode } from './components/FragsAIView';

export default function App() {
  const [showBootSplash, setShowBootSplash] = useState<boolean>(false);
  const [bootNonce, setBootNonce] = useState<number>(0);
  // First screen is 'intro' by default, or read from hash
  const [currentSection, setCurrentSection] = useState<DashboardSection>('intro');
  const [sideMenuOpen, setSideMenuOpen] = useState<boolean>(false);
  const [discoveryModalOpen, setDiscoveryModalOpen] = useState<boolean>(false);

  // Shared cross-module scientific state
  const [datasets, setDatasets] = useState<PsiFileRecord[]>(NASA_PSI_FILES);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(NASA_PSI_FILES[0]?.id || '');
  const [uploadedDataset, setUploadedDataset] = useState<PsiFileRecord | null>(null);
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string>(
    PSI_INVESTIGATIONS_REGISTRY[0]?.id || 'PSI-20'
  );

  // Sub-view state
  const [dataUploadSubTab, setDataUploadSubTab] = useState<DataUploadSubTab>('files');
  const [flameVisualSubTab, setFlameVisualSubTab] = useState<FlameVisualSubTab>('sidebyside');
  const [fragsAiMode, setFragsAiMode] = useState<FragsAiMode>('chat');

  // Pending workflow triggers across modules
  const [pendingAiRequest, setPendingAiRequest] = useState<{
    query: string;
    investigationId?: string;
    nonce: number;
  } | null>(null);

  const [pendingDetectiveTask, setPendingDetectiveTask] = useState<{
    task: DetectiveTaskType;
    datasetId?: string;
    nonce: number;
  } | null>(null);

  // Parse section from hash
  const getSectionFromHash = useCallback((): DashboardSection | null => {
    if (typeof window === 'undefined') return null;
    const cleanHash = window.location.hash.replace('#/', '').replace('#', '').trim();
    if (cleanHash === 'home') return 'overview';
    const valid: DashboardSection[] = ['intro', 'overview', 'frags-ai', 'data-upload', 'flame-visual', 'minigame', 'iss-fire-drill'];
    if (valid.includes(cleanHash as DashboardSection)) {
      return cleanHash as DashboardSection;
    }
    return null;
  }, []);

  // Sync section with browser history / hash
  const navigateToSection = useCallback((section: DashboardSection, replaceHistory: boolean = false) => {
    setCurrentSection(section);
    const targetHash = section === 'overview' ? '#/home' : `#/${section}`;
    if (window.location.hash !== targetHash) {
      if (replaceHistory) {
        window.history.replaceState(null, '', targetHash);
      } else {
        window.history.pushState(null, '', targetHash);
      }
    }
  }, []);

  // Listen to browser Back / Forward buttons & initialize global haptics
  useEffect(() => {
    sound.initGlobalButtonHaptics();

    const initial = getSectionFromHash();
    if (initial) {
      setCurrentSection(initial);
    }

    const handleHashChange = () => {
      const fromHash = getSectionFromHash();
      if (fromHash) {
        setCurrentSection(fromHash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [getSectionFromHash]);

  const handleAddDataset = (record: PsiFileRecord) => {
    setDatasets(prev => [record, ...prev]);
    setSelectedDatasetId(record.id);
    setUploadedDataset(record);
    if (record.investigationId) {
      setSelectedInvestigationId(record.investigationId);
    }
  };

  const handleExplainUploadedData = (record: PsiFileRecord) => {
    setUploadedDataset(record);
    setSelectedDatasetId(record.id);
    if (record.investigationId) {
      setSelectedInvestigationId(record.investigationId);
    }
    setFragsAiMode('chat');
    setPendingAiRequest({
      query: `Analyze dataset ${record.filename} (${record.investigationName}): summarize columns, quality audit, fuel (${record.fuelType}), oxygen (${record.oxygenRange}), airflow (${record.flowRange}), and cite evidence limits.`,
      investigationId: record.investigationId,
      nonce: Date.now(),
    });
    navigateToSection('frags-ai');
  };

  const handleRunDetectiveOnDataset = (datasetId: string, task: DetectiveTaskType = 'missing-inconsistent') => {
    const ds = datasets.find(d => d.id === datasetId);
    setSelectedDatasetId(datasetId);
    if (ds) {
      setUploadedDataset(ds);
      if (ds.investigationId) setSelectedInvestigationId(ds.investigationId);
    }
    setFragsAiMode('detective');
    setPendingDetectiveTask({ task, datasetId, nonce: Date.now() });
    navigateToSection('frags-ai');
  };

  const handleAskAiAboutInvestigation = (investigationId: string) => {
    const inv = PSI_INVESTIGATIONS_REGISTRY.find(i => i.id === investigationId);
    setSelectedInvestigationId(investigationId);
    setFragsAiMode('chat');
    setPendingAiRequest({
      query: inv
        ? `Summarize verified NASA PSI metadata, physical regime, measurement gaps, and habitat relevance for ${inv.id} (${inv.title}).`
        : `Summarize verified NASA PSI details for ${investigationId}.`,
      investigationId,
      nonce: Date.now(),
    });
    navigateToSection('frags-ai');
  };

  const handleAskAiWithPrompt = (prompt: string, investigationIds?: string[]) => {
    if (investigationIds && investigationIds[0]) {
      setSelectedInvestigationId(investigationIds[0]);
    }
    setFragsAiMode('chat');
    setPendingAiRequest({
      query: prompt,
      investigationId: investigationIds?.[0],
      nonce: Date.now(),
    });
    navigateToSection('frags-ai');
  };

  const handleInspectDataset = (datasetId: string) => {
    const ds = datasets.find(d => d.id === datasetId);
    setSelectedDatasetId(datasetId);
    if (ds?.investigationId) setSelectedInvestigationId(ds.investigationId);
    setDataUploadSubTab('files');
    navigateToSection('data-upload');
  };

  const handleInspectInvestigationDna = (investigationId: string) => {
    setSelectedInvestigationId(investigationId);
    setDataUploadSubTab('dna');
    navigateToSection('data-upload');
  };

  const handleOpenResearchGaps = (investigationId?: string) => {
    if (investigationId) setSelectedInvestigationId(investigationId);
    setDataUploadSubTab('gaps');
    navigateToSection('data-upload');
  };

  const handleOpenHabitatBridge = (investigationId?: string) => {
    if (investigationId) setSelectedInvestigationId(investigationId);
    setFlameVisualSubTab('habitat');
    navigateToSection('flame-visual');
  };

  return (
    <div className="command-shell min-h-screen text-slate-100 flex flex-col font-sans relative selection:bg-cyan-500/30 selection:text-cyan-200">
      {showBootSplash && (
        <BootSplash
          key={bootNonce}
          onReveal={() => navigateToSection('overview')}
          onComplete={() => setShowBootSplash(false)}
        />
      )}
      {/* Uploaded orbital Earth horizon background across all pages */}
      <img
        src="/assets/aistudio/c8b9d561-08a0-4808-92e6-19ad1e4e75b4_12d2a232.png"
        alt="Earth horizon sunrise from orbit"
        className="command-wallpaper"
      />
      <div className="command-shade" />

      {/* COMPACT SIDE MENU BUTTON & DRAWER (Active only in dashboard modules, hidden on intro screen) */}
      {currentSection !== 'intro' && (
        <SideMenu
          currentSection={currentSection}
          onSelectSection={navigateToSection}
          onOpenDiscoveryEngine={() => setDiscoveryModalOpen(true)}
          isOpen={sideMenuOpen}
          onOpen={() => setSideMenuOpen(true)}
          onClose={() => setSideMenuOpen(false)}
        />
      )}

      {/* SCREEN 1: INTRO EDUCATIONAL TITLE & ACCORDION DROPDOWNS */}
      {currentSection === 'intro' ? (
        <IntroScreen
          onEnterDashboard={() => {
            setBootNonce((n) => n + 1);
            setShowBootSplash(true);
          }}
        />
      ) : (
        /* SCREEN 2: MAIN DASHBOARD (Home 2x2 grid or Dedicated Full-Screen Module Views) */
        <div className="flex-1 flex flex-col">
          <main className="flex-1 flex flex-col">
            <MainDashboard
              currentSection={currentSection}
              onSelectSection={navigateToSection}
              onOpenDiscoveryEngine={() => setDiscoveryModalOpen(true)}
              datasets={datasets}
              selectedDatasetId={selectedDatasetId}
              onSelectDatasetId={setSelectedDatasetId}
              onAddDataset={handleAddDataset}
              uploadedDataset={uploadedDataset}
              onClearUploadedData={() => setUploadedDataset(null)}
              selectedInvestigationId={selectedInvestigationId}
              onSelectInvestigationId={setSelectedInvestigationId}
              dataUploadSubTab={dataUploadSubTab}
              onChangeDataUploadSubTab={setDataUploadSubTab}
              flameVisualSubTab={flameVisualSubTab}
              onChangeFlameVisualSubTab={setFlameVisualSubTab}
              fragsAiMode={fragsAiMode}
              onChangeFragsAiMode={setFragsAiMode}
              pendingAiRequest={pendingAiRequest}
              pendingDetectiveTask={pendingDetectiveTask}
              onExplainUploadedData={handleExplainUploadedData}
              onRunDetectiveOnDataset={handleRunDetectiveOnDataset}
              onAskAiAboutInvestigation={handleAskAiAboutInvestigation}
              onAskAiWithPrompt={handleAskAiWithPrompt}
              onInspectDataset={handleInspectDataset}
              onInspectInvestigationDna={handleInspectInvestigationDna}
              onOpenResearchGaps={handleOpenResearchGaps}
              onOpenHabitatBridge={handleOpenHabitatBridge}
            />
          </main>

          {currentSection !== 'iss-fire-drill' && <Footer />}

          {/* Flame Intelligence Discovery Engine Modal (with Earth Impact Spin-Offs tab) */}
          <DiscoveryEngineModal
            isOpen={discoveryModalOpen}
            onClose={() => setDiscoveryModalOpen(false)}
            onOpenResearchGaps={() => handleOpenResearchGaps()}
            onOpenHabitatBridge={() => handleOpenHabitatBridge()}
          />
        </div>
      )}
    </div>
  );
}
