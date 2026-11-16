import React, { useState } from 'react';
import { Play, Maximize2, Shield, Compass, Eye, Activity, Sparkles, Clock, Layers, Glasses } from 'lucide-react';
import { IssFireDrillView } from './iss/IssFireDrillView';
import { VrExplorerOverlay } from './vr/VrExplorerOverlay';
import { sound } from '../utils/audio';

interface DrillGameProps {
  onReturnToDashboard?: () => void;
}

export const DrillGame: React.FC<DrillGameProps> = ({ onReturnToDashboard }) => {
  const [isPlayingFullScreen, setIsPlayingFullScreen] = useState(false);
  const [isPlayingVr, setIsPlayingVr] = useState(false);

  const handleLaunch = async () => {
    sound.playHapticLaunch();
    setIsPlayingFullScreen(true);

    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      // In iframes or mobile browsers where fullscreen might be restricted, the fixed inset-0 layer still delivers full screen
      console.debug('Browser fullscreen request ignored:', err);
    }
  };

  const handleExit = async (toDashboard: boolean = false) => {
    sound.playHapticClick('light');
    if (document.pointerLockElement && document.exitPointerLock) {
      try {
        document.exitPointerLock();
      } catch {
        // Ignore
      }
    }
    setIsPlayingFullScreen(false);
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.debug('Exit fullscreen ignored:', err);
    }
    if (toDashboard) {
      onReturnToDashboard?.();
    }
  };

  const handleLaunchVr = () => {
    sound.playHapticLaunch();
    setIsPlayingVr(true);
  };

  const handleExitVr = async () => {
    sound.playHapticClick('light');
    setIsPlayingVr(false);
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.debug('Exit fullscreen ignored:', err);
    }
  };

  // FULL SCREEN 3D ISS EXPERIENCE (ESC pauses inside IssFireDrillView instead of force-exiting)
  if (isPlayingFullScreen) {
    return (
      <div className="fixed inset-0 z-50 w-full h-[100dvh] bg-black overflow-hidden">
        <IssFireDrillView
          isFullScreen
          onExit={() => handleExit(false)}
          onReturnToDashboard={() => handleExit(true)}
        />
      </div>
    );
  }

  // LAUNCH SCREEN WITH PROMINENT "LAUNCH ISS FIRE DRILL" BOX + "LAUNCH HISTORICAL VR" BOX
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 animate-fade-up">
      {isPlayingVr && <VrExplorerOverlay onClose={() => void handleExitVr()} />}

      {/* Header briefing */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-mono text-xs shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>ORBITAL CREW SAFETY DRILL · ZERO-GRAVITY STATION SIMULATION</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-white">
          ISS Microgravity Simulation
        </h2>
        <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
          Step into the 18-module International Space Station interior to simulate orbital fire response and zero-G cabin physics.
        </p>
      </div>

      {/* DEDICATED PROMINENT BOX: LAUNCH ISS FIRE DRILL */}
      <div className="glass relative overflow-hidden rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-[#0e172e]/95 via-[#091022]/95 to-[#060a16]/95 p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.12)]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/[0.04] rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
              <span className="text-cyan-300 font-semibold">LEO · 418 KM</span>
              <span>·</span>
              <span>18 PRESSURIZED MODULES</span>
              <span>·</span>
              <span className="text-emerald-400">AUTOMATIC HATCHES</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-wide">
              Launch ISS Fire Drill
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Explore the entire station interior in full 3D, navigate zero-g drift through sliding vestibule hatches, and inspect the Earth through Cupola nadir windows.
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-1.5">
            <button
              onClick={handleLaunch}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-display text-base font-bold tracking-wide shadow-xl flex items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white shrink-0" />
              <span>Launch ISS Fire Drill</span>
              <Maximize2 className="w-4 h-4 text-cyan-200 shrink-0" />
            </button>
            <span className="text-[11px] font-mono text-slate-400 text-center sm:text-right">
              Full-screen 3D station simulation (Press ESC anytime for menu)
            </span>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-300 font-mono text-xs">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold">18 Modules</span>
            </div>
            <p className="text-xs text-slate-300">
              Destiny, Harmony, Columbus, Kibo, Zvezda, Nauka & all interconnects.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-300 font-mono text-xs">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">Auto-Hatches</span>
            </div>
            <p className="text-xs text-slate-300">
              Proximity-sensing doors slide open within 2.4 m and seal exterior ports.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-sky-300 font-mono text-xs">
              <Eye className="w-4 h-4 text-sky-400" />
              <span className="font-semibold">Cupola Observation</span>
            </div>
            <p className="text-xs text-slate-300">
              7-window dome looking out at Earth and sunrise horizon.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-300 font-mono text-xs">
              <Activity className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">Zero-G Controls</span>
            </div>
            <p className="text-xs text-slate-300">
              Mouse or touch-drag to look, WASD / D-pad to float, Space/Q for vertical lift.
            </p>
          </div>
        </div>
      </div>

      {/* DEDICATED PROMINENT BOX: LAUNCH HISTORICAL VR EXPLORER */}
      <div className="glass relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-b from-[#171226]/95 via-[#0b1022]/95 to-[#060a16]/95 p-6 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.12)]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/[0.05] rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
              <span className="text-amber-300 font-semibold">WEBXR & 3D</span>
              <span>·</span>
              <span>APOLLO 1 · APOLLO 13 · MIR</span>
              <span>·</span>
              <span className="text-cyan-400">HEAD TRACKING & TIMELINES</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-wide">
              Launch Historical VR
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Step inside NASA-sourced 3D reconstructions of Apollo 1 (1967), Apollo 13 (1970), and Mir (1997) with interactive component markers, incident timelines, 2-eye goggles, and full VR/head-tracking controls.
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-1.5">
            <button
              onClick={handleLaunchVr}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-display text-base font-bold tracking-wide shadow-xl flex items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Glasses className="w-5 h-5 shrink-0" />
              <span>Launch Historical VR</span>
              <Maximize2 className="w-4 h-4 text-amber-200 shrink-0" />
            </button>
            <span className="text-[11px] font-mono text-slate-400 text-center sm:text-right">
              Full-screen WebXR & 3D VR portal (All controls & 2-eye mode active)
            </span>
          </div>
        </div>

        {/* VR Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-300 font-mono text-xs">
              <Layers className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">3 Historic Craft</span>
            </div>
            <p className="text-xs text-slate-300">
              Apollo 1 CM-012, Apollo 13 Service/Command Modules, and Mir Spektr/Kvant-1.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-300 font-mono text-xs">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold">Incident Timelines</span>
            </div>
            <p className="text-xs text-slate-300">
              Chronological playback, numbered 3D markers, Simple/Advanced NASA briefs & upgrades.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-sky-300 font-mono text-xs">
              <Eye className="w-4 h-4 text-sky-400" />
              <span className="font-semibold">Head Track & Gaze</span>
            </div>
            <p className="text-xs text-slate-300">
              Gyro IMU, Webcam optical head tracking, Cursor look, and dwell-gaze reticle (G).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-300 font-mono text-xs">
              <Glasses className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">WebXR & 2-Eye VR</span>
            </div>
            <p className="text-xs text-slate-300">
              Native WebXR headset mode, 2-Eye split goggles (V), WASD, mouse & touch pads.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

