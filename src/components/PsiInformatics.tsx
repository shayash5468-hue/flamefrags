import React, { useState } from 'react';
import { PSI_MISSIONS, SPACE_FIRE_PARADOXES } from '../data/psiData';
import { PsiMission } from '../types';
import { sound } from '../utils/audio';
import { 
  BookOpen, 
  Search, 
  Dna, 
  AlertCircle, 
  Sparkles, 
  ExternalLink, 
  Check, 
  Layers, 
  Flame, 
  Share2,
  Atom
} from 'lucide-react';

export const PsiInformatics: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMission, setSelectedMission] = useState<PsiMission>(PSI_MISSIONS[0]);
  const [activeTab, setActiveTab] = useState<'database' | 'flametwin' | 'paradoxes'>('database');
  const [selectedFuelFilter, setSelectedFuelFilter] = useState<string>('all');

  const filteredMissions = PSI_MISSIONS.filter((m) => {
    const matchesSearch = 
      m.acronym.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.fuelType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.facility.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFuel = selectedFuelFilter === 'all' || m.fuelType.toLowerCase().includes(selectedFuelFilter.toLowerCase());

    return matchesSearch && matchesFuel;
  });

  // Calculate FlameTwin comparisons relative to selectedMission
  const flameTwinMatches = PSI_MISSIONS
    .filter(m => m.id !== selectedMission.id)
    .map(m => {
      // Calculate contextual compatibility
      const baseDiff = Math.abs(m.dnaSimilarityScore - selectedMission.dnaSimilarityScore);
      const similarity = Math.max(68, 100 - baseDiff * 1.5);
      return {
        ...m,
        calculatedSimilarity: Math.round(similarity)
      };
    })
    .sort((a, b) => b.calculatedSimilarity - a.calculatedSimilarity);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div className="glass p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 text-xs font-mono">
            <Atom className="w-3.5 h-3.5 text-emerald-400" />
            <span>NASA PHYSICAL SCIENCES INFORMATICS (PSI) ENGINE</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mt-1">
            Combustion Physics & Flight Telemetry Intelligence
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
            Data mining and scientific correlation across NASA BASS, Saffire, FLEX, and ACME microgravity combustion spaceflight experiments.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => { sound.playClick(); setActiveTab('database'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'database'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Flight Missions
          </button>
          <button
            onClick={() => { sound.playClick(); setActiveTab('flametwin'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'flametwin'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            FlameTwin Matrix
          </button>
          <button
            onClick={() => { sound.playClick(); setActiveTab('paradoxes'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'paradoxes'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Space Fire Paradoxes
          </button>
        </div>
      </div>

      {/* DATABASE VIEW */}
      {activeTab === 'database' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Mission Directory (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass p-4 rounded-xl space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search mission, facility, fuel, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Fuel filter chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                <span className="text-slate-400">Filter:</span>
                {['all', 'pmma', 'droplet', 'fabric', 'gas'].map((f) => (
                  <button
                    key={f}
                    onClick={() => { sound.playClick(); setSelectedFuelFilter(f); }}
                    className={`px-2 py-0.5 rounded-full capitalize transition ${
                      selectedFuelFilter === f
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Mission List */}
            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {filteredMissions.map((mission) => {
                const isSelected = selectedMission.id === mission.id;
                return (
                  <div
                    key={mission.id}
                    onClick={() => { sound.playClick(); setSelectedMission(mission); }}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-glow'
                        : 'bg-[#0d1527]/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-sm text-white">
                          {mission.acronym}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                          PSI Verified
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400">
                        DNA Match: <span className="text-emerald-400 font-bold">{mission.dnaSimilarityScore}%</span>
                      </span>
                    </div>

                    <div className="text-xs text-slate-200 font-medium">
                      {mission.name}
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 truncate">
                      Facility: {mission.facility}
                    </div>
                  </div>
                );
              })}

              {filteredMissions.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 glass rounded-xl">
                  No NASA PSI combustion missions matched your query.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Mission Deep Dive dossier (7 cols) */}
          <div className="lg:col-span-7">
            <div className="glass p-6 rounded-2xl border-emerald-900/40 space-y-5">
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="text-[10px] font-mono text-emerald-400 font-bold">
                    NASA FLIGHT INVESTIGATION DOSSIER · {selectedMission.acronym}
                  </div>
                  <h3 className="text-2xl font-display font-bold text-white mt-1">
                    {selectedMission.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Payload Facility: <span className="text-slate-200">{selectedMission.facility}</span>
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-center">
                  <div className="text-[9px] font-mono text-slate-400">FLAMETWIN DNA</div>
                  <div className="font-mono text-base font-bold text-emerald-300">
                    {selectedMission.dnaSimilarityScore}%
                  </div>
                </div>
              </div>

              {/* Fuel Specimen Card */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500 font-mono text-[10px] block">TEST FUEL & GEOMETRY:</span>
                  <span className="font-semibold text-slate-200">{selectedMission.fuelType}</span>
                </div>
                <Flame className="w-5 h-5 text-orange-400" />
              </div>

              {/* Abstract Summary */}
              <div>
                <h4 className="text-xs font-mono text-slate-400 mb-1">MISSION SUMMARY:</h4>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-[#060a16] p-3.5 rounded-xl border border-slate-800/80">
                  {selectedMission.summary}
                </p>
              </div>

              {/* Key Scientific Findings */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Key Microgravity Physical Discoveries:</span>
                </h4>
                <div className="space-y-2">
                  {selectedMission.keyFindings.map((finding, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                      <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-600/50 flex items-center justify-center text-[10px] font-mono text-emerald-400 shrink-0">
                        {idx + 1}
                      </span>
                      <span>{finding}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Space Exploration Relevance */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-600/30 text-xs text-slate-300 space-y-1">
                <span className="font-mono text-[10px] text-emerald-300 font-bold block">
                  EXPLORATION & ARTEMIS IMPACT:
                </span>
                <p className="leading-relaxed">
                  {selectedMission.relevanceToExploration}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLAMETWIN CROSS-EXPERIMENT CORRELATION MATRIX */}
      {activeTab === 'flametwin' && (
        <div className="space-y-6">
          <div className="glass p-5 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                  <Dna className="w-5 h-5 text-cyan-400" />
                  <span>FlameTwin Cross-Experiment Correlation Engine</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Correlates combustion kinetics, fuel geometry, and extinction thresholds across NASA flight datasets.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Anchor Mission:</span>
                <select
                  value={selectedMission.id}
                  onChange={(e) => {
                    const m = PSI_MISSIONS.find(item => item.id === e.target.value)!;
                    setSelectedMission(m);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 font-bold"
                >
                  {PSI_MISSIONS.map(m => (
                    <option key={m.id} value={m.id}>{m.acronym} - {m.name.slice(0, 24)}...</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Correlated missions grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {flameTwinMatches.map((twin) => (
                <div key={twin.id} className="p-4 rounded-xl bg-[#090f1f] border border-cyan-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-base text-white">{twin.acronym}</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-bold">
                      {twin.calculatedSimilarity}% Match
                    </span>
                  </div>

                  <div className="text-xs text-slate-300">
                    <span className="text-slate-500 block text-[10px] font-mono">FUEL PROFILE:</span>
                    {twin.fuelType}
                  </div>

                  <div className="text-xs text-slate-400 line-clamp-2">
                    {twin.summary}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px] font-mono text-cyan-400">
                    <span>{twin.facility.split('(')[0]}</span>
                    <button
                      onClick={() => {
                        setSelectedMission(twin);
                        setActiveTab('database');
                      }}
                      className="hover:underline flex items-center gap-1"
                    >
                      <span>View Data</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SPACE FIRE PARADOXES & RESEARCH GAPS */}
      {activeTab === 'paradoxes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SPACE_FIRE_PARADOXES.map((paradox, idx) => (
            <div key={idx} className="glass p-5 rounded-2xl border-amber-900/40 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display font-bold text-base text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{paradox.title}</span>
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/80 border border-amber-700/60 text-amber-300">
                  {paradox.category}
                </span>
              </div>

              <div className="text-[11px] font-mono text-emerald-400">
                STATUS: {paradox.status}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                {paradox.summary}
              </p>

              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200">
                <span className="font-mono text-[10px] font-bold block text-amber-400">FLIGHT ACTION DIRECTIVE:</span>
                {paradox.actionItem}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
