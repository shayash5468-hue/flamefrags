import React, { useEffect, useState } from 'react';
import { DashboardSection } from '../types';
import { sound } from '../utils/audio';
import flameFragsLogo from '../assets/flamefrags-logo.png';
import { ChevronRight, X, Volume2, VolumeX } from 'lucide-react';

interface SideMenuProps {
  currentSection: DashboardSection;
  onSelectSection: (section: DashboardSection) => void;
  onOpenDiscoveryEngine: () => void;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export const SideMenu: React.FC<SideMenuProps> = ({
  currentSection,
  onSelectSection,
  onOpenDiscoveryEngine,
  isOpen,
  onClose,
  onOpen,
}) => {
  const [muted, setMuted] = useState(sound.getMuted());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    sound.setMuted(next);
    if (!next) {
      sound.playClick();
      sound.startStationHum();
    }
  };

  const navItems: {
    id: DashboardSection;
    matchIds?: DashboardSection[];
    label: string;
    activeClass: string;
    idleClass: string;
  }[] = [
    {
      id: 'overview',
      label: 'Home / Module Selection',
      activeClass:
        'border-cyan-400 bg-cyan-950/50 text-white shadow-[0_0_16px_rgba(34,211,238,0.28)]',
      idleClass:
        'border-cyan-500/35 bg-[#120929]/55 text-slate-200 hover:border-cyan-400/75 hover:bg-cyan-950/35',
    },
    {
      id: 'frags-ai',
      label: '1. Frags the AI',
      activeClass:
        'border-sky-400 bg-sky-950/50 text-white shadow-[0_0_16px_rgba(56,189,248,0.25)]',
      idleClass:
        'border-sky-500/30 bg-[#120929]/55 text-slate-200 hover:border-sky-400/70 hover:bg-sky-950/35',
    },
    {
      id: 'data-upload',
      label: '2. Data Upload',
      activeClass:
        'border-emerald-400 bg-emerald-950/50 text-white shadow-[0_0_16px_rgba(16,185,129,0.25)]',
      idleClass:
        'border-emerald-500/30 bg-[#120929]/55 text-slate-200 hover:border-emerald-400/70 hover:bg-emerald-950/35',
    },
    {
      id: 'flame-visual',
      label: '3. Flame Visual',
      activeClass:
        'border-purple-400 bg-purple-950/55 text-white shadow-[0_0_16px_rgba(168,85,247,0.28)]',
      idleClass:
        'border-purple-500/35 bg-[#120929]/55 text-slate-200 hover:border-purple-400/75 hover:bg-purple-950/35',
    },
    {
      id: 'minigame',
      matchIds: ['minigame', 'iss-fire-drill'],
      label: '4. Simulation',
      activeClass:
        'border-amber-400 bg-amber-950/50 text-white shadow-[0_0_16px_rgba(245,158,11,0.25)]',
      idleClass:
        'border-amber-500/35 bg-[#120929]/55 text-slate-200 hover:border-amber-400/75 hover:bg-amber-950/35',
    },
  ];

  const handleNavigate = (section: DashboardSection) => {
    sound.playHapticLaunch();
    onSelectSection(section);
    onClose();
  };

  return (
    <>
      {/* Discreet Left-Edge Vertical Tab */}
      {!isOpen && (
        <button
          onClick={() => {
            sound.playHapticClick('medium');
            onOpen();
          }}
          aria-label="Open menu"
          className="menu-tab select-none"
          title="Open Navigation Menu"
        >
          <ChevronRight className="h-3.5 w-3.5 text-cyan-200 shrink-0" />
          <span>MENU</span>
        </button>
      )}

      {/* Slide-out Menu Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Soft dark blurred backdrop */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-black/55 backdrop-blur-md transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer Container matching the rich purple shade behind the sections */}
          <aside className="relative w-[275px] sm:w-[295px] h-full flex flex-col justify-between bg-gradient-to-br from-purple-900/55 via-indigo-950/75 to-[#110822]/92 bg-[#110822]/85 backdrop-blur-xl z-50 text-slate-200 shadow-2xl overflow-hidden">
            {/* Subtle radial purple atmosphere behind the navigation section stack */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_68%_50%,rgba(147,51,234,0.34),rgba(76,29,149,0.22)_52%,rgba(17,8,34,0.65)_100%)]"
            />
            {/* Multi-stop glowing right vertical border matching reference */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 right-0 bottom-0 w-[2px] bg-gradient-to-b from-cyan-400 via-purple-500 to-teal-400 opacity-95 shadow-[0_0_12px_rgba(56,189,248,0.45)]"
            />

            <div className="relative z-10">
              {/* Top Header Row: Logo + Red-tinted Close button */}
              <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-purple-400/20">
                <img
                  src={flameFragsLogo}
                  alt="FlameFrags - Flame in Freefall"
                  className="h-11 w-auto max-w-[145px] object-contain select-none drop-shadow-[0_0_14px_rgba(56,189,248,0.55)]"
                />

                <button
                  type="button"
                  onClick={() => {
                    sound.playHapticClick('light');
                    onClose();
                  }}
                  className="h-8 px-3 shrink-0 rounded-lg bg-red-950/40 hover:bg-red-900/55 text-red-200 hover:text-white border border-red-500/45 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Close</span>
                </button>
              </div>

              {/* Navigation Buttons Stack */}
              <nav className="px-4 py-5 space-y-2.5 overflow-y-auto max-h-[calc(100dvh-160px)]">
                {navItems.map((item) => {
                  const isActive = item.matchIds
                    ? item.matchIds.includes(currentSection)
                    : currentSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-left text-xs sm:text-[13px] font-medium transition cursor-pointer ${
                        isActive ? item.activeClass : item.idleClass
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}

                <div className="my-3 h-px bg-purple-400/20" />

                <button
                  type="button"
                  onClick={() => {
                    sound.playHapticClick('medium');
                    onOpenDiscoveryEngine();
                    onClose();
                  }}
                  className="w-full rounded-xl border border-indigo-400/45 bg-gradient-to-r from-cyan-950/45 via-purple-950/45 to-amber-950/35 hover:border-indigo-300/80 px-3.5 py-2.5 text-left text-xs sm:text-[13px] font-medium text-slate-100 transition cursor-pointer"
                >
                  Flame Intelligence Engine
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('intro')}
                  className="w-full rounded-xl border border-rose-500/35 bg-[#120929]/55 hover:border-rose-400/75 hover:bg-rose-950/35 px-3.5 py-2.5 text-left text-xs sm:text-[13px] font-medium text-slate-200 transition cursor-pointer"
                >
                  Intro & Science Background
                </button>
              </nav>
            </div>

            {/* Bottom Audio Toggle Row */}
            <div className="relative z-10 border-t border-purple-400/20 px-4 py-4 flex items-center justify-between bg-[#0f0722]/75">
              <span className="text-xs text-slate-400 font-medium">Space Audio:</span>
              <button
                type="button"
                onClick={toggleSound}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                  muted
                    ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-slate-400'
                    : 'bg-teal-950/45 hover:bg-teal-900/55 border-teal-400/55 text-teal-300'
                }`}
              >
                {muted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                    <span>Muted</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-teal-300" />
                    <span>Active</span>
                  </>
                )}
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
