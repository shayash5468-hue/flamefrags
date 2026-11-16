import React, { useState } from 'react';
import { sound } from '../utils/audio';
import flameFragsLogo from '../assets/flamefrags-logo.png';
import { 
  ChevronDown, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

interface IntroScreenProps {
  onEnterDashboard: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onEnterDashboard }) => {
  // Dropdown states
  const [openDropdown, setOpenDropdown] = useState<'microgravity' | 'flames' | 'spaceapps' | null>('microgravity');

  const toggleDropdown = (id: 'microgravity' | 'flames' | 'spaceapps') => {
    sound.playHapticClick('light');
    setOpenDropdown(prev => prev === id ? null : id);
  };

  return (
    <div className="min-h-screen text-slate-100 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-tr from-cyan-600/15 via-orange-600/10 to-transparent blur-3xl pointer-events-none rounded-full" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-900/10 blur-3xl pointer-events-none rounded-full" />

      {/* Main Content Area */}
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-16 flex-1 flex flex-col justify-center space-y-8 z-10">
        {/* Title Header */}
        <div className="text-center space-y-2">
          {/* Official FlameFrags Logo with adequate space so it is never covered */}
          <div className="py-4 sm:py-6 px-2 flex items-center justify-center">
            <img
              src={flameFragsLogo}
              alt="FlameFrags - Flame in Freefall"
              className="w-full max-w-lg sm:max-w-xl md:max-w-2xl h-auto max-h-[180px] sm:max-h-[220px] object-contain select-none drop-shadow-[0_0_35px_rgba(56,189,248,0.7)] transition-transform duration-300 hover:scale-[1.02]"
            />
          </div>
        </div>

        {/* 3 Interactive Topic Dropdowns */}
        <div className="space-y-3.5 pt-2">
          {/* Dropdown 1: What is Microgravity? */}
          <div className="glass overflow-hidden rounded-2xl border-cyan-900/40 transition">
            <button
              onClick={() => toggleDropdown('microgravity')}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-white/[0.02] transition"
            >
              <div>
                <h3 className="font-display font-bold text-base sm:text-lg text-white">
                  What is Microgravity?
                </h3>
                <p className="text-xs text-slate-400">
                  Understanding continuous freefall and the absence of natural buoyant convection
                </p>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${openDropdown === 'microgravity' ? 'rotate-180 text-cyan-400' : ''}`} />
            </button>

            {openDropdown === 'microgravity' && (
              <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 space-y-3 bg-[#060a16]/60">
                <p>
                  Microgravity is an environment where the effective gravitational acceleration is extremely small—typically on the order of <strong className="text-cyan-300 font-mono">10⁻⁶ g</strong> (one millionth of Earth’s gravity). Aboard the International Space Station (ISS) orbiting ~418 km above Earth at 27,600 km/h, the station and everything inside it are in a state of perpetual freefall toward Earth while moving sideways fast enough to continuously curve around the planet.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">BUOYANCY ELIMINATION</span>
                    <span className="text-slate-200">Hot air no longer rises; cold air no longer sinks.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">SEDIMENTATION REMOVAL</span>
                    <span className="text-slate-200">Particles and soot do not settle to the floor.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">DIFFUSION GOVERNANCE</span>
                    <span className="text-slate-200">All transport is driven purely by molecular diffusion.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dropdown 2: How Flames Behave in Microgravity */}
          <div className="glass overflow-hidden rounded-2xl border-amber-900/40 transition">
            <button
              onClick={() => toggleDropdown('flames')}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-white/[0.02] transition"
            >
              <div>
                <h3 className="font-display font-bold text-base sm:text-lg text-white">
                  How Flames Behave in Microgravity
                </h3>
                <p className="text-xs text-slate-400">
                  Spherical envelopes, blue chemiluminescence, soot shells, and invisible cool flames
                </p>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${openDropdown === 'flames' ? 'rotate-180 text-amber-400' : ''}`} />
            </button>

            {openDropdown === 'flames' && (
              <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 space-y-3 bg-[#060a16]/60">
                <p>
                  On Earth, buoyancy creates a self-ventilating chimney effect that stretches flames into tall, flickering, yellow-orange teardrops. In microgravity, the physics completely transforms:
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-cyan-400 font-bold shrink-0">1. Spherical Symmetry:</span>
                    <span>Without upward buoyancy, diffusion acts equally in all directions, creating an eerily quiet, spherical flame ball.</span>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-cyan-400 font-bold shrink-0">2. Ghostly Blue Chemiluminescence:</span>
                    <span>Without strong convective airflow bringing massive oxygen, soot production drops. The visible flame is a faint blue glow caused by excited CH* and C₂* molecular radical emissions.</span>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-cyan-400 font-bold shrink-0">3. The Cool Flame Phenomenon:</span>
                    <span>Discovered in NASA’s FLEX space experiments: after the visible hot flame (~1400°C) goes out, the fuel droplet continues burning invisibly at ~250°C. If fresh air is reintroduced, it can violently flash into a hot flame without warning.</span>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-cyan-400 font-bold shrink-0">4. The Low-Flow Paradox:</span>
                    <span>Zero airflow suffocates the flame in its own CO₂ blanket; a tiny draft (0.05 m/s) feeds the fire without blowing it out, maximizing fire risk.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dropdown 3: NASA Space Apps Challenge Topic */}
          <div className="glass overflow-hidden rounded-2xl border-emerald-900/40 transition">
            <button
              onClick={() => toggleDropdown('spaceapps')}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-white/[0.02] transition"
            >
              <div>
                <h3 className="font-display font-bold text-base sm:text-lg text-white">
                  NASA Space Apps Challenge: "Flame in Freefall"
                </h3>
                <p className="text-xs text-slate-400">
                  Mining decades of NASA Physical Sciences Informatics (PSI) combustion research
                </p>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${openDropdown === 'spaceapps' ? 'rotate-180 text-emerald-400' : ''}`} />
            </button>

            {openDropdown === 'spaceapps' && (
              <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 space-y-3 bg-[#060a16]/60">
                <p>
                  NASA’s 2026 Space Apps Challenge asks global teams to unlock the value in NASA's Physical Sciences Informatics (PSI) database. Rather than building simple chatbots or static viewers, NASA seeks an interactive scientific platform that connects real experimental datasets (BASS, Saffire, FLEX, ACME, SoFIE) to solve critical space exploration challenges:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Predictive fire risk modeling for Artemis Moon bases & Mars habitats</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Cross-experiment discovery & research gap identification</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Side-by-side comparison & scientific Flame DNA fingerprinting</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Acoustic and fine-water-mist suppression innovations for Earth and space</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Proceed to Dashboard CTA Button */}
        <div className="pt-4 text-center">
          <button
            type="button"
            onClick={() => {
              onEnterDashboard();
              sound.playHapticLaunch();
            }}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-display font-bold text-base sm:text-lg tracking-wide shadow-glow transition flex items-center justify-center gap-3 mx-auto group cursor-pointer active:scale-[0.99]"
          >
            <span>Launch FlameFrags Command Dashboard</span>
            <ArrowRight className="w-5 h-5 transition transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
