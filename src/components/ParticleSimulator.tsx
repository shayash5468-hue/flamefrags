import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../utils/audio';
import { renderRealisticFlame } from '../utils/realisticFlameRenderer';
import { 
  Flame, 
  Wind, 
  Activity, 
  Gauge, 
  AlertTriangle, 
  ShieldAlert, 
  Sliders, 
  RefreshCw, 
  Info, 
  Sparkles,
  Zap,
  Droplets
} from 'lucide-react';

export const ParticleSimulator: React.FC = () => {
  // Simulator Parameters
  const [gravityG, setGravityG] = useState<number>(0.0); // 0 = 0g, 0.16 = Moon, 0.38 = Mars, 1.0 = 1g Earth
  const [oxygenPercent, setOxygenPercent] = useState<number>(21.0); // 14 to 35%
  const [airflowVelocity, setAirflowVelocity] = useState<number>(0.05); // m/s (0 to 0.40)
  const [fuelType, setFuelType] = useState<string>('heptane'); // heptane, pmma, cable, methane, candle
  const [quenchAgent, setQuenchAgent] = useState<'none' | 'water_mist' | 'co2'>('none');
  const [splitView, setSplitView] = useState<boolean>(true); // Compare 0G vs 1G side-by-side

  // Canvases
  const canvas0gRef = useRef<HTMLCanvasElement | null>(null);
  const canvas1gRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // Derived Telemetry Calculations
  const calcFlameTemp = (g: number, o2: number, flow: number, fuel: string) => {
    let base = 1100;
    if (fuel === 'methane') base = 1350;
    if (fuel === 'heptane') base = 1280;
    if (fuel === 'pmma') base = 1050;
    if (fuel === 'cable') base = 950;

    // In 0g, radiative loss is higher due to slow diffusion => lower peak temp
    const gFactor = g === 0 ? -180 : g * 80;
    // Oxygen feeds combustion intensity
    const o2Factor = (o2 - 21) * 28;
    // Flow brings oxygen (good) or cools (too fast)
    const flowFactor = flow * 220;

    const quenchFactor = quenchAgent === 'water_mist' ? -550 : quenchAgent === 'co2' ? -380 : 0;
    return Math.max(180, Math.round(base + gFactor + o2Factor + flowFactor + quenchFactor));
  };

  const calcCoolFlameTendency = (g: number, flow: number, o2: number) => {
    // High in 0g with low airflow
    if (g > 0.3) return 5;
    const base = 75;
    const flowPenalty = flow * 120;
    const o2Penalty = (o2 - 21) * 1.5;
    return Math.max(0, Math.min(99, Math.round(base - flowPenalty - o2Penalty)));
  };

  const calcThreatLevel = () => {
    if (oxygenPercent > 28) return { level: 'CRITICAL THREAT', color: 'text-red-400', badge: 'bg-red-950 border-red-500' };
    if (airflowVelocity > 0.25 && oxygenPercent >= 21) return { level: 'HIGH CONVECTIVE SPREAD', color: 'text-amber-400', badge: 'bg-amber-950 border-amber-500' };
    if (gravityG === 0 && airflowVelocity < 0.02) return { level: 'DIFFUSION QUENCHING ZONE', color: 'text-cyan-400', badge: 'bg-cyan-950 border-cyan-500' };
    return { level: 'ELEVATED RISK', color: 'text-amber-300', badge: 'bg-slate-900 border-slate-700' };
  };

  const threat = calcThreatLevel();
  const flameTemp = calcFlameTemp(gravityG, oxygenPercent, airflowVelocity, fuelType);
  const coolFlameTendency = calcCoolFlameTendency(gravityG, airflowVelocity, oxygenPercent);
  const sootIndex = Math.max(0.1, +((1.2 - gravityG * 0.4) * (oxygenPercent / 21) * (fuelType === 'pmma' ? 2.2 : 1.0)).toFixed(1));

  // Realistic combustion physics loop for Canvas
  useEffect(() => {
    const computeSimState = (g: number) => {
      const is0G = g < 0.05;
      const loi = fuelType === 'pmma' ? 17.2 : fuelType === 'cable' ? 16.4 : fuelType === 'methane' ? 15.2 : 14.6;
      const effLoi = loi + (is0G ? 0.8 : -0.4);
      const isO2Quenched = oxygenPercent <= effLoi;
      const isStagnantQuenched = is0G && airflowVelocity <= 0.005 && oxygenPercent < 17.0;
      const isBlowoff = airflowVelocity >= 0.38;
      const isCool = is0G && airflowVelocity < 0.02 && (fuelType === 'heptane' || fuelType === 'methane') && !isO2Quenched && oxygenPercent <= 21.0;
      const isQuenched = isO2Quenched || isStagnantQuenched || isBlowoff;

      const intensity = isQuenched
        ? 0
        : isCool
        ? 0.42
        : Math.max(0.2, Math.min(1, (oxygenPercent - effLoi) / 4.2));
      const shape = isQuenched ? 'quenched' : isCool ? 'cool-envelope' : is0G ? 'spherical' : 'teardrop';
      const extinctionReason = isO2Quenched
        ? `O₂ BELOW LOI (${effLoi.toFixed(1)}%)`
        : isStagnantQuenched
        ? '0G CO₂ SUFFOCATION'
        : isBlowoff
        ? 'AIRFLOW BLOW-OFF'
        : '';
      const sootFactor = fuelType === 'methane' ? 0.45 : fuelType === 'candle' ? 1.3 : fuelType === 'pmma' ? 1.15 : 1.0;
      return { shape, intensity, extinctionReason, sootFactor };
    };

    const render = () => {
      const now = performance.now();
      animFrameRef.current = requestAnimationFrame(render);

      if (canvas0gRef.current) {
        const s0 = computeSimState(gravityG);
        renderRealisticFlame(canvas0gRef.current, {
          gravityG,
          flowVelocity: airflowVelocity,
          oxygenPct: oxygenPercent,
          shape: s0.shape,
          intensity: s0.intensity,
          fuelName: fuelType,
          sootFactor: s0.sootFactor,
          extinctionReason: s0.extinctionReason,
          quenchAgent,
          timeMs: now,
        });
      }
      if (canvas1gRef.current && splitView) {
        const s1 = computeSimState(1.0);
        renderRealisticFlame(canvas1gRef.current, {
          gravityG: 1.0,
          flowVelocity: airflowVelocity,
          oxygenPct: oxygenPercent,
          shape: s1.shape,
          intensity: s1.intensity,
          fuelName: fuelType,
          sootFactor: s1.sootFactor,
          extinctionReason: s1.extinctionReason,
          quenchAgent,
          timeMs: now + 350,
        });
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [gravityG, airflowVelocity, oxygenPercent, fuelType, quenchAgent, splitView]);

  // Quick Preset Handlers
  const applyPreset = (presetName: string) => {
    sound.playClick();
    if (presetName === 'iss') {
      setGravityG(0.0);
      setOxygenPercent(21.0);
      setAirflowVelocity(0.05);
      setFuelType('heptane');
      setQuenchAgent('none');
    } else if (presetName === 'artemis') {
      setGravityG(0.16);
      setOxygenPercent(34.0);
      setAirflowVelocity(0.08);
      setFuelType('pmma');
      setQuenchAgent('none');
    } else if (presetName === 'mars') {
      setGravityG(0.38);
      setOxygenPercent(21.0);
      setAirflowVelocity(0.12);
      setFuelType('methane');
      setQuenchAgent('none');
    } else if (presetName === 'cool_flame') {
      setGravityG(0.0);
      setOxygenPercent(18.0);
      setAirflowVelocity(0.0);
      setFuelType('heptane');
      setQuenchAgent('none');
    } else if (presetName === 'pfe_mist') {
      setQuenchAgent('water_mist');
      sound.startSpray();
      setTimeout(() => sound.stopSpray(), 800);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="glass p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-600/50 text-amber-300 text-xs font-mono">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>NASA PSI COMBUSTION PHYSICS ENGINE</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mt-1">
            0G vs 1G Flame Particle Simulator & AI Controls
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
            Simulate the stark difference between buoyant Earth flames and spherical microgravity diffusion flames with real-time AI hazard assessment.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400">PRESETS:</span>
          <button
            onClick={() => applyPreset('iss')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            ISS 0G Nominal
          </button>
          <button
            onClick={() => applyPreset('artemis')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60"
          >
            Artemis Moon (34% O₂)
          </button>
          <button
            onClick={() => applyPreset('cool_flame')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-800/60"
          >
            FLEX Cool Flame
          </button>
          <button
            onClick={() => applyPreset('pfe_mist')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-950 hover:bg-red-900 text-red-300 border border-red-700/80"
          >
            Discharge PFE Mist
          </button>
        </div>
      </div>

      {/* Main Grid: Canvases on left, Controls & AI telemetry on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Canvas Display Viewport (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass p-4 rounded-2xl flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>REAL-TIME KINETIC PARTICLE FLAME RENDERER</span>
              </span>
              <button
                onClick={() => setSplitView(!splitView)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                {splitView ? 'Single View (Active Gravity)' : 'Split View (0G vs 1G)'}
              </button>
            </div>

            {/* Split View Canvases */}
            <div className={`w-full grid gap-3 ${splitView ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              {/* Primary Active Gravity Canvas */}
              <div className="relative rounded-xl overflow-hidden border border-cyan-900/50 bg-[#050813] flex flex-col items-center p-2">
                <div className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded bg-black/80 border border-slate-700 font-mono text-[10px] text-cyan-300">
                  {gravityG === 0 ? 'MICROGRAVITY (0G)' : gravityG === 0.16 ? 'MOON (0.16G)' : gravityG === 0.38 ? 'MARS (0.38G)' : 'EARTH (1.0G)'}
                </div>
                <canvas
                  ref={canvas0gRef}
                  width={320}
                  height={270}
                  className="w-full h-[270px] block rounded-lg"
                />
                <div className="w-full mt-2 text-[10px] font-mono text-slate-400 flex justify-between px-1">
                  <span>Flame Shape: {gravityG === 0 ? 'Spherical Diffusion Envelope' : 'Buoyancy Elongated'}</span>
                  <span>Color: {gravityG === 0 ? 'Blue (CH*)' : 'Yellow / Incandescent'}</span>
                </div>
              </div>

              {/* Terrestrial 1G Comparison Canvas (if split) */}
              {splitView && (
                <div className="relative rounded-xl overflow-hidden border border-amber-900/50 bg-[#050813] flex flex-col items-center p-2">
                  <div className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded bg-black/80 border border-slate-700 font-mono text-[10px] text-amber-300">
                    TERRESTRIAL EARTH (1.0G REFERENCE)
                  </div>
                  <canvas
                    ref={canvas1gRef}
                    width={320}
                    height={270}
                    className="w-full h-[270px] block rounded-lg"
                  />
                  <div className="w-full mt-2 text-[10px] font-mono text-slate-400 flex justify-between px-1">
                    <span>Flame Shape: Teardrop Buoyant Plume</span>
                    <span>Mechanism: Rapid Natural Convection</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Physics Legend */}
            <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-[11px] font-mono">
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
                <span className="text-slate-500 block text-[9px]">OXYGEN ADVECTION</span>
                <span>{airflowVelocity > 0 ? `${(airflowVelocity * 100).toFixed(0)} cm/s flow` : 'Zero flow (Starving)'}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
                <span className="text-slate-500 block text-[9px]">SOOT TRAPPING</span>
                <span>{gravityG === 0 ? 'Concentric Shell' : 'Buoyant Chimney'}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
                <span className="text-slate-500 block text-[9px]">COOL FLAME</span>
                <span className={coolFlameTendency > 50 ? 'text-purple-400 font-bold' : 'text-slate-400'}>
                  {coolFlameTendency}% Probability
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
                <span className="text-slate-500 block text-[9px]">SUPPRESSION</span>
                <span className={quenchAgent !== 'none' ? 'text-emerald-400' : 'text-slate-400'}>
                  {quenchAgent === 'water_mist' ? 'Fine Water Mist' : quenchAgent === 'co2' ? 'CO2 Blanket' : 'None Active'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls & AI Threat Telemetry (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* AI Hazard Status Panel */}
          <div className="glass p-5 rounded-2xl border-cyan-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="font-display font-bold text-sm text-white">AI Real-Time Threat Analysis</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${threat.badge} ${threat.color}`}>
                {threat.level}
              </span>
            </div>

            {/* Telemetry Numbers */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="glass p-3 rounded-xl">
                <div className="text-[10px] font-mono text-slate-400">CORE FLAME TEMP</div>
                <div className={`font-mono text-xl font-bold mt-0.5 ${flameTemp > 1200 ? 'text-red-400' : flameTemp > 800 ? 'text-amber-400' : 'text-cyan-300'}`}>
                  {flameTemp} °C
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">
                  {flameTemp < 400 ? 'Cool-flame kinetic regime' : 'Hot oxidative combustion'}
                </div>
              </div>

              <div className="glass p-3 rounded-xl">
                <div className="text-[10px] font-mono text-slate-400">SOOT PARTICULATE INDEX</div>
                <div className="font-mono text-xl font-bold text-amber-300 mt-0.5">
                  {sootIndex} <span className="text-xs font-normal text-slate-400">g/m³</span>
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">
                  {gravityG === 0 ? 'Trapped in boundary shell' : 'Evacuated upward by buoyancy'}
                </div>
              </div>
            </div>

            {/* AI Reasoning Advice Box */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-1.5">
              <div className="font-semibold text-cyan-300 flex items-center gap-1.5 text-[11px]">
                <Info className="w-3.5 h-3.5" />
                <span>Microgravity Tactical Assessment:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                {gravityG === 0 && airflowVelocity === 0 && (
                  'At 0.0 m/s airflow, the flame will eventually self-extinguish as combustion products blanket the droplet in carbon dioxide. Beware of low-temperature cool flame lingering.'
                )}
                {gravityG === 0 && airflowVelocity > 0 && airflowVelocity < 0.15 && (
                  'CRITICAL REGIME (Low-Flow Paradox): The 0.05 - 0.15 m/s breeze feeds fresh oxygen to the flame envelope without providing sufficient aerodynamic cooling to blow it out.'
                )}
                {oxygenPercent > 25 && (
                  'HIGH OXYGEN WARNING: Materials rated fire-resistant at Earth 21% O2 undergo violent flame spread under elevated oxygen concentrations.'
                )}
                {quenchAgent === 'water_mist' && (
                  'Fine water mist actively evaporating: droplet heat extraction rate exceeds heat release rate. Thermal quenching occurring.'
                )}
                {gravityG > 0 && (
                  'Buoyant convection is active. Plume draws surrounding cabin air upwards, creating a self-sustaining convective chimney.'
                )}
              </p>
            </div>
          </div>

          {/* Interactive Physics Controls Form */}
          <div className="glass p-5 rounded-2xl space-y-4">
            <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Environmental & Physical Parameters</span>
            </h3>

            {/* Gravity Selector */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">GRAVITY LEVEL:</span>
                <span className="text-cyan-300 font-bold">
                  {gravityG === 0 ? '0.00 G (Space Station)' : gravityG === 0.16 ? '0.16 G (Moon)' : gravityG === 0.38 ? '0.38 G (Mars)' : '1.00 G (Earth)'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '0G Space', val: 0.0 },
                  { label: 'Moon', val: 0.16 },
                  { label: 'Mars', val: 0.38 },
                  { label: '1G Earth', val: 1.0 },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { sound.playClick(); setGravityG(item.val); }}
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-mono font-medium transition ${
                      gravityG === item.val
                        ? 'bg-cyan-600 text-white shadow font-bold'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Oxygen Concentration Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">CABIN OXYGEN CONCENTRATION:</span>
                <span className={`font-bold ${oxygenPercent > 25 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {oxygenPercent.toFixed(1)}% O₂
                </span>
              </div>
              <input
                type="range"
                min="14"
                max="35"
                step="0.5"
                value={oxygenPercent}
                onChange={(e) => setOxygenPercent(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>14% (Hypoxic limit)</span>
                <span>21% (Normal Air)</span>
                <span>35% (Exploration EV)</span>
              </div>
            </div>

            {/* Ventilation Airflow Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">FORCED VENTILATION AIRFLOW:</span>
                <span className="text-amber-300 font-bold">
                  {(airflowVelocity * 100).toFixed(0)} cm/s ({airflowVelocity.toFixed(2)} m/s)
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.40"
                step="0.01"
                value={airflowVelocity}
                onChange={(e) => setAirflowVelocity(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0 cm/s (Stagnant)</span>
                <span>5 cm/s (ISS IMV)</span>
                <span>40 cm/s (High Duct)</span>
              </div>
            </div>

            {/* Fuel Type & Quenching Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">FUEL SPECIMEN:</label>
                <select
                  value={fuelType}
                  onChange={(e) => { sound.playClick(); setFuelType(e.target.value); }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200"
                >
                  <option value="heptane">Heptane Droplet (FLEX)</option>
                  <option value="pmma">PMMA Acrylic Rod (BASS)</option>
                  <option value="cable">Polyethylene Cable</option>
                  <option value="methane">Methane Gas Jet (ACME)</option>
                  <option value="candle">Paraffin Candle</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">EXTINGUISHMENT AGENT:</label>
                <select
                  value={quenchAgent}
                  onChange={(e) => {
                    sound.playClick();
                    const val = e.target.value as 'none' | 'water_mist' | 'co2';
                    setQuenchAgent(val);
                    if (val !== 'none') sound.startSpray();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200"
                >
                  <option value="none">None (Free Burning)</option>
                  <option value="water_mist">PFE Fine Water Mist</option>
                  <option value="co2">Carbon Dioxide Blanket</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
