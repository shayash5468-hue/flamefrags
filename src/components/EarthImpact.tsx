import React, { useState } from 'react';
import { sound } from '../utils/audio';
import { 
  Globe2, 
  Droplets, 
  Flame, 
  Cpu, 
  Ship, 
  Train, 
  Building2, 
  Leaf, 
  ArrowRight, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface ImpactCard {
  id: string;
  title: string;
  spaceOrigin: string;
  earthApplication: string;
  icon: React.ReactNode;
  sectors: string[];
  statNumber: string;
  statLabel: string;
  detailedInsight: string;
}

const IMPACTS: ImpactCard[] = [
  {
    id: 'fine-water-mist',
    title: 'Fine Water Mist Fire Suppression',
    spaceOrigin: 'ISS Portable Fire Extinguisher (PFE) & FLEX Droplet Research',
    earthApplication: 'Non-toxic, zero-ozone fire suppression replacing hazardous Halon gas systems.',
    icon: <Droplets className="w-6 h-6 text-cyan-400" />,
    sectors: ['AI Data Centers', 'Maritime Ships', 'Historic Archives', 'Hospital ICUs'],
    statNumber: '90%',
    statLabel: 'Water volume reduction vs conventional sprinkler flooding',
    detailedInsight: 'Space station extinguishers cannot use Halon due to toxic breakdown gases, nor standard sprinkler hoses that drown electronics. NASA developed microscopic mist (50-100 micron droplets) that extracts heat instantly by rapid phase change and blankets the flame in steam without damaging server racks.'
  },
  {
    id: 'clean-combustion',
    title: 'Ultra-Low Emission Industrial Burners',
    spaceOrigin: 'ACME CFI-G & MDCA Microgravity Gas Diffusion Experiments',
    earthApplication: 'Hydrogen and renewable biofuel combustion burners that eliminate toxic soot and reduce NOx emissions.',
    icon: <Leaf className="w-6 h-6 text-emerald-400" />,
    sectors: ['Aviation Turbines', 'Clean Hydrogen Power Plants', 'Steel Manufacturing'],
    statNumber: '40%',
    statLabel: 'Reduction in soot particulate emissions modeled via PSI datasets',
    detailedInsight: 'On Earth, gravity pulls cold air into flames, creating turbulence that obscures molecular reaction rates. Microgravity allows scientists to isolate pure chemical kinetics without convective distortion, designing next-generation near-zero-emission gas turbines.'
  },
  {
    id: 'wildfire-embers',
    title: 'Wildfire Ember Flight & Spot Fire Prediction',
    spaceOrigin: 'BASS & BASS-II Low-Flow Solid Particle Combustion',
    earthApplication: 'Advanced physics models predicting how wind-blown embers travel across firebreaks to ignite residential neighborhoods.',
    icon: <Flame className="w-6 h-6 text-orange-400" />,
    sectors: ['Wildland Fire Services', 'Urban Forestry', 'Disaster Evacuation Planning'],
    statNumber: '3x',
    statLabel: 'Faster prediction accuracy for ember shower spot fires',
    detailedInsight: 'BASS experiments proved that embers smolder differently when airflow is weak and unsteady. Terrestrial fire departments now use NASA microgravity ember decay algorithms to predict where flying pinecone and bark embers will ignite spot fires miles ahead of wildfire fronts.'
  },
  {
    id: 'battery-containment',
    title: 'Subterranean Battery Thermal Runaway Containment',
    spaceOrigin: 'Saffire Spacecraft Sealed Compartment Runaway Fire Research',
    earthApplication: 'Preventing catastrophic cascading thermal runaway in EV car parks, subway rail tunnels, and grid-scale battery storage.',
    icon: <Cpu className="w-6 h-6 text-purple-400" />,
    sectors: ['Subway Tunnels', 'EV Multi-Storey Garages', 'Grid Energy Storage'],
    statNumber: '100%',
    statLabel: 'Containment of toxic fluorinated electrolyte aerosols',
    detailedInsight: 'Saffire tests on uncrewed Cygnus spacecraft mapped how fires behave in hermetically sealed volumes with limited oxygen. Cities use this exact data to design emergency ventilation dampers that choke subway battery fires without spreading poison smoke to passenger stations.'
  }
];

export const EarthImpact: React.FC = () => {
  const [selectedImpact, setSelectedImpact] = useState<ImpactCard>(IMPACTS[0]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div className="glass p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-950/80 border border-teal-600/50 text-teal-300 text-xs font-mono">
            <Globe2 className="w-3.5 h-3.5 text-teal-400" />
            <span>NASA TECHNOLOGY TRANSFER & SOCIETAL SPIN-OFFS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mt-1">
            Earth Impact: How Space Fire Research Saves Lives on Earth
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
            Discover how astronauts fighting microgravity fires high above our atmosphere directly safeguards hospitals, data centers, clean energy, and cities.
          </p>
        </div>
      </div>

      {/* Grid of 4 Earth Impact cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {IMPACTS.map((item) => {
          const isSelected = selectedImpact.id === item.id;
          return (
            <div
              key={item.id}
              onClick={() => { sound.playClick(); setSelectedImpact(item); }}
              className={`p-6 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-teal-950/40 border-teal-500 shadow-glow'
                  : 'bg-[#0a1122]/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    {item.icon}
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-2xl font-bold text-teal-300">{item.statNumber}</div>
                    <div className="text-[10px] font-mono text-slate-400 max-w-[140px]">{item.statLabel}</div>
                  </div>
                </div>

                <h3 className="font-display font-bold text-lg text-white mt-4">{item.title}</h3>
                
                <div className="mt-2 text-xs font-mono text-teal-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Origin: {item.spaceOrigin}</span>
                </div>

                <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                  {item.earthApplication}
                </p>

                {/* Sectors badges */}
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {item.sectors.map((sec, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-800">
                      {sec}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-teal-400">
                <span>View Full Technology Dossier</span>
                <ArrowRight className="w-4 h-4 transition transform group-hover:translate-x-1" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Deep-dive Technology Dossier for Selected Impact */}
      <div className="glass p-6 sm:p-8 rounded-2xl border-teal-900/40 space-y-4">
        <div className="flex items-center gap-2 text-teal-400 font-mono text-xs">
          <ShieldCheck className="w-4 h-4" />
          <span>EXPANDED SPINOFF BRIEF · {selectedImpact.title.toUpperCase()}</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-display font-bold text-white">
          From Low Earth Orbit to Terrestrial Safety Standards
        </h3>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-[#060a16] p-4 rounded-xl border border-slate-800">
          {selectedImpact.detailedInsight}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-center font-mono text-xs">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-500 block text-[10px]">PATENT / TECH CLASS</span>
            <span className="text-slate-200 font-semibold">NASA Spinoff #NTTS-8402</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-500 block text-[10px]">GLOBAL ADOPTION</span>
            <span className="text-teal-300 font-semibold">NFPA 750 / IMO Standard</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-500 block text-[10px]">SAFETY ADVANTAGE</span>
            <span className="text-emerald-400 font-semibold">Zero Halogen Toxicity</span>
          </div>
        </div>
      </div>
    </div>
  );
};
