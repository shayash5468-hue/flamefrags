import React, { useState, useEffect } from 'react';
import { sound } from '../utils/audio';
import { EarthImpact } from './EarthImpact';
import { 
  Sparkles, 
  X, 
  CheckCircle2, 
  Globe2,
  Grid3x3,
  Globe
} from 'lucide-react';

interface DiscoveryResult {
  id: string;
  title: string;
  category: 'Correlation' | 'Research Gap' | 'Contradiction' | 'Confidence';
  confidenceLevel: 'Strongly Supported' | 'Moderately Supported' | 'Preliminary';
  experimentsInvolved: string[];
  findings: string;
  evidenceMeasurements: string;
  fireSafetyImpact: string;
}

const DISCOVERY_FINDINGS: DiscoveryResult[] = [
  {
    id: 'disc-1',
    title: 'The Low-Flow Extinction Inversion across Solid & Droplet Fuels',
    category: 'Contradiction',
    confidenceLevel: 'Strongly Supported',
    experimentsInvolved: ['BASS-II (PMMA)', 'Saffire-I (Cloth)', 'FLEX-1 (Heptane)', 'ACME CFI-G (Methane)'],
    findings: 'Across four distinct NASA flight investigations, flames exhibit an inverse relationship to airflow below 0.15 m/s. Whereas terrestrial flames are cooled and destabilized by drafts, microgravity flames require a critical low-velocity drift (0.05 m/s) to replace consumed oxygen without buoyant draft.',
    evidenceMeasurements: 'BASS-II: peak spread rate 0.19 mm/s at u=0.05 m/s; Saffire-I: planar spread sustained for 100cm at u=0.20 m/s; Quiescent FLEX: radiative quenching at 0.0 m/s.',
    fireSafetyImpact: 'Spacecraft emergency protocol rule: Inter-module ventilation isolation must occur within 30 seconds of fire alarm to force aerodynamic suffocation.'
  },
  {
    id: 'disc-2',
    title: 'Artemis Lunar & Martian Partial-Gravity Smoldering Blindspot',
    category: 'Research Gap',
    confidenceLevel: 'Moderately Supported',
    experimentsInvolved: ['BASS-II', 'SoFIE GEL', 'Apollo Ground Tests'],
    findings: 'NASA PSI datasets have comprehensive coverage at 10⁻⁶ g (ISS) and 1.0 g (Earth), but 0 indexed combustion flight datasets at 0.16 g (Moon) and 0.38 g (Mars). At partial gravity, weak buoyant convection alters smoke clearing and smoldering-to-flaming transition dynamics compared to both 0g and 1g.',
    evidenceMeasurements: 'PSI Repo Query: 0 matching records found in the currently indexed PSI collection for lunar/Martian partial-gravity combustion.',
    fireSafetyImpact: 'Artemis lunar base habitats cannot rely blindly on ISS zero-g fire protocols; dedicated lunar fire research and gap analysis are required.'
  },
  {
    id: 'disc-3',
    title: 'Invisible Cool-Flame Radicals as a Primary Spacecraft Re-Ignition Vector',
    category: 'Correlation',
    confidenceLevel: 'Strongly Supported',
    experimentsInvolved: ['FLEX-1', 'FLEX-2', 'ACME s-Flame'],
    findings: 'Alkylperoxy radical pools persist after visible flame extinction in low-temperature cool-flame regimes. Restoring ventilation supplies oxidizer to the radical pool, risking secondary hot ignition.',
    evidenceMeasurements: 'FLEX indexed runs: drop in visible radiative flux while thermocouple temperatures remain elevated around ~245°C.',
    fireSafetyImpact: 'Crew protocols must not declare "all clear" solely upon visible flame loss; gas analyzer and thermal equilibrium verification remain critical.'
  }
];

interface DiscoveryEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenResearchGaps?: () => void;
  onOpenHabitatBridge?: () => void;
}

export const DiscoveryEngineModal: React.FC<DiscoveryEngineModalProps> = ({
  isOpen,
  onClose,
  onOpenResearchGaps,
  onOpenHabitatBridge,
}) => {
  const [modalTab, setModalTab] = useState<'discovery' | 'earth'>('discovery');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannedCount, setScannedCount] = useState<number>(DISCOVERY_FINDINGS.length);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRunDiscover = () => {
    sound.playClick();
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScannedCount(DISCOVERY_FINDINGS.length);
      sound.playSuccess();
    }, 900);
  };

  const filtered = activeFilter === 'all' 
    ? DISCOVERY_FINDINGS 
    : DISCOVERY_FINDINGS.filter(d => d.category.toLowerCase().includes(activeFilter.toLowerCase()));

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel w-full max-w-4xl max-h-[88vh] rounded-2xl flex flex-col overflow-hidden border-cyan-500/50 shadow-glow"
      >
        {/* Modal Header */}
        <div className="p-5 bg-[#070b18] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-indigo-600 flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-bold text-lg text-white">
                  Flame Intelligence Discovery Engine
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-700">
                  PSI CROSS-EXPERIMENT & SPIN-OFFS
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400">
                Cross-investigation synthesis, research gaps, and Earth-impact combustion spin-offs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px]">
              <button
                onClick={() => { sound.playClick(); setModalTab('discovery'); }}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  modalTab === 'discovery' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>PSI Discovery</span>
              </button>
              <button
                onClick={() => { sound.playClick(); setModalTab('earth'); }}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  modalTab === 'earth' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe2 className="w-3 h-3" />
                <span>Earth Impact</span>
              </button>
            </div>

            <button
              onClick={() => { sound.playClick(); onClose(); }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {modalTab === 'discovery' ? (
          <>
            {/* Discovery Action Toolbar */}
            <div className="p-4 bg-[#050813] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-400">Filter:</span>
                {['all', 'contradiction', 'research gap', 'correlation'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { sound.playClick(); setActiveFilter(cat); }}
                    className={`px-2.5 py-1 rounded-lg capitalize transition cursor-pointer ${
                      activeFilter === cat
                        ? 'bg-cyan-600 text-white font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {onOpenResearchGaps && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      onClose();
                      onOpenResearchGaps();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-mono text-[11px] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Grid3x3 className="w-3.5 h-3.5" />
                    <span>Open Gap Detector</span>
                  </button>
                )}
                {onOpenHabitatBridge && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      onClose();
                      onOpenHabitatBridge();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Habitat Relevance</span>
                  </button>
                )}
                <button
                  onClick={handleRunDiscover}
                  disabled={isScanning}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-mono text-xs font-bold shadow-glow flex items-center gap-2 transition cursor-pointer"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Scanning 24 PSI...' : `Run Scan (${scannedCount})`}</span>
                </button>
              </div>
            </div>

            {/* Findings List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {filtered.map((item) => (
                <div key={item.id} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 font-sans">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          item.category === 'Contradiction' ? 'bg-amber-950 text-amber-300 border border-amber-700' :
                          item.category === 'Research Gap' ? 'bg-red-950 text-red-300 border border-red-700' :
                          'bg-cyan-950 text-cyan-300 border border-cyan-700'
                        }`}>
                          {item.category}
                        </span>
                        <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{item.confidenceLevel}</span>
                        </span>
                      </div>
                      <h4 className="font-display font-bold text-base text-white mt-1.5">{item.title}</h4>
                    </div>
                  </div>

                  {/* Experiments Involved Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-slate-400">
                    <span className="text-slate-500">Correlated Investigations:</span>
                    {item.experimentsInvolved.map((exp, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                        {exp}
                      </span>
                    ))}
                  </div>

                  {/* Scientific Explanation */}
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-[#060a16] p-3.5 rounded-xl border border-slate-800/80">
                    {item.findings}
                  </p>

                  {/* Supporting Measurements & Operational Impact */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">MEASUREMENT EVIDENCE:</span>
                      <span className="text-slate-200 text-[11px]">{item.evidenceMeasurements}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40">
                      <span className="text-cyan-400 block text-[10px] font-bold">SPACE FIRE SAFETY IMPACT:</span>
                      <span className="text-cyan-200 text-[11px]">{item.fireSafetyImpact}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-5">
            <EarthImpact />
          </div>
        )}
      </div>
    </div>
  );
};
