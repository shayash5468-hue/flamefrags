import React, { useState, useEffect, useRef } from 'react';
import { FLAME_FINGERPRINTS, NASA_PSI_FILES } from '../data/nasaPsiDatasets';
import { DetectiveTaskType, PsiFileRecord } from '../types';
import { sound } from '../utils/audio';
import { stripLatex } from '../utils/plainText';
import { CombustionDnaPanel } from './features/CombustionDnaPanel';
import { HabitatRelevancePanel } from './features/HabitatRelevancePanel';
import { 
  Flame, 
  Sliders, 
  Dna, 
  Sparkles, 
  Activity, 
  GitCompare, 
  Send,
  RefreshCw,
  Info,
  Maximize2,
  Atom,
  CheckCircle2,
  Bot,
  Zap,
  ArrowRight,
  Layers,
  Globe
} from 'lucide-react';
import { simulateFlamePhysics, analyzeSideBySide } from '../services/geminiClientService';

export type FlameVisualSubTab = 'sidebyside' | 'whatif' | 'flamedna' | 'habitat';

interface FlameVisualViewProps {
  datasets?: PsiFileRecord[];
  activeSubTab?: FlameVisualSubTab;
  onChangeSubTab?: (tab: FlameVisualSubTab) => void;
  selectedInvestigationId?: string;
  onSelectInvestigationId?: (id: string) => void;
  onRunDetectiveOnDataset?: (datasetId: string, task?: DetectiveTaskType) => void;
  onAskAiAboutInvestigation?: (investigationId: string) => void;
  onAskAiWithPrompt?: (prompt: string, investigationIds?: string[]) => void;
  onViewGapsForInvestigation?: (investigationId: string) => void;
}

export const FlameVisualView: React.FC<FlameVisualViewProps> = ({
  datasets,
  activeSubTab: controlledSubTab,
  onChangeSubTab,
  selectedInvestigationId: controlledInvestigationId,
  onSelectInvestigationId,
  onRunDetectiveOnDataset,
  onAskAiAboutInvestigation,
  onAskAiWithPrompt,
  onViewGapsForInvestigation,
}) => {
  const [internalSubTab, setInternalSubTab] = useState<FlameVisualSubTab>('sidebyside');
  const activeSubTab = controlledSubTab ?? internalSubTab;
  const setActiveSubTab = (tab: FlameVisualSubTab) => {
    setInternalSubTab(tab);
    onChangeSubTab?.(tab);
  };

  const [internalInvestigationId, setInternalInvestigationId] = useState<string>('PSI-20');
  const activeInvestigationId = controlledInvestigationId ?? internalInvestigationId;
  const handleSelectInvestigation = (id: string) => {
    setInternalInvestigationId(id);
    onSelectInvestigationId?.(id);
  };

  const activeDatasets = datasets && datasets.length > 0 ? datasets : NASA_PSI_FILES;

  // ==========================================
  // 1. WHAT-IF LAB PARAMETERS
  // ==========================================
  const [whatIfGravity, setWhatIfGravity] = useState<number>(0.0);
  const [whatIfOxygen, setWhatIfOxygen] = useState<number>(21.0);
  const [whatIfFlow, setWhatIfFlow] = useState<number>(0.05);
  const [whatIfPressure, setWhatIfPressure] = useState<number>(101.3);
  const [whatIfFuel, setWhatIfFuel] = useState<string>('heptane');

  const [aiFlameData, setAiFlameData] = useState<{
    coreTemp: number;
    sootRadiusMm: number;
    flameShape: string;
    blueIntensity: number;
    yellowIntensity: number;
    extinctionRisk: string;
    scientificSummary: string;
  }>({
    coreTemp: 1120,
    sootRadiusMm: 14.5,
    flameShape: 'spherical',
    blueIntensity: 0.85,
    yellowIntensity: 0.15,
    extinctionRisk: 'stable',
    scientificSummary: 'Zero-gravity eliminates buoyant convection; molecular diffusion dominates spherical flame envelope.'
  });
  const [isSimulatingAi, setIsSimulatingAi] = useState(false);

  // ==========================================
  // 2. UNIFIED SIDE-BY-SIDE & FLAMETWIN SLIDERS & STATES
  // ==========================================
  // Flame A Sliders (Defaults aligned with ACME CFI-G 0G Methane preset)
  const [gravityA, setGravityA] = useState<number>(0.0);
  const [oxygenA, setOxygenA] = useState<number>(21.0);
  const [flowA, setFlowA] = useState<number>(0.05);
  const [pressureA, setPressureA] = useState<number>(101.3);
  const [fuelA, setFuelA] = useState<string>('Methane Gas Jet');
  const [presetA, setPresetA] = useState<string>('fp-acme-cfig');

  // Flame B Sliders (Defaults aligned with Terrestrial 1G Candle preset)
  const [gravityB, setGravityB] = useState<number>(1.0);
  const [oxygenB, setOxygenB] = useState<number>(21.0);
  const [flowB, setFlowB] = useState<number>(0.00);
  const [pressureB, setPressureB] = useState<number>(101.3);
  const [fuelB, setFuelB] = useState<string>('Paraffin Wax');
  const [presetB, setPresetB] = useState<string>('fp-terrestrial-candle');

  // Merge into FlameTwin State
  const [isMerged, setIsMerged] = useState<boolean>(true);
  const [mergeStrategy, setMergeStrategy] = useState<'Equimolar Kinetics Fusion' | 'Radical Boundary Coupling' | 'Worst-Case Extinction Limit'>('Equimolar Kinetics Fusion');

  // Side-by-Side & FlameTwin AI Chat State
  const [sideAiChatMessages, setSideAiChatMessages] = useState<{ sender: 'user' | 'assistant'; text: string }[]>([
    {
      sender: 'assistant',
      text: 'Side-by-Side & FlameTwin Physics Agent online. Both Flame A and Flame B sliders are synchronized. Ask me how their kinetics, soot shells, or extinction limits compare, or test what happens when you merge them into FlameTwin.'
    }
  ]);
  const [sideAiInput, setSideAiInput] = useState('');
  const [isSideAiTyping, setIsSideAiTyping] = useState(false);

  // Canvases
  const whatIfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sideCanvasARef = useRef<HTMLCanvasElement | null>(null);
  const sideCanvasBRef = useRef<HTMLCanvasElement | null>(null);
  const flameTwinCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  interface FuelKinetics {
    baseTempC: number;
    loiBase: number;
    blowoffBase: number;
    sootFactor: number;
    coolFlameCapable: boolean;
  }

  const FUEL_KINETICS: Record<string, FuelKinetics> = {
    'n-Heptane Droplet': { baseTempC: 1260, loiBase: 14.6, blowoffBase: 0.34, sootFactor: 1.05, coolFlameCapable: true },
    'heptane': { baseTempC: 1260, loiBase: 14.6, blowoffBase: 0.34, sootFactor: 1.05, coolFlameCapable: true },
    'Methane Gas Jet': { baseTempC: 1320, loiBase: 15.2, blowoffBase: 0.38, sootFactor: 0.45, coolFlameCapable: true },
    'methane': { baseTempC: 1320, loiBase: 15.2, blowoffBase: 0.38, sootFactor: 0.45, coolFlameCapable: true },
    'PMMA Solid Acrylic': { baseTempC: 1130, loiBase: 17.2, blowoffBase: 0.29, sootFactor: 1.15, coolFlameCapable: false },
    'pmma': { baseTempC: 1130, loiBase: 17.2, blowoffBase: 0.29, sootFactor: 1.15, coolFlameCapable: false },
    'SIBAL Fabric Cloth': { baseTempC: 1040, loiBase: 17.8, blowoffBase: 0.28, sootFactor: 0.90, coolFlameCapable: false },
    'Polyethylene Wire': { baseTempC: 1180, loiBase: 16.4, blowoffBase: 0.31, sootFactor: 1.25, coolFlameCapable: false },
    'polyethylene': { baseTempC: 1180, loiBase: 16.4, blowoffBase: 0.31, sootFactor: 1.25, coolFlameCapable: false },
    'Paraffin Wax': { baseTempC: 1360, loiBase: 15.0, blowoffBase: 0.35, sootFactor: 1.30, coolFlameCapable: false },
  };

  const normalizeFuelName = (raw: string): string => {
    const r = raw.toLowerCase();
    if (r.includes('methane') || r.includes('ch4')) return 'Methane Gas Jet';
    if (r.includes('heptane')) return 'n-Heptane Droplet';
    if (r.includes('pmma') || r.includes('acrylic')) return 'PMMA Solid Acrylic';
    if (r.includes('sibal') || r.includes('cloth') || r.includes('fabric')) return 'SIBAL Fabric Cloth';
    if (r.includes('polyethylene') || r.includes('wire')) return 'Polyethylene Wire';
    if (r.includes('paraffin') || r.includes('wax')) return 'Paraffin Wax';
    return 'n-Heptane Droplet';
  };

  // Handle Preset Changes for Flame A
  const handlePresetA = (presetId: string) => {
    sound.playClick();
    setPresetA(presetId);
    const fp = FLAME_FINGERPRINTS.find(f => f.id === presetId);
    if (fp) {
      setGravityA(fp.gravityG);
      setOxygenA(fp.oxygenPct);
      setFlowA(fp.flowVelocity);
      setFuelA(normalizeFuelName(fp.fuel));
    }
  };

  // Handle Preset Changes for Flame B
  const handlePresetB = (presetId: string) => {
    sound.playClick();
    setPresetB(presetId);
    const fp = FLAME_FINGERPRINTS.find(f => f.id === presetId);
    if (fp) {
      setGravityB(fp.gravityG);
      setOxygenB(fp.oxygenPct);
      setFlowB(fp.flowVelocity);
      setFuelB(normalizeFuelName(fp.fuel));
    }
  };

  // Per-canvas extinction & smoke particle state for smooth quench/re-ignite animation
  const canvasAnimStateRef = useRef<WeakMap<HTMLCanvasElement, {
    extinguishLevel: number;
    lastTime: number;
    smokePuffs: { x: number; y: number; vx: number; vy: number; r: number; alpha: number; life: number }[];
  }>>(new WeakMap());

  // Real-time Physics Calculations from Sliders + Fuel Chemistry
  const computeFlameProps = (
    g: number,
    o2: number,
    flow: number,
    p: number,
    fuelOrKinetics: string | FuelKinetics,
    overrides?: { loiShift?: number; blowoffShift?: number; daMultiplier?: number }
  ) => {
    const kinetics: FuelKinetics =
      typeof fuelOrKinetics === 'string'
        ? (FUEL_KINETICS[fuelOrKinetics] || FUEL_KINETICS['n-Heptane Droplet'])
        : fuelOrKinetics;

    const is0G = g < 0.05;
    const loi = Math.max(11.0, kinetics.loiBase + (is0G ? 0.9 : -0.4) + Math.max(0, (101.3 - p) * 0.032) + (overrides?.loiShift ?? 0));
    const blowoffLimit = Math.max(0.12, kinetics.blowoffBase + (o2 - 21) * 0.014 + (p - 101.3) * 0.0012 + (is0G ? -0.02 : 0.03) + (overrides?.blowoffShift ?? 0));

    const o2Factor = Math.max(0, Math.min(1, (o2 - loi) / 3.2));
    const blowFactor = Math.max(0, Math.min(1, (blowoffLimit - flow) / 0.11));

    // Cool-flame persistence in quiescent 0G (FLEX / ACME CFI-G) vs CO2 suffocation for solid fuels
    const inCoolZone = kinetics.coolFlameCapable && is0G && flow < 0.02 && o2 > loi && o2 <= 21.0;
    const stagnantFactor = is0G && flow < 0.02 && !kinetics.coolFlameCapable && o2 < 20.0
      ? Math.max(0, Math.min(1, (flow / 0.02) * 0.65 + (o2 - 18.0) / 3.0))
      : 1;

    const rawIntensity = Math.max(0, Math.min(1, Math.min(o2Factor, blowFactor, stagnantFactor)));
    const isO2Quenched = o2 <= loi;
    const isStagnantQuenched = is0G && flow <= 0.005 && (inCoolZone ? o2 < 17.0 : o2 < 19.5);
    const isBlowoff = flow >= blowoffLimit;
    const isQuenched = isO2Quenched || isStagnantQuenched || isBlowoff || rawIntensity <= 0.02;

    let extinctionReason = '';
    if (isO2Quenched) extinctionReason = `O₂ BELOW LOI (${loi.toFixed(1)}%)`;
    else if (isStagnantQuenched) extinctionReason = '0G CO₂ SUFFOCATION';
    else if (isBlowoff) extinctionReason = 'AIRFLOW BLOW-OFF';
    else if (isQuenched) extinctionReason = 'THERMAL QUENCH';

    const intensity = isQuenched ? 0 : inCoolZone ? Math.max(0.28, Math.min(0.45, rawIntensity * 0.55)) : rawIntensity;

    const hotBaseTemp = kinetics.baseTempC + (o2 - 21) * 34 + (g * 125) + (flow * 160) + ((p - 101.3) * 1.4);
    const coreTemp = isQuenched
      ? Math.round(145 + Math.max(0, o2 - 12) * 8)
      : inCoolZone
      ? Math.round(240 + (o2 - loi) * 18)
      : Math.round(320 + (hotBaseTemp - 320) * (0.45 + 0.55 * intensity));

    const shape = isQuenched
      ? 'quenched'
      : inCoolZone
      ? 'cool-envelope'
      : is0G
      ? 'spherical'
      : 'teardrop';

    const sootRadius = isQuenched
      ? 0
      : inCoolZone
      ? +(Math.max(3.0, 6.2 * kinetics.sootFactor)).toFixed(1)
      : is0G
      ? +(Math.max(5.5, (15.0 - flow * 14) * kinetics.sootFactor)).toFixed(1)
      : +(Math.max(1.2, (3.4 - flow * 3.5) * kinetics.sootFactor)).toFixed(1);

    const daRaw = isQuenched
      ? 0
      : inCoolZone
      ? 1.15 * (o2 / 21)
      : (o2 / 21) * 8.4 * intensity / Math.max(0.02, flow + 0.06);
    const damkohler = isQuenched
      ? 0
      : +(Math.max(0.2, daRaw * (overrides?.daMultiplier ?? 1))).toFixed(2);

    const chemiluminescence = isQuenched
      ? 'None (Extinguished)'
      : shape === 'cool-envelope'
      ? 'CH₂O* (395nm) + RO₂•'
      : is0G
      ? (kinetics.sootFactor < 0.7 ? 'CH* (431nm) + C₂* (516nm)' : 'CH* (431nm) + Soot Ring')
      : 'Incandescent Soot + OH*';

    return { coreTemp, shape, sootRadius, damkohler, is0G, intensity, extinctionReason, chemiluminescence, loi };
  };

  const propsA = computeFlameProps(gravityA, oxygenA, flowA, pressureA, fuelA);
  const propsB = computeFlameProps(gravityB, oxygenB, flowB, pressureB, fuelB);

  // Computed FlameTwin Hybrid Synthesis Properties (true multi-strategy fuel & boundary coupling)
  const kA = FUEL_KINETICS[fuelA] || FUEL_KINETICS['n-Heptane Droplet'];
  const kB = FUEL_KINETICS[fuelB] || FUEL_KINETICS['Methane Gas Jet'];

  const hybridG = +((gravityA + gravityB) / 2).toFixed(2);
  const hybridO2 = mergeStrategy === 'Worst-Case Extinction Limit'
    ? Math.min(oxygenA, oxygenB)
    : +((oxygenA + oxygenB) / 2).toFixed(1);
  const hybridFlow = mergeStrategy === 'Worst-Case Extinction Limit'
    ? Math.max(flowA, flowB)
    : +((flowA + flowB) / 2).toFixed(2);
  const hybridPressure = mergeStrategy === 'Worst-Case Extinction Limit'
    ? Math.min(pressureA, pressureB)
    : +((pressureA + pressureB) / 2).toFixed(1);

  const hybridKinetics: FuelKinetics =
    mergeStrategy === 'Worst-Case Extinction Limit'
      ? {
          baseTempC: Math.min(kA.baseTempC, kB.baseTempC),
          loiBase: Math.max(kA.loiBase, kB.loiBase),
          blowoffBase: Math.min(kA.blowoffBase, kB.blowoffBase),
          sootFactor: Math.max(kA.sootFactor, kB.sootFactor),
          coolFlameCapable: kA.coolFlameCapable && kB.coolFlameCapable,
        }
      : mergeStrategy === 'Radical Boundary Coupling'
      ? {
          baseTempC: Math.round(0.35 * Math.min(kA.baseTempC, kB.baseTempC) + 0.65 * Math.max(kA.baseTempC, kB.baseTempC)),
          loiBase: +((kA.loiBase + kB.loiBase) / 2).toFixed(2),
          blowoffBase: +((kA.blowoffBase + kB.blowoffBase) / 2).toFixed(2),
          sootFactor: +((kA.sootFactor + kB.sootFactor) / 2 * 0.92).toFixed(2),
          coolFlameCapable: kA.coolFlameCapable || kB.coolFlameCapable,
        }
      : {
          baseTempC: Math.round((kA.baseTempC + kB.baseTempC) / 2),
          loiBase: +((kA.loiBase + kB.loiBase) / 2).toFixed(2),
          blowoffBase: +((kA.blowoffBase + kB.blowoffBase) / 2).toFixed(2),
          sootFactor: +((kA.sootFactor + kB.sootFactor) / 2).toFixed(2),
          coolFlameCapable: kA.coolFlameCapable || kB.coolFlameCapable,
        };

  const strategyOverrides =
    mergeStrategy === 'Radical Boundary Coupling'
      ? { loiShift: -1.1, blowoffShift: 0.045, daMultiplier: 1.18 }
      : undefined;

  const rawTwinProps = computeFlameProps(hybridG, hybridO2, hybridFlow, hybridPressure, hybridKinetics, strategyOverrides);
  const bothFlamesQuenched = propsA.shape === 'quenched' && propsB.shape === 'quenched';
  const worstCaseQuenched = mergeStrategy === 'Worst-Case Extinction Limit' && (propsA.shape === 'quenched' || propsB.shape === 'quenched');
  const radicalQuenched = mergeStrategy === 'Radical Boundary Coupling' && bothFlamesQuenched;

  const propsTwin = (worstCaseQuenched || radicalQuenched)
    ? {
        ...rawTwinProps,
        shape: 'quenched',
        intensity: 0,
        damkohler: 0,
        sootRadius: 0,
        chemiluminescence: 'None (Extinguished)',
        coreTemp: Math.min(propsA.coreTemp, propsB.coreTemp),
        extinctionReason: propsA.extinctionReason || propsB.extinctionReason || 'EXTINCTION LIMIT',
      }
    : rawTwinProps;

  const hybridTemp = propsTwin.coreTemp;
  const hybridDamkohler = propsTwin.damkohler;
  const hybridSootStandoff = propsTwin.sootRadius;

  // Real-time What-If physics state for zero-lag canvas rendering
  const whatIfProps = computeFlameProps(whatIfGravity, whatIfOxygen, whatIfFlow, whatIfPressure, whatIfFuel);

  // Query Gemini for What-If Lab Physics using client-side service (Vite / Vercel ready)
  const fetchAiFlamePhysics = async () => {
    setIsSimulatingAi(true);
    try {
      const data = await simulateFlamePhysics({
        gravityG: whatIfGravity,
        oxygenPct: whatIfOxygen,
        airflowVelocity: whatIfFlow,
        fuelChoice: whatIfFuel,
        pressureKpa: whatIfPressure,
      });
      if (data) {
        setAiFlameData(data);
      }
    } catch (err) {
      console.error('Error fetching AI flame physics:', err);
    } finally {
      setIsSimulatingAi(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchAiFlamePhysics();
    }, 400);
    return () => clearTimeout(timeout);
  }, [whatIfGravity, whatIfOxygen, whatIfFlow, whatIfFuel, whatIfPressure]);

  // General Canvas Drawing Helper with Smooth Extinction Collapse, Cooling Ember & Smoke Plume
  const drawFlameOnCanvas = (
    canvas: HTMLCanvasElement | null,
    g: number,
    flow: number,
    o2: number,
    shape: string,
    intensity: number,
    extinctionReason: string,
    now: number,
    isHybrid = false
  ) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // Trail fade
    ctx.fillStyle = 'rgba(4, 7, 16, 0.30)';
    ctx.fillRect(0, 0, w, h);

    const is0G = g < 0.05;
    const isCoolFlame = shape === 'cool-envelope';
    const isQuenched = shape === 'quenched' || intensity <= 0.02;

    // Retrieve or initialize per-canvas extinction animation state
    let animState = canvasAnimStateRef.current.get(canvas);
    if (!animState) {
      animState = {
        extinguishLevel: isQuenched ? 1 : 0,
        lastTime: now,
        smokePuffs: [],
      };
      canvasAnimStateRef.current.set(canvas, animState);
    }

    const dt = Math.min(0.08, Math.max(0.001, (now - animState.lastTime) / 1000));
    animState.lastTime = now;

    // Smoothly animate extinguishLevel (0 = burning, 1 = fully extinguished)
    const prevExt = animState.extinguishLevel;
    if (isQuenched) {
      animState.extinguishLevel = Math.min(1, animState.extinguishLevel + dt * 1.15);
    } else {
      animState.extinguishLevel = Math.max(0, animState.extinguishLevel - dt * 2.2);
    }

    const ext = animState.extinguishLevel;
    const anchorX = cx;
    const anchorY = !is0G ? cy + 28 : cy;

    // Spawn residual smoke/CO2 vapor wisps while extinguishing or near extinction
    if ((isQuenched && ext < 0.96) || (ext > 0.05 && ext < 0.95) || (prevExt < ext && Math.random() < 0.65)) {
      if (animState.smokePuffs.length < 36) {
        const angle = Math.random() * Math.PI * 2;
        const speed = is0G ? (10 + Math.random() * 18) : (16 + Math.random() * 24);
        animState.smokePuffs.push({
          x: anchorX + (Math.random() - 0.5) * 10,
          y: anchorY - (is0G ? 0 : 10),
          vx: is0G ? Math.cos(angle) * speed + flow * 95 : flow * 115 + (Math.random() - 0.5) * 14,
          vy: is0G ? Math.sin(angle) * speed : -(speed + g * 18),
          r: 4 + Math.random() * 5,
          alpha: 0.42 + Math.random() * 0.25,
          life: 1.0,
        });
      }
    }

    // Update & render smoke/vapor puffs
    for (let i = animState.smokePuffs.length - 1; i >= 0; i--) {
      const puff = animState.smokePuffs[i];
      puff.x += puff.vx * dt;
      puff.y += puff.vy * dt;
      puff.r += dt * (is0G ? 9 : 12);
      puff.life -= dt * 0.58;
      if (puff.life <= 0) {
        animState.smokePuffs.splice(i, 1);
        continue;
      }
      const smokeGrad = ctx.createRadialGradient(puff.x, puff.y, 0, puff.x, puff.y, puff.r);
      smokeGrad.addColorStop(0, `rgba(148, 163, 184, ${puff.alpha * puff.life * 0.55})`);
      smokeGrad.addColorStop(0.6, `rgba(100, 116, 139, ${puff.alpha * puff.life * 0.28})`);
      smokeGrad.addColorStop(1, 'rgba(71, 85, 105, 0)');
      ctx.fillStyle = smokeGrad;
      ctx.beginPath();
      ctx.arc(puff.x, puff.y, puff.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Compute live flame scale & sputtering behavior
    const activeIntensity = isQuenched ? 0 : intensity;
    const burnStrength = Math.max(0, (1 - ext) * (isQuenched ? 0.85 : activeIntensity));
    const isNearLimit = !isQuenched && activeIntensity < 0.45;
    const sputter = isNearLimit
      ? (0.65 + 0.35 * Math.sin(now * 0.045) * Math.cos(now * 0.029))
      : 1.0;
    const liveAlpha = Math.max(0, Math.min(1, burnStrength * sputter));

    // ==========================================
    // RENDER FLAME IF STILL BURNING OR MID-COLLAPSE
    // ==========================================
    if (liveAlpha > 0.02) {
      const sizeScale = 0.28 + 0.72 * Math.sqrt(burnStrength);
      const yellowRatio = Math.max(0, Math.min(1, (activeIntensity - 0.22) / 0.65));

      if (!is0G) {
        // TRUE BUOYANT TEARDROP FLAME (scales cleanly from partial-g 0.05g up to 1.0g, including FlameTwin!)
        const burnerX = anchorX;
        const burnerY = anchorY;

        const gRatio = Math.min(1.0, Math.max(0.18, g));
        const flameHeight = Math.max(18, (68 * (0.55 + gRatio * 0.65) + (o2 - 21) * 1.4) * sizeScale);
        const baseWidth = Math.max(6, (20 + (1 - gRatio) * 5 + (o2 - 21) * 0.3 + Math.sin(now * 0.007) * 0.9) * sizeScale);

        const jitterAmp = isNearLimit || ext > 0.05 ? 4.8 : 2.2;
        const tipFlickerX = Math.sin(now * 0.021) * (jitterAmp * Math.min(g + 0.25, 1.3));
        const tipFlickerY = Math.cos(now * 0.029) * (isNearLimit ? 3.5 : 1.6);
        const liftOffset = ext * 8 + (flow > 0.32 ? (flow - 0.32) * 28 : 0);
        const tipX = burnerX + (flow * 48) + tipFlickerX;
        const tipY = burnerY - flameHeight - liftOffset + tipFlickerY;

        const traceTeardrop = (
          context: CanvasRenderingContext2D,
          tX: number,
          tY: number,
          bX: number,
          bY: number,
          width: number
        ) => {
          const heightSpan = Math.max(8, bY - tY);
          context.beginPath();
          context.moveTo(tX, tY);
          context.bezierCurveTo(
            tX + width * 0.35, tY + heightSpan * 0.40,
            bX + width * 1.15, bY - heightSpan * 0.22,
            bX + width, bY
          );
          context.quadraticCurveTo(bX, bY + width * 0.42, bX - width, bY);
          context.bezierCurveTo(
            bX - width * 1.15, bY - heightSpan * 0.22,
            tX - width * 0.35, tY + heightSpan * 0.40,
            tX, tY
          );
          context.closePath();
        };

        ctx.save();
        ctx.globalAlpha = liveAlpha;

        // Outer plume
        const plumeGrad = ctx.createLinearGradient(burnerX, burnerY + 8, tipX, tipY - 14);
        if (isHybrid) {
          plumeGrad.addColorStop(0, yellowRatio > 0.25 ? 'rgba(168, 85, 247, 0.34)' : 'rgba(56, 189, 248, 0.30)');
          plumeGrad.addColorStop(0.55, yellowRatio > 0.25 ? 'rgba(249, 115, 22, 0.20)' : 'rgba(99, 102, 241, 0.18)');
        } else {
          plumeGrad.addColorStop(0, yellowRatio > 0.2 ? 'rgba(234, 88, 12, 0.35)' : 'rgba(56, 189, 248, 0.30)');
          plumeGrad.addColorStop(0.55, yellowRatio > 0.2 ? 'rgba(249, 115, 22, 0.18)' : 'rgba(37, 99, 235, 0.16)');
        }
        plumeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = plumeGrad;
        traceTeardrop(ctx, tipX, tipY - 10 * sizeScale, burnerX, burnerY + 2 - liftOffset * 0.5, baseWidth * 1.35);
        ctx.fill();

        // Main mantle
        const mantleGrad = ctx.createLinearGradient(burnerX, burnerY - liftOffset * 0.4, tipX, tipY);
        mantleGrad.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
        if (isHybrid && yellowRatio > 0.25) {
          mantleGrad.addColorStop(0.22, 'rgba(125, 211, 252, 0.92)');
          mantleGrad.addColorStop(0.55, `rgba(192, 132, 252, ${0.88 * yellowRatio})`);
          mantleGrad.addColorStop(0.84, `rgba(251, 146, 60, ${0.86 * yellowRatio})`);
        } else if (yellowRatio > 0.25) {
          mantleGrad.addColorStop(0.22, `rgba(254, 240, 138, ${0.95 * yellowRatio})`);
          mantleGrad.addColorStop(0.52, `rgba(251, 191, 36, ${0.90 * yellowRatio})`);
          mantleGrad.addColorStop(0.84, `rgba(249, 115, 22, ${0.85 * yellowRatio})`);
        } else {
          mantleGrad.addColorStop(0.35, isHybrid ? 'rgba(168, 85, 247, 0.85)' : 'rgba(56, 189, 248, 0.85)');
          mantleGrad.addColorStop(0.80, 'rgba(37, 99, 235, 0.55)');
        }
        mantleGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = mantleGrad;
        traceTeardrop(ctx, tipX, tipY, burnerX, burnerY - liftOffset * 0.4, baseWidth);
        ctx.fill();

        // Inner core
        const coreH = flameHeight * 0.46;
        const coreTipY = burnerY - coreH - liftOffset * 0.5;
        const coreGrad = ctx.createLinearGradient(burnerX, burnerY, burnerX, coreTipY);
        coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        coreGrad.addColorStop(0.45, isHybrid ? 'rgba(56, 189, 248, 0.82)' : yellowRatio > 0.2 ? 'rgba(254, 240, 138, 0.80)' : 'rgba(125, 211, 252, 0.75)');
        coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coreGrad;
        traceTeardrop(ctx, burnerX + (flow * 16), coreTipY, burnerX, burnerY - 2 - liftOffset * 0.4, baseWidth * 0.48);
        ctx.fill();

        // Blue stoichiometric base rim
        const blueRimGrad = ctx.createLinearGradient(burnerX - baseWidth, burnerY, burnerX + baseWidth, burnerY);
        blueRimGrad.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
        blueRimGrad.addColorStop(0.5, isHybrid ? 'rgba(168, 85, 247, 0.65)' : 'rgba(37, 99, 235, 0.40)');
        blueRimGrad.addColorStop(1, 'rgba(56, 189, 248, 0.85)');
        ctx.strokeStyle = blueRimGrad;
        ctx.lineWidth = Math.max(1.5, 3.2 * sizeScale);
        ctx.beginPath();
        ctx.arc(burnerX, burnerY + 2 - liftOffset * 0.3, baseWidth * 0.92, 0.15 * Math.PI, 0.85 * Math.PI, false);
        ctx.stroke();

        ctx.restore();
      } else {
        // 0G SPHERICAL FLAME BALL (or FlameTwin 0G Coupled Envelope)
        const baseRadius = isCoolFlame ? 22 : isHybrid ? 34 : 30;
        const radius = Math.max(5, baseRadius * sizeScale);
        const pulse = Math.sin(now * (isNearLimit ? 0.025 : 0.006)) * (isNearLimit ? 2.5 : 1.8);
        const offsetX = flow * 36;

        ctx.save();
        ctx.globalAlpha = liveAlpha;

        const grad = ctx.createRadialGradient(
          cx + offsetX, cy, 1,
          cx + offsetX, cy, Math.max(4, radius + pulse)
        );

        if (isHybrid) {
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          grad.addColorStop(0.25, 'rgba(56, 189, 248, 0.85)');
          grad.addColorStop(0.65, isCoolFlame ? 'rgba(129, 140, 248, 0.45)' : 'rgba(168, 85, 247, 0.65)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else if (isCoolFlame || isNearLimit) {
          grad.addColorStop(0, 'rgba(125, 211, 252, 0.65)');
          grad.addColorStop(0.55, 'rgba(56, 189, 248, 0.38)');
          grad.addColorStop(0.85, 'rgba(168, 85, 247, 0.22)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
          grad.addColorStop(0.3, 'rgba(56, 189, 248, 0.85)');
          grad.addColorStop(0.8, 'rgba(37, 99, 235, 0.4)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx + offsetX, cy, Math.max(4, radius + pulse), 0, Math.PI * 2);
        ctx.fill();

        if (!isCoolFlame && burnStrength > 0.25) {
          ctx.strokeStyle = isHybrid ? 'rgba(192, 132, 252, 0.45)' : 'rgba(148, 163, 184, 0.35)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(cx + offsetX, cy, radius + (isHybrid ? 14 : 11), 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.restore();
      }
    }

    // ==========================================
    // BURNER NOZZLE / DROPLET CORE + COOLING EMBER ON EXTINCTION
    // ==========================================
    const emberHeat = isQuenched ? Math.max(0, 1 - ext * 0.72) : 0;
    if (!is0G) {
      ctx.fillStyle = '#475569';
      ctx.fillRect(anchorX - 5, anchorY + 3, 10, 8);
      ctx.fillStyle = emberHeat > 0.25 ? `rgba(249, 115, 22, ${emberHeat})` : '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(anchorX, anchorY + 3, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      if (emberHeat > 0.18) {
        const emberGrad = ctx.createRadialGradient(anchorX, anchorY, 0, anchorX, anchorY, 10 * emberHeat + 4);
        emberGrad.addColorStop(0, `rgba(251, 146, 60, ${emberHeat * 0.85})`);
        emberGrad.addColorStop(0.5, `rgba(185, 28, 28, ${emberHeat * 0.4})`);
        emberGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = emberGrad;
        ctx.beginPath();
        ctx.arc(anchorX, anchorY, 10 * emberHeat + 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = emberHeat > 0.35 ? '#fb923c' : '#94a3b8';
      ctx.beginPath();
      ctx.arc(anchorX, anchorY, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Clear Extinguished State Readout
    if (isQuenched && ext > 0.55) {
      const labelAlpha = Math.min(1, (ext - 0.55) / 0.35);
      ctx.save();
      ctx.globalAlpha = labelAlpha;
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('FLAME EXTINGUISHED', cx, h - 28);
      if (extinctionReason) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillText(extinctionReason, cx, h - 14);
      }
      ctx.restore();
    }
  };

  // Main Render Loop across active visualizers
  useEffect(() => {
    let now = performance.now();
    const render = () => {
      now = performance.now();
      animFrameRef.current = requestAnimationFrame(render);

      // What-If Canvas (instant real-time physical extinction + AI shape awareness)
      if (activeSubTab === 'whatif' && whatIfCanvasRef.current) {
        const effShape = whatIfProps.shape === 'quenched' ? 'quenched' : aiFlameData.flameShape === 'quenched' ? 'quenched' : whatIfProps.shape;
        drawFlameOnCanvas(
          whatIfCanvasRef.current,
          whatIfGravity,
          whatIfFlow,
          whatIfOxygen,
          effShape,
          whatIfProps.intensity,
          whatIfProps.extinctionReason,
          now
        );
      }

      // Side-by-Side Dual Canvases + FlameTwin
      if (activeSubTab === 'sidebyside') {
        if (sideCanvasARef.current) {
          drawFlameOnCanvas(
            sideCanvasARef.current,
            gravityA,
            flowA,
            oxygenA,
            propsA.shape,
            propsA.intensity,
            propsA.extinctionReason,
            now
          );
        }
        if (sideCanvasBRef.current) {
          drawFlameOnCanvas(
            sideCanvasBRef.current,
            gravityB,
            flowB,
            oxygenB,
            propsB.shape,
            propsB.intensity,
            propsB.extinctionReason,
            now + 500
          );
        }
        if (isMerged && flameTwinCanvasRef.current) {
          drawFlameOnCanvas(
            flameTwinCanvasRef.current,
            hybridG,
            hybridFlow,
            hybridO2,
            propsTwin.shape,
            propsTwin.intensity,
            propsTwin.extinctionReason,
            now + 250,
            true
          );
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [
    activeSubTab,
    whatIfGravity,
    whatIfFlow,
    whatIfOxygen,
    whatIfPressure,
    whatIfFuel,
    aiFlameData,
    gravityA,
    flowA,
    oxygenA,
    pressureA,
    fuelA,
    gravityB,
    flowB,
    oxygenB,
    pressureB,
    fuelB,
    isMerged,
    mergeStrategy,
    hybridG,
    hybridFlow,
    hybridO2,
  ]);

  // Side-by-Side & FlameTwin AI Chat Submit with Full Slider Knowledge
  const handleSideAiSubmit = async (overridePrompt?: string) => {
    const query = (overridePrompt || sideAiInput).trim();
    if (!query || isSideAiTyping) return;

    sound.playClick();
    if (!overridePrompt) setSideAiInput('');
    setSideAiChatMessages(prev => [...prev, { sender: 'user', text: query }]);
    setIsSideAiTyping(true);

    try {
      const data = await analyzeSideBySide({
        query,
        expAId: presetA,
        expBId: presetB,
        customValues: {
          flameA: {
            gravityG: gravityA,
            oxygenPct: oxygenA,
            flowVelocity: flowA,
            fuel: fuelA,
            pressureKpa: pressureA,
            coreTempC: propsA.coreTemp,
            shape: propsA.shape,
          },
          flameB: {
            gravityG: gravityB,
            oxygenPct: oxygenB,
            flowVelocity: flowB,
            fuel: fuelB,
            pressureKpa: pressureB,
            coreTempC: propsB.coreTemp,
            shape: propsB.shape,
          },
          isMerged,
          flameTwin: {
            gravityG: hybridG,
            oxygenPct: hybridO2,
            flowVelocity: hybridFlow,
            hybridTempC: hybridTemp,
            damkohler: hybridDamkohler,
            shape: propsTwin.shape,
            extinctionReason: propsTwin.extinctionReason,
            mergeStrategy,
          }
        }
      });

      if (data && data.analysis) {
        setSideAiChatMessages(prev => [...prev, { sender: 'assistant', text: data.analysis }]);
      }
    } catch (err) {
      console.error(err);
      setSideAiChatMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: `[Dual Flame & FlameTwin Physics Diagnostic]\nComparing live slider values:\n• Flame A (${gravityA}g, ${oxygenA}% O₂, ${flowA} m/s): Core temp is ~${propsA.coreTemp}°C with ${propsA.shape} morphology.\n• Flame B (${gravityB}g, ${oxygenB}% O₂, ${flowB} m/s): Core temp is ~${propsB.coreTemp}°C with ${propsB.shape} buoyancy profile.\n• Delta: Δg=${Math.abs(gravityA - gravityB).toFixed(2)}g, ΔO₂=${Math.abs(oxygenA - oxygenB).toFixed(1)}%, ΔTemp=${Math.abs(propsA.coreTemp - propsB.coreTemp)}°C.\n• FlameTwin Merger: ${isMerged ? `Synthesizing ${mergeStrategy} yields ~${hybridTemp}°C with Damköhler Da=${hybridDamkohler}.` : 'Currently unmerged.'}`
        }
      ]);
    } finally {
      setIsSideAiTyping(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
      {/* View Header with Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
              Microgravity Flame Visualizer Suite
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Physical combustion simulations powered by NASA PSI datasets and live Gemini AI kinetics.
          </p>
        </div>

        {/* 4 Streamlined Sub-Tools */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800 self-start sm:self-auto font-mono text-xs">
          <button
            onClick={() => { sound.playClick(); setActiveSubTab('sidebyside'); }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              activeSubTab === 'sidebyside'
                ? 'bg-purple-600 text-white font-bold shadow-glow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Dual Lab & FlameTwin</span>
          </button>

          <button
            onClick={() => { sound.playClick(); setActiveSubTab('whatif'); }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              activeSubTab === 'whatif'
                ? 'bg-cyan-600 text-white font-bold shadow-glow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>What-If Lab</span>
          </button>

          <button
            onClick={() => { sound.playClick(); setActiveSubTab('flamedna'); }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              activeSubTab === 'flamedna'
                ? 'bg-emerald-600 text-white font-bold shadow-glow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Dna className="w-3.5 h-3.5" />
            <span>Combustion DNA</span>
          </button>

          <button
            onClick={() => { sound.playClick(); setActiveSubTab('habitat'); }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              activeSubTab === 'habitat'
                ? 'bg-amber-600 text-white font-bold shadow-glow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Habitat Relevance</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* UNIFIED SUB-TOOL: SIDE-BY-SIDE + FLAMETWIN MERGER TOGETHER */}
      {/* ======================================================== */}
      {activeSubTab === 'sidebyside' && (
        <div className="space-y-6">
          {/* Main Grid: Left = Dual Flames + Merge Section; Right = AI Research Console */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT / CENTER COLUMN (7 cols): DUAL FLAMES WITH SLIDERS + MERGE BUTTON + FLAMETWIN */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* TOP: SIDE-BY-SIDE DUAL FLAME CARDS WITH FULL SLIDERS */}
              <div className="glass p-5 rounded-2xl border-slate-800 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                      <GitCompare className="w-5 h-5 text-purple-400" />
                      <span>Synchronized Dual Flame Visualizers with Sliders</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Adjust independent sliders for Flame A and Flame B to test contrasting combustion regimes.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-700 shrink-0">
                    DUAL CONTROLS
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ================= FLAME A (CYAN) ================= */}
                  <div className="p-4 rounded-xl bg-[#050814] border border-cyan-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-cyan-400">
                        <Flame className="w-4 h-4" />
                        <span>FLAME A (0G / Micrograv)</span>
                      </div>
                      <select
                        value={presetA}
                        onChange={(e) => handlePresetA(e.target.value)}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-cyan-200"
                      >
                        {FLAME_FINGERPRINTS.map(f => (
                          <option key={f.id} value={f.id}>{f.experimentName.split(' ')[0]}</option>
                        ))}
                      </select>
                    </div>

                    {/* Canvas A */}
                    <div className="relative rounded-lg overflow-hidden border border-cyan-500/30 bg-black">
                      <canvas
                        ref={sideCanvasARef}
                        width={280}
                        height={180}
                        className="w-full h-[180px] object-contain"
                      />
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 border border-cyan-600/40 text-[9px] font-mono text-cyan-300">
                        {propsA.shape.toUpperCase()} · ~{propsA.coreTemp}°C
                      </div>
                      <button
                        onClick={() => {
                          sound.playClick();
                          setOxygenA(propsA.shape === 'quenched' ? 21.0 : 12.0);
                        }}
                        className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-[9px] font-mono text-slate-200 cursor-pointer transition"
                      >
                        {propsA.shape === 'quenched' ? 'Re-Ignite' : 'Extinguish'}
                      </button>
                    </div>

                    {/* Sliders for Flame A */}
                    <div className="space-y-2.5 pt-1">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-400">GRAVITY LEVEL:</span>
                          <span className="text-cyan-300 font-bold">{gravityA.toFixed(2)} g</span>
                        </div>
                        <input
                          type="range"
                          min="0.00"
                          max="1.00"
                          step="0.01"
                          value={gravityA}
                          onChange={(e) => setGravityA(parseFloat(e.target.value))}
                          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-400">OXYGEN CONCENTRATION:</span>
                          <span className="text-cyan-300 font-bold">{oxygenA.toFixed(1)}% O₂</span>
                        </div>
                        <input
                          type="range"
                          min="12.0"
                          max="35.0"
                          step="0.5"
                          value={oxygenA}
                          onChange={(e) => setOxygenA(parseFloat(e.target.value))}
                          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-400">AIRFLOW VELOCITY:</span>
                          <span className="text-cyan-300 font-bold">{(flowA * 100).toFixed(0)} cm/s</span>
                        </div>
                        <input
                          type="range"
                          min="0.00"
                          max="0.50"
                          step="0.01"
                          value={flowA}
                          onChange={(e) => setFlowA(parseFloat(e.target.value))}
                          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                        />
                      </div>

                      <div className="pt-1">
                        <label className="text-[9px] font-mono text-slate-400 block mb-0.5">FUEL SPECIMEN A:</label>
                        <select
                          value={fuelA}
                          onChange={(e) => setFuelA(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-200"
                        >
                          <option value="n-Heptane Droplet">n-Heptane Droplet (FLEX / PSI-20)</option>
                          <option value="Methane Gas Jet">Methane Gas Jet (ACME CFI-G / PSI-159)</option>
                          <option value="PMMA Solid Acrylic">PMMA Acrylic Rod (BASS-II / PSI-25)</option>
                          <option value="SIBAL Fabric Cloth">SIBAL Cloth (Saffire-I / PSI-98)</option>
                          <option value="Polyethylene Wire">Polyethylene Wire (SoFIE / PSI-115)</option>
                          <option value="Paraffin Wax">Paraffin Wax (Terrestrial Candle)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* ================= FLAME B (PURPLE) ================= */}
                  <div className="p-4 rounded-xl bg-[#050814] border border-purple-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-purple-400">
                        <Flame className="w-4 h-4" />
                        <span>FLAME B (1G / Terrestrial)</span>
                      </div>
                      <select
                        value={presetB}
                        onChange={(e) => handlePresetB(e.target.value)}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-purple-200"
                      >
                        {FLAME_FINGERPRINTS.map(f => (
                          <option key={f.id} value={f.id}>{f.experimentName.split(' ')[0]}</option>
                        ))}
                      </select>
                    </div>

                    {/* Canvas B */}
                    <div className="relative rounded-lg overflow-hidden border border-purple-500/30 bg-black">
                      <canvas
                        ref={sideCanvasBRef}
                        width={280}
                        height={180}
                        className="w-full h-[180px] object-contain"
                      />
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 border border-purple-600/40 text-[9px] font-mono text-purple-300">
                        {propsB.shape.toUpperCase()} · ~{propsB.coreTemp}°C
                      </div>
                      <button
                        onClick={() => {
                          sound.playClick();
                          setOxygenB(propsB.shape === 'quenched' ? 21.0 : 12.0);
                        }}
                        className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-[9px] font-mono text-slate-200 cursor-pointer transition"
                      >
                        {propsB.shape === 'quenched' ? 'Re-Ignite' : 'Extinguish'}
                      </button>
                    </div>

                    {/* Sliders for Flame B */}
                    <div className="space-y-2.5 pt-1">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-400">GRAVITY LEVEL:</span>
                          <span className="text-purple-300 font-bold">{gravityB.toFixed(2)} g</span>
                        </div>
                        <input
                          type="range"
                          min="0.00"
                          max="1.00"
                          step="0.01"
                          value={gravityB}
                          onChange={(e) => setGravityB(parseFloat(e.target.value))}
                          className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-400">OXYGEN CONCENTRATION:</span>
                          <span className="text-purple-300 font-bold">{oxygenB.toFixed(1)}% O₂</span>
                        </div>
                        <input
                          type="range"
                          min="12.0"
                          max="35.0"
                          step="0.5"
                          value={oxygenB}
                          onChange={(e) => setOxygenB(parseFloat(e.target.value))}
                          className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-400">AIRFLOW VELOCITY:</span>
                          <span className="text-purple-300 font-bold">{(flowB * 100).toFixed(0)} cm/s</span>
                        </div>
                        <input
                          type="range"
                          min="0.00"
                          max="0.50"
                          step="0.01"
                          value={flowB}
                          onChange={(e) => setFlowB(parseFloat(e.target.value))}
                          className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                        />
                      </div>

                      <div className="pt-1">
                        <label className="text-[9px] font-mono text-slate-400 block mb-0.5">FUEL SPECIMEN B:</label>
                        <select
                          value={fuelB}
                          onChange={(e) => setFuelB(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-200"
                        >
                          <option value="Methane Gas Jet">Methane Gas Jet (ACME CFI-G / PSI-159)</option>
                          <option value="n-Heptane Droplet">n-Heptane Droplet (FLEX / PSI-20)</option>
                          <option value="PMMA Solid Acrylic">PMMA Acrylic Rod (BASS-II / PSI-25)</option>
                          <option value="SIBAL Fabric Cloth">SIBAL Cloth (Saffire-I / PSI-98)</option>
                          <option value="Polyethylene Wire">Polyethylene Wire (SoFIE / PSI-115)</option>
                          <option value="Paraffin Wax">Paraffin Wax (Terrestrial Candle)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Automatic Difference Highlighting Matrix */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono space-y-2">
                  <div className="text-purple-300 font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>LIVE DELTA HIGHLIGHTING MATRIX (FROM SLIDERS):</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Real-time dynamic</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">Δ CORE TEMP</span>
                      <span className="text-amber-300 font-bold">{Math.abs(propsA.coreTemp - propsB.coreTemp)} °C</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">Δ GRAVITY</span>
                      <span className="text-cyan-300 font-bold">{Math.abs(gravityA - gravityB).toFixed(2)} g</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">Δ AIRFLOW</span>
                      <span className="text-emerald-300 font-bold">{Math.abs(flowA - flowB).toFixed(2)} m/s</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">Δ OXYGEN</span>
                      <span className="text-purple-300 font-bold">{Math.abs(oxygenA - oxygenB).toFixed(1)}%</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-sans pt-1">
                    Note: Dual Lab and FlameTwin canvases render parametric combustion morphology approximations for interactive exploration, not raw PSI flight video or direct measurements.
                  </p>
                </div>
              </div>

              {/* ======================================================== */}
              {/* MERGE BUTTON & FLAMETWIN MERGED VISUALIZER (BELOW SLIDERS) */}
              {/* ======================================================== */}
              <div className="glass p-5 rounded-2xl border-indigo-500/40 bg-gradient-to-b from-[#0a1024] to-[#060914] space-y-5 shadow-glow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-900/50 pb-3">
                  <div>
                    <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-400" />
                      <span>FlameTwin Hybrid Synthesis Visualizer</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Merge Flame A and Flame B's slider parameters into a unified, physical hybrid flame model.
                    </p>
                  </div>

                  {/* Strategy selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-indigo-300">Strategy:</span>
                    <select
                      value={mergeStrategy}
                      onChange={(e) => setMergeStrategy(e.target.value as any)}
                      className="px-2 py-1 rounded bg-slate-900 border border-indigo-700 text-[10px] font-mono text-slate-200"
                    >
                      <option value="Equimolar Kinetics Fusion">Equimolar Kinetics</option>
                      <option value="Radical Boundary Coupling">Radical Boundary</option>
                      <option value="Worst-Case Extinction Limit">Worst-Case Extinction</option>
                    </select>
                  </div>
                </div>

                {/* PROMINENT MERGE BUTTON */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
                  <div className="text-xs font-mono text-slate-300">
                    <div>Fusing: <strong className="text-cyan-300">{fuelA}</strong> + <strong className="text-purple-300">{fuelB}</strong></div>
                    <div className="text-[10px] text-slate-400">Effective: {hybridG.toFixed(2)}g · {hybridO2.toFixed(1)}% O₂ · {(hybridFlow * 100).toFixed(0)} cm/s</div>
                  </div>

                  <button
                    onClick={() => {
                      sound.playClick();
                      setIsMerged(prev => !prev);
                    }}
                    className={`px-5 py-2.5 rounded-xl font-display font-bold text-xs tracking-wide flex items-center gap-2 transition cursor-pointer ${
                      isMerged 
                        ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-glow border border-indigo-400'
                        : 'bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 border border-indigo-600'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-cyan-300" />
                    <span>{isMerged ? 'FlameTwin Hybrid Active' : 'Merge into FlameTwin'}</span>
                  </button>
                </div>

                {/* THE MERGED FLAMETWIN CANVAS & DIAGNOSTIC */}
                {isMerged && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center pt-2">
                    {/* Merged Canvas (5 cols) */}
                    <div className="md:col-span-5 flex flex-col items-center">
                      <div className="relative w-full rounded-xl overflow-hidden border border-indigo-500/50 bg-black p-1 shadow-glow">
                        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-black/80 border border-indigo-400/60 font-mono text-[9px] text-indigo-300">
                          {propsTwin.shape === 'quenched'
                            ? `EXTINGUISHED · ${hybridTemp}°C`
                            : propsTwin.shape === 'cool-envelope'
                            ? `COOL ENVELOPE · ${hybridTemp}°C`
                            : propsTwin.is0G
                            ? `0G HYBRID SPHERE · ${hybridTemp}°C`
                            : `BUOYANT HYBRID (${hybridG.toFixed(2)}g) · ${hybridTemp}°C`}
                        </div>
                        <canvas
                          ref={flameTwinCanvasRef}
                          width={320}
                          height={220}
                          className="w-full h-[200px] object-contain"
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 mt-1">
                        {propsTwin.shape === 'quenched'
                          ? `Quenched: ${propsTwin.extinctionReason}`
                          : propsTwin.is0G
                          ? 'Isotropic diffusion-controlled hybrid envelope'
                          : `Buoyancy-coupled flame morphology (${hybridG.toFixed(2)}g)`}
                      </span>
                    </div>

                    {/* Merged Diagnostic (7 cols) */}
                    <div className="md:col-span-7 space-y-3 font-mono text-xs">
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded bg-slate-950 border border-indigo-900/60">
                          <span className="text-slate-500 block text-[9px]">COMPUTED HYBRID TEMP</span>
                          <span className="text-white font-bold">{hybridTemp} °C</span>
                        </div>
                        <div className="p-2 rounded bg-slate-950 border border-indigo-900/60">
                          <span className="text-slate-500 block text-[9px]">COMBINED DAMKÖHLER</span>
                          <span className="text-cyan-300 font-bold">{hybridDamkohler}</span>
                        </div>
                        <div className="p-2 rounded bg-slate-950 border border-indigo-900/60">
                          <span className="text-slate-500 block text-[9px]">{propsTwin.is0G ? 'SOOT SHELL STANDOFF' : 'BUOYANT SOOT PLUME'}</span>
                          <span className="text-amber-300 font-bold">
                            {propsTwin.shape === 'quenched' ? '0.0 mm' : `${hybridSootStandoff.toFixed(1)} mm`}
                          </span>
                        </div>
                        <div className="p-2 rounded bg-slate-950 border border-indigo-900/60">
                          <span className="text-slate-500 block text-[9px]">CHEMILUMINESCENCE</span>
                          <span className="text-indigo-300 font-bold">{propsTwin.chemiluminescence}</span>
                        </div>
                      </div>

                      <p className="text-slate-300 font-sans text-[11px] leading-relaxed p-2.5 rounded bg-slate-900/80 border border-slate-800">
                        {propsTwin.shape === 'quenched'
                          ? `${mergeStrategy} predicts full flame extinction when coupling ${fuelA} with ${fuelB} at ${hybridO2.toFixed(1)}% O₂ and ${(hybridFlow * 100).toFixed(0)} cm/s (${propsTwin.extinctionReason.toLowerCase()}).`
                          : propsTwin.shape === 'cool-envelope'
                          ? `${mergeStrategy} places ${fuelA} + ${fuelB} in a low-temperature peroxy cool-flame regime (~${hybridTemp}°C) at ${hybridG.toFixed(2)}g with invisible RO₂• reaction zones.`
                          : propsTwin.is0G
                          ? `${mergeStrategy} fuses ${fuelA} and ${fuelB} at ${hybridG.toFixed(2)}g into a diffusion-dominated spherical flame (~${hybridTemp}°C, Da=${hybridDamkohler}) with a ${hybridSootStandoff.toFixed(1)} mm trapped soot shell.`
                          : `${mergeStrategy} couples ${fuelA} and ${fuelB} at ${hybridG.toFixed(2)}g gravity into a buoyant teardrop reaction zone (~${hybridTemp}°C, Da=${hybridDamkohler}) driven by convective oxidizer entrainment.`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN (5 cols): EMBEDDED AI AGENT (AWARE OF SLIDERS & MERGE VALUES) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="glass p-5 rounded-2xl border-purple-900/50 flex flex-col justify-between min-h-[580px]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-purple-400" />
                      <div>
                        <h4 className="font-display font-bold text-sm text-white">
                          Combustion AI Research Agent
                        </h4>
                        <p className="text-[10px] font-mono text-slate-400">
                          Synchronized with live sliders and FlameTwin
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                      LIVE SLIDERS SYNC
                    </span>
                  </div>

                  {/* Slider Parameters Telemetry Pill Bar */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono space-y-1">
                    <div className="flex items-center justify-between text-cyan-300">
                      <span>Flame A:</span>
                      <span>{gravityA}g · {oxygenA}% O₂ · {flowA}m/s · {fuelA.split(' ')[0]}</span>
                    </div>
                    <div className="flex items-center justify-between text-purple-300">
                      <span>Flame B:</span>
                      <span>{gravityB}g · {oxygenB}% O₂ · {flowB}m/s · {fuelB.split(' ')[0]}</span>
                    </div>
                    {isMerged && (
                      <div className="flex items-center justify-between text-indigo-300 pt-0.5 border-t border-slate-900">
                        <span>FlameTwin:</span>
                        <span>{hybridTemp}°C · {mergeStrategy.split(' ')[0]}</span>
                      </div>
                    )}
                  </div>

                  {/* Suggested Slider Prompts */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-slate-500 block">QUICK INQUIRIES BASED ON SLIDER STATE:</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleSideAiSubmit(`Compare Flame A (${gravityA}g, ${oxygenA}% O2) and Flame B (${gravityB}g, ${oxygenB}% O2) based on these slider values.`)}
                        className="text-[10px] font-mono px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition text-left"
                      >
                        Compare current slider values
                      </button>
                      <button
                        onClick={() => handleSideAiSubmit(`Explain what happens to FlameTwin when merging ${fuelA} and ${fuelB} at ${hybridTemp}°C under ${mergeStrategy}.`)}
                        className="text-[10px] font-mono px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition text-left"
                      >
                        Explain FlameTwin hybrid merger
                      </button>
                      <button
                        onClick={() => handleSideAiSubmit(`Why does the soot standoff radius differ between Flame A (${propsA.sootRadius}mm) and Flame B (${propsB.sootRadius}mm)?`)}
                        className="text-[10px] font-mono px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition text-left"
                      >
                        Analyze soot standoff delta
                      </button>
                    </div>
                  </div>

                  {/* Messages Feed */}
                  <div className="mt-2 space-y-2.5 overflow-y-auto max-h-[300px] pr-1">
                    {sideAiChatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl text-xs leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 ml-4'
                            : 'bg-slate-900/90 text-slate-300 border border-slate-800 mr-2 font-mono text-[11px] whitespace-pre-line'
                        }`}
                      >
                        {msg.sender === 'assistant' ? stripLatex(msg.text) : msg.text}
                      </div>
                    ))}
                    {isSideAiTyping && (
                      <div className="text-[11px] font-mono text-purple-400 animate-pulse flex items-center gap-1.5 p-2 bg-slate-900/80 rounded-lg border border-purple-900">
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        <span>Gemini is evaluating your slider values and NASA PSI datasets...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Input Field */}
                <div className="pt-3 border-t border-slate-800 flex items-center gap-2 mt-3">
                  <input
                    type="text"
                    placeholder="Ask about these slider values, kinetics, or extinction..."
                    value={sideAiInput}
                    onChange={(e) => setSideAiInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSideAiSubmit();
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                  <button
                    onClick={() => handleSideAiSubmit()}
                    disabled={!sideAiInput.trim() || isSideAiTyping}
                    className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white transition shadow-glow cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TOOL: WHAT-IF LAB & FIREWEATHER                      */}
      {/* ======================================================== */}
      {activeSubTab === 'whatif' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Canvas Display Viewport (7 cols) */}
          <div className="lg:col-span-7 glass p-5 rounded-2xl border-cyan-900/40 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                <Atom className="w-5 h-5 text-cyan-400" />
                <span>What-If Lab & FireWeather Particle Simulation</span>
              </h3>
              <span className="text-xs font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-700">
                {whatIfProps.shape === 'quenched' ? 'EXTINGUISHED' : aiFlameData.flameShape.toUpperCase()}
              </span>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-cyan-500/30 bg-black flex flex-col items-center justify-center p-2">
              <canvas
                ref={whatIfCanvasRef}
                width={480}
                height={300}
                className="w-full max-h-[300px] object-contain rounded-lg"
              />
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/80 border border-slate-800 text-[11px] font-mono text-slate-300">
                Core: <strong className="text-cyan-300">{whatIfProps.shape === 'quenched' ? whatIfProps.coreTemp : aiFlameData.coreTemp} °C</strong> · Soot: <strong className="text-amber-300">{whatIfProps.shape === 'quenched' ? '0' : aiFlameData.sootRadiusMm} mm</strong>
              </div>
              <button
                onClick={() => {
                  sound.playClick();
                  setWhatIfOxygen(whatIfProps.shape === 'quenched' ? 21.0 : 12.0);
                }}
                className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-200 cursor-pointer transition"
              >
                {whatIfProps.shape === 'quenched' ? 'Re-Ignite Flame' : 'Extinguish Flame'}
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>GEMINI COMBUSTION SYNTHESIS:</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                  aiFlameData.extinctionRisk === 'stable' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' :
                  aiFlameData.extinctionRisk === 'cool-flame' ? 'bg-cyan-950 text-cyan-300 border border-cyan-700' :
                  'bg-red-950 text-red-300 border border-red-700'
                }`}>
                  {aiFlameData.extinctionRisk}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {stripLatex(aiFlameData.scientificSummary)}
              </p>
              <p className="text-[10px] font-mono text-slate-500 pt-1">
                Parametric simulation regime — illustrative kinetic visualization grounded in published combustion physics, not raw PSI telemetry.
              </p>
            </div>
          </div>

          {/* Environmental Sliders (5 cols) */}
          <div className="lg:col-span-5 glass p-5 rounded-2xl border-cyan-900/40 space-y-4">
            <h3 className="font-display font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Environmental Parameter Controls</span>
            </h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">GRAVITY LEVEL:</span>
                  <span className="text-cyan-300 font-bold">{whatIfGravity.toFixed(2)} g</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.01"
                  value={whatIfGravity}
                  onChange={(e) => setWhatIfGravity(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">OXYGEN CONCENTRATION:</span>
                  <span className="text-emerald-300 font-bold">{whatIfOxygen.toFixed(1)}% O₂</span>
                </div>
                <input
                  type="range"
                  min="12.0"
                  max="35.0"
                  step="0.5"
                  value={whatIfOxygen}
                  onChange={(e) => setWhatIfOxygen(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">AIRFLOW VELOCITY:</span>
                  <span className="text-amber-300 font-bold">{(whatIfFlow * 100).toFixed(0)} cm/s</span>
                </div>
                <input
                  type="range"
                  min="0.00"
                  max="0.50"
                  step="0.01"
                  value={whatIfFlow}
                  onChange={(e) => setWhatIfFlow(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">CABIN PRESSURE:</span>
                  <span className="text-purple-300 font-bold">{whatIfPressure.toFixed(1)} kPa</span>
                </div>
                <input
                  type="range"
                  min="50.0"
                  max="105.0"
                  step="1.0"
                  value={whatIfPressure}
                  onChange={(e) => setWhatIfPressure(parseFloat(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer"
                />
              </div>

              <div className="pt-2">
                <label className="text-[10px] font-mono text-slate-400 block mb-1">FUEL SPECIMEN:</label>
                <select
                  value={whatIfFuel}
                  onChange={(e) => setWhatIfFuel(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200"
                >
                  <option value="heptane">n-Heptane Droplet (FLEX / PSI-20)</option>
                  <option value="pmma">PMMA Solid Acrylic Rod (BASS-II / PSI-25)</option>
                  <option value="methane">Methane Gaseous Jet (ACME CFI-G / PSI-159)</option>
                  <option value="polyethylene">Polyethylene Wire (SoFIE MIST / PSI-115)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TOOL: COMBUSTION DNA SCIENTIFIC FINGERPRINT          */}
      {/* ======================================================== */}
      {activeSubTab === 'flamedna' && (
        <CombustionDnaPanel
          datasets={activeDatasets}
          selectedEntityId={activeInvestigationId}
          onSelectEntityId={handleSelectInvestigation}
          onRunDetectiveOnDataset={(dsId) => onRunDetectiveOnDataset?.(dsId, 'missing-inconsistent')}
          onAskAiAboutInvestigation={onAskAiAboutInvestigation}
          onOpenHabitatBridge={(invId) => {
            handleSelectInvestigation(invId);
            setActiveSubTab('habitat');
          }}
          onViewGapsForInvestigation={onViewGapsForInvestigation}
        />
      )}

      {/* ======================================================== */}
      {/* SUB-TOOL: FLAME-TO-HABITAT RELEVANCE EXPLORER            */}
      {/* ======================================================== */}
      {activeSubTab === 'habitat' && (
        <HabitatRelevancePanel
          focusInvestigationId={activeInvestigationId}
          onInspectInvestigationDna={(invId) => {
            handleSelectInvestigation(invId);
            setActiveSubTab('flamedna');
          }}
          onAskAiAboutHabitat={(prompt, invIds) => onAskAiWithPrompt?.(prompt, invIds)}
        />
      )}
    </div>
  );
};
