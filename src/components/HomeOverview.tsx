import React from 'react';
import { ActiveTab, StationTelemetry } from '../types';
import { sound } from '../utils/audio';
import { 
  Gamepad2, 
  Flame, 
  BookOpen, 
  FileText, 
  Boxes, 
  Globe2, 
  ArrowRight, 
  Satellite, 
  Sparkles, 
  ShieldAlert,
  Bot
} from 'lucide-react';

interface HomeOverviewProps {
  setActiveTab: (tab: ActiveTab) => void;
  openCopilot: () => void;
  telemetry: StationTelemetry;
}

export const HomeOverview: React.FC<HomeOverviewProps> = ({
  setActiveTab,
  openCopilot,
  telemetry
}) => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-mono text-xs shadow-glow">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>NASA SPACE APPS CHALLENGE 2026 · TOPIC: FLAME IN FREEFALL</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-white leading-tight">
          Flame in Freefall Hub
        </h1>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
          Command and control dashboard for real-time microgravity combustion simulation, 3D station response drills, and AI hazard prediction.
        </p>

        {/* Orbit status pill */}
        <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-slate-700/80 bg-[#090f20]/80 px-4 py-1.5 font-mono text-[11px] text-slate-300 backdrop-blur">
          <span className="inline-flex items-center gap-1.5">
            <Satellite className="w-3.5 h-3.5 text-emerald-400" />
            <span>Station: <strong className="text-emerald-400">ISS Node 3</strong></span>
          </span>
          <span className="opacity-40">|</span>
          <span>Atmosphere: <strong className="text-white">{telemetry.oxygenPercent.toFixed(1)}% O₂</strong></span>
          <span className="opacity-40">|</span>
          <span>Gravity: <strong className="text-amber-300">µG (10⁻⁶ g)</strong></span>
        </div>
      </div>

      {/* 4 Main Hero Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: 3D Minigame Drill */}
        <button
          onClick={() => { sound.playClick(); setActiveTab('drill'); }}
          className="glass group p-6 text-left transition hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-glow flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between">
              <span className="text-3xl">🎮</span>
              <span className="rounded-full border border-cyan-800/80 bg-cyan-950/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-cyan-300">
                Interactive 3D drill
              </span>
            </div>
            <h3 className="mt-4 flex items-center justify-between font-display text-lg sm:text-xl font-bold text-white group-hover:text-cyan-300 transition">
              <span>ISS Fire Drill 3D</span>
              <ArrowRight className="w-5 h-5 text-slate-500 transition group-hover:translate-x-1 group-hover:text-cyan-400" />
            </h3>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">
              Float through 18 interconnected ISS modules in zero-G, navigate automatic proximity hatches, and inspect the station interior in full 3D.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-cyan-400">
            <span>18 Modules · Full Screen 3D</span>
            <span className="underline">Launch ISS Fire Drill →</span>
          </div>
        </button>

        {/* Card 2: Particle Simulator */}
        <button
          onClick={() => { sound.playClick(); setActiveTab('simulator'); }}
          className="glass group p-6 text-left transition hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-glow flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between">
              <span className="text-3xl">🔥</span>
              <span className="rounded-full border border-amber-800/80 bg-amber-950/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-amber-300">
                0G vs 1G physics
              </span>
            </div>
            <h3 className="mt-4 flex items-center justify-between font-display text-lg sm:text-xl font-bold text-white group-hover:text-amber-300 transition">
              <span>Particle Simulator & AI Controls</span>
              <ArrowRight className="w-5 h-5 text-slate-500 transition group-hover:translate-x-1 group-hover:text-amber-400" />
            </h3>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">
              Adjust oxygen concentration and ventilation airflow while watching real-time particle flame dynamics and AI threat status.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-amber-400">
            <span>Kinetic Particle Engine · AI Hazard</span>
            <span className="underline">Experiment Physics →</span>
          </div>
        </button>

        {/* Card 3: PSI Informatics */}
        <button
          onClick={() => { sound.playClick(); setActiveTab('informatics'); }}
          className="glass group p-6 text-left transition hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-glow flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between">
              <span className="text-3xl">📚</span>
              <span className="rounded-full border border-emerald-800/80 bg-emerald-950/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-emerald-300">
                NASA PSI informatics
              </span>
            </div>
            <h3 className="mt-4 flex items-center justify-between font-display text-lg sm:text-xl font-bold text-white group-hover:text-emerald-300 transition">
              <span>Combustion Physics & Telemetry</span>
              <ArrowRight className="w-5 h-5 text-slate-500 transition group-hover:translate-x-1 group-hover:text-emerald-400" />
            </h3>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">
              Explore spherical flame geometry, soot accumulation and temperature telemetry charts, plus NASA PSI experiment intelligence.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-emerald-400">
            <span>BASS · Saffire · FLEX · ACME</span>
            <span className="underline">Explore Database →</span>
          </div>
        </button>

        {/* Card 4: SOP & Video */}
        <button
          onClick={() => { sound.playClick(); setActiveTab('protocols'); }}
          className="glass group p-6 text-left transition hover:-translate-y-1 hover:border-sky-500/50 hover:shadow-glow flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between">
              <span className="text-3xl">📹</span>
              <span className="rounded-full border border-sky-800/80 bg-sky-950/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-sky-300">
                Flight video & SOP
              </span>
            </div>
            <h3 className="mt-4 flex items-center justify-between font-display text-lg sm:text-xl font-bold text-white group-hover:text-sky-300 transition">
              <span>Safety Protocols & NASA Video</span>
              <ArrowRight className="w-5 h-5 text-slate-500 transition group-hover:translate-x-1 group-hover:text-sky-400" />
            </h3>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">
              Review spacecraft fire emergency procedures step by step and watch NASA flight experiment footage.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-sky-400">
            <span>ISS SOP 1 to 6 · Saffire Burns</span>
            <span className="underline">View Directives →</span>
          </div>
        </button>
      </div>

      {/* 2 Secondary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => { sound.playClick(); setActiveTab('station-map'); }}
          className="glass p-5 text-left transition hover:border-purple-500/50 hover:shadow-glow flex items-center justify-between group"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🗺️</span>
              <h4 className="font-display font-bold text-base text-white group-hover:text-purple-300 transition">
                ISS Node 3 3D Map
              </h4>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Rotate the module blueprint, cutaway racks, and fire sectors.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-purple-400" />
        </button>

        <button
          onClick={() => { sound.playClick(); setActiveTab('earth-impact'); }}
          className="glass p-5 text-left transition hover:border-teal-500/50 hover:shadow-glow flex items-center justify-between group"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌍</span>
              <h4 className="font-display font-bold text-base text-white group-hover:text-teal-300 transition">
                Earth Impact
              </h4>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              How space fire research protects people on Earth.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-teal-400" />
        </button>
      </div>

      {/* Floating AI Copilot Prompt Banner */}
      <div className="glass p-5 rounded-2xl border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-cyan-950/30 via-[#0a1122] to-blue-950/30">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center shrink-0">
            <Bot className="w-6 h-6 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h4 className="font-display font-bold text-base text-white">
              Have Questions About Space Fire Science?
            </h4>
            <p className="text-xs text-slate-300">
              Ask our AI Safety Copilot about spherical flames, invisible cool flames, low-flow paradoxes, or astronaut response SOPs.
            </p>
          </div>
        </div>

        <button
          onClick={() => { sound.playClick(); openCopilot(); }}
          className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-glow shrink-0 flex items-center gap-2"
        >
          <span>Ask AI Copilot</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
