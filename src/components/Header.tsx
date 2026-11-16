import React, { useState, useEffect } from 'react';
import { ActiveTab, StationTelemetry } from '../types';
import { sound } from '../utils/audio';
import { 
  Flame, 
  Gamepad2, 
  Sliders, 
  BookOpen, 
  FileText, 
  Boxes, 
  Globe2, 
  Bot, 
  Volume2, 
  VolumeX, 
  Radio, 
  Activity, 
  AlertTriangle,
  Menu,
  X
} from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  openCopilot: () => void;
  telemetry: StationTelemetry;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  openCopilot,
  telemetry
}) => {
  const [muted, setMuted] = useState(sound.getMuted());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    sound.setMuted(next);
    if (!next) {
      sound.playClick();
      sound.startStationHum();
    }
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'home', label: 'Hub Home', icon: <Flame className="w-4 h-4 text-orange-400" /> },
    { id: 'drill', label: '3D Fire Drill', icon: <Gamepad2 className="w-4 h-4 text-cyan-400" />, badge: '3D Game' },
    { id: 'simulator', label: '0G vs 1G Physics', icon: <Sliders className="w-4 h-4 text-amber-400" /> },
    { id: 'informatics', label: 'NASA PSI Data', icon: <BookOpen className="w-4 h-4 text-emerald-400" /> },
    { id: 'protocols', label: 'Safety SOP & Video', icon: <FileText className="w-4 h-4 text-sky-400" /> },
    { id: 'station-map', label: 'Node 3 3D Map', icon: <Boxes className="w-4 h-4 text-purple-400" /> },
    { id: 'earth-impact', label: 'Earth Impact', icon: <Globe2 className="w-4 h-4 text-teal-400" /> },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-cyan-900/30 bg-[#070b16]/90 backdrop-blur-md">
      {/* Top telemetry ticker bar */}
      <div className="bg-[#040711] border-b border-slate-800/80 px-4 py-1.5 text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 overflow-x-auto py-0.5">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-cyan-400">ISS NODE 3</span>
            <span className="text-slate-500">|</span>
            <span>EXPEDITION 73</span>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1">
              ALT: <span className="text-slate-200">{telemetry.altitude} km</span>
            </span>
            <span className="flex items-center gap-1">
              SPEED: <span className="text-slate-200">{telemetry.speed.toLocaleString()} km/h</span>
            </span>
            <span className="flex items-center gap-1">
              CABIN O₂: <span className={telemetry.oxygenPercent < 19.5 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                {telemetry.oxygenPercent.toFixed(1)}%
              </span>
            </span>
            <span className="flex items-center gap-1">
              PRESSURE: <span className="text-slate-200">{telemetry.cabinPressure.toFixed(1)} kPa</span>
            </span>
            <span className="flex items-center gap-1">
              GRAVITY: <span className="text-amber-300 font-semibold">µG (10⁻⁶ g)</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {telemetry.alarmActive ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/80 border border-red-500/70 text-red-400 font-bold animate-pulse text-[10px]">
              <AlertTriangle className="w-3 h-3" />
              <span>ACTIVE SMOKE ALARM</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
              <span>FIRE DETECTION NOMINAL</span>
            </div>
          )}

          <button
            onClick={toggleSound}
            className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 text-slate-500" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div 
          onClick={() => { sound.playClick(); setActiveTab('home'); }} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 p-0.5 shadow-glow transition group-hover:scale-105">
            <div className="w-full h-full bg-[#070b16] rounded-[10px] flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-lg sm:text-xl tracking-wide text-white group-hover:text-cyan-300 transition">
                Flame in Freefall
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                NASA SPACE APPS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Orbital Fire Drill & Microgravity Combustion Command Hub
            </p>
          </div>
        </div>

        {/* Desktop Nav tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#0b1222]/80 p-1 rounded-xl border border-slate-800">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  sound.playClick();
                  setActiveTab(item.id);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-900/60 text-cyan-200 border border-cyan-700/40">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right side Copilot & Mobile toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.playClick();
              openCopilot();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-500/40 text-cyan-200 text-xs font-semibold hover:from-cyan-600/50 hover:to-blue-600/50 shadow-glow transition group"
          >
            <Bot className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
            <span className="hidden sm:inline">AI Safety Copilot</span>
            <span className="sm:hidden">AI</span>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-300"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0a0f1d] border-b border-slate-800 px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  sound.playClick();
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-900/60 text-cyan-200 border border-cyan-700/40">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
