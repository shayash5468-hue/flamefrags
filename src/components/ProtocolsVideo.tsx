import React, { useState } from 'react';
import { ISS_SOP_STEPS } from '../data/psiData';
import { sound } from '../utils/audio';
import { 
  FileText, 
  Play, 
  Pause, 
  ShieldCheck, 
  AlertTriangle, 
  Video, 
  RotateCcw, 
  Clock, 
  CheckCircle,
  Radio,
  ExternalLink
} from 'lucide-react';

interface FlightVideoClip {
  id: string;
  title: string;
  mission: string;
  duration: string;
  description: string;
  telemetry: {
    o2: string;
    flow: string;
    fuel: string;
  };
  videoPlaceholderBg: string;
  keyEvents: { time: string; note: string }[];
}

const FLIGHT_VIDEOS: FlightVideoClip[] = [
  {
    id: 'saffire-i',
    title: 'Saffire-I: Large Fabric Sheet Burn in Microgravity',
    mission: 'Cygnus OA-6 (NASA Glenn Research Center)',
    duration: '02:45',
    description: 'First large-scale spacecraft fire test inside uncrewed cargo ship flow tunnel. Cotton/fiberglass cloth ignited under 0.2 m/s forced airflow.',
    telemetry: {
      o2: '21.0%',
      flow: '0.20 m/s',
      fuel: 'SIBAL Cloth (0.4m x 1.0m)'
    },
    videoPlaceholderBg: 'from-orange-950 via-slate-900 to-black',
    keyEvents: [
      { time: '00:15', note: 'Hot wire igniter pulses; localized blue ignition flame appears.' },
      { time: '00:45', note: 'Flame stabilizes into slow planar crawl across full width.' },
      { time: '01:30', note: 'Pyrolysis front releases visible hydrocarbon aerosols.' },
      { time: '02:15', note: 'Airflow halted; flame rapidly quenches due to self-smothering.' }
    ]
  },
  {
    id: 'flex-droplet',
    title: 'FLEX: Spherical Droplet Combustion & Cool Flame Discovery',
    mission: 'ISS CIR / MDCA (Expedition 31)',
    duration: '01:50',
    description: 'High-speed camera captures heptane droplet ignition in zero-gravity. After visible extinction, the reaction continues at 250°C as an invisible cool flame.',
    telemetry: {
      o2: '18.5%',
      flow: '0.00 m/s (Quiescent)',
      fuel: 'Heptane 3.5mm Droplet'
    },
    videoPlaceholderBg: 'from-blue-950 via-cyan-950 to-black',
    keyEvents: [
      { time: '00:10', note: 'Opposed spark igniters light isolated droplet in center.' },
      { time: '00:28', note: 'Spherical symmetry establishes with blue chemiluminescence ring.' },
      { time: '00:52', note: 'Hot flame visibly disappears; radiative extinction declared.' },
      { time: '01:25', note: 'Droplet continues shrinking at steady rate due to invisible cool flame!' }
    ]
  },
  {
    id: 'bass-acrylic',
    title: 'BASS: PMMA Rod Burn Against Opposed Airflow',
    mission: 'ISS Microgravity Science Glovebox',
    duration: '02:10',
    description: 'Solid acrylic plastic cylinder exposed to 0.05 m/s airflow inside glovebox. Flames crawl steadily forward into the fresh air draft.',
    telemetry: {
      o2: '21.0%',
      flow: '0.05 m/s',
      fuel: 'PMMA Cylinder (12mm dia)'
    },
    videoPlaceholderBg: 'from-amber-950 via-slate-900 to-black',
    keyEvents: [
      { time: '00:12', note: 'Igniter bar energizes at front tip of acrylic rod.' },
      { time: '00:40', note: 'Molten acrylic bubbles under radiative feedback.' },
      { time: '01:15', note: 'Flame envelope wraps around rod with soot trailing downstream.' },
      { time: '01:55', note: 'Extinguishment nitrogen puff administered by astronaut operator.' }
    ]
  }
];

export const ProtocolsVideo: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [selectedVideo, setSelectedVideo] = useState<FlightVideoClip>(FLIGHT_VIDEOS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [videoProgress, setVideoProgress] = useState<number>(30); // %

  const togglePlay = () => {
    sound.playClick();
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div className="glass p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-950/80 border border-sky-600/50 text-sky-300 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>OFFICIAL ISS EMERGENCY FLIGHT PROTOCOL & VIDEO INTELLIGENCE</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mt-1">
            Safety Protocols & NASA Flight Experiment Footage
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
            Step-by-step astronaut emergency action directives alongside NASA Spacecraft Fire Experiment (Saffire, FLEX, BASS) analysis.
          </p>
        </div>
      </div>

      {/* Grid: 6-step SOP Timeline on left (7 cols), Video player on right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SOP Emergency Procedures Timeline */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" />
                <span>ISS Spacecraft Fire Emergency Sequence (SOP)</span>
              </h3>
              <span className="font-mono text-xs text-sky-300 bg-sky-950 px-2 py-0.5 rounded border border-sky-700/60">
                ISS FDIR STANDARD
              </span>
            </div>

            {/* Steps List */}
            <div className="space-y-3">
              {ISS_SOP_STEPS.map((s) => {
                const isActive = activeStep === s.step;
                return (
                  <div
                    key={s.step}
                    onClick={() => { sound.playClick(); setActiveStep(s.step); }}
                    className={`p-4 rounded-xl border transition cursor-pointer ${
                      isActive
                        ? 'bg-sky-950/40 border-sky-500 shadow-glow'
                        : 'bg-[#0b1222]/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-display font-bold text-xs ${
                          isActive ? 'bg-sky-500 text-white shadow' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {s.step}
                        </span>
                        <h4 className="font-display font-bold text-sm text-white">{s.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                          {s.duration}
                        </span>
                        <span className="font-mono text-[10px] text-sky-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700 hidden sm:inline">
                          {s.badge}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 mt-2.5 leading-relaxed pl-9">
                      {s.action}
                    </p>

                    <div className="mt-2 pl-9 flex items-center justify-between text-[11px] font-mono text-slate-500">
                      <span>Procedure Ref: {s.protocolRef}</span>
                      {isActive && (
                        <span className="text-sky-400 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Active Directive</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* NASA Flight Video Player & Timeline */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass p-5 rounded-2xl border-sky-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-sky-400" />
                <h3 className="font-display font-bold text-sm text-white">NASA Flight Video Intelligence</h3>
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                {selectedVideo.duration} DURATION
              </span>
            </div>

            {/* Video Selection Tabs */}
            <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
              {FLIGHT_VIDEOS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => { sound.playClick(); setSelectedVideo(v); }}
                  className={`p-1.5 rounded-lg border truncate transition ${
                    selectedVideo.id === v.id
                      ? 'bg-sky-600/30 border-sky-400 text-sky-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {v.id.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Video Player Display Screen */}
            <div className={`relative w-full h-56 rounded-xl overflow-hidden border border-slate-700 bg-gradient-to-br ${selectedVideo.videoPlaceholderBg} p-4 flex flex-col justify-between shadow-inner`}>
              {/* Telemetry overlay header */}
              <div className="flex items-center justify-between font-mono text-[10px] text-sky-300 bg-black/60 px-2.5 py-1 rounded-md backdrop-blur border border-slate-700">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                  <span>NASA GLENN REC</span>
                </span>
                <span>O₂: {selectedVideo.telemetry.o2} · FLOW: {selectedVideo.telemetry.flow}</span>
              </div>

              {/* Center Play Button & Animation */}
              <div className="flex flex-col items-center justify-center my-auto">
                <button
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-sky-500/80 hover:bg-sky-400 text-white flex items-center justify-center shadow-glow transition transform hover:scale-110 active:scale-95"
                >
                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                </button>
                <div className="mt-2 text-[11px] font-mono text-slate-300 bg-black/70 px-2 py-0.5 rounded">
                  {isPlaying ? 'PLAYING EXPERIMENT TELEMETRY' : 'CLICK TO PLAY SIMULATION'}
                </div>
              </div>

              {/* Bottom Scrubber Bar */}
              <div className="space-y-1">
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden cursor-pointer">
                  <div
                    className="h-full bg-sky-400 rounded-full transition-all duration-300"
                    style={{ width: `${videoProgress}%` }}
                  />
                </div>
                <div className="flex justify-between font-mono text-[9px] text-slate-400">
                  <span>00:45</span>
                  <span>{selectedVideo.duration}</span>
                </div>
              </div>
            </div>

            {/* Video Metadata dossier */}
            <div className="space-y-2">
              <h4 className="font-display font-bold text-sm text-white">{selectedVideo.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedVideo.description}
              </p>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block text-[9px]">MISSION VEHICLE:</span>
                  <span className="text-slate-200">{selectedVideo.mission}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">TEST FUEL:</span>
                  <span className="text-slate-200">{selectedVideo.telemetry.fuel}</span>
                </div>
              </div>
            </div>

            {/* Timeline Annotations */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Flight Experiment Timeline Events:</div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {selectedVideo.keyEvents.map((evt, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs">
                    <span className="font-mono text-sky-400 font-bold text-[10px] shrink-0 mt-0.5">
                      {evt.time}
                    </span>
                    <span className="text-slate-300 text-[11px] leading-snug">{evt.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
