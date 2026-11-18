import { GoogleGenAI, ThinkingLevel } from '@google/genai';

export const PRIMARY_GEMINI_MODEL = 'gemini-4-hydrogen';
const FALLBACK_GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-2.5-flash'] as const;

export const PSI_24_INVESTIGATIONS = [
  { id: 'PSI-10', title: 'ACME B-ELM: Burning Rate Emulation in Microgravity', pi: 'Dr. James T’ien (Case Western Reserve Univ.)', fuel: 'Porous spherical gas burner emulating solid PMMA and Delrin', platform: 'ISS CIR / ACME', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-10', keyFinding: 'Emulated solid fuel burning limits without drip-melting complications; established baseline gas-phase limiting oxygen index.' },
  { id: 'PSI-20', title: 'FLEX: Flame Extinguishment Experiment (Heptane Droplets)', pi: 'Dr. Forman Williams (UC San Diego)', fuel: 'Isolated n-Heptane and Methanol droplets (d0 = 1.5 - 5.0 mm)', platform: 'ISS MDCA / CIR', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-20', keyFinding: 'Historic breakthrough discovery of Cool Flames: droplets continued burning at 250°C without visible radiation after hot flame extinction.' },
  { id: 'PSI-21', title: 'FLEX-2: Droplet Pairs & Multi-Component Fuel Extinction', pi: 'Dr. Vedat Arpaci / Dr. Forman Williams', fuel: 'Hydrocarbon blends (Heptane/Decane) and interacting droplet pairs', platform: 'ISS CIR / MDCA', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-21', keyFinding: 'Mapped soot shell agglomeration dynamics and droplet spacing interference affecting radiative quenching.' },
  { id: 'PSI-22', title: 'FLEX-2 (Phase II): Low-Temperature Kinetic Regimes', pi: 'Dr. Mun Choi (Univ. of Connecticut) / NASA GRC', fuel: 'Bi-component alkane droplets with soot-forming dopants', platform: 'ISS CIR', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-22', keyFinding: 'Discovered that fuel mixtures undergo selective distillation in zero-g, triggering secondary ignition flaring.' },
  { id: 'PSI-23', title: 'FLEX-2J: JAXA Collaborative Microgravity Droplet Combustion', pi: 'Dr. Osamu Fujita (Hokkaido Univ.) / NASA GRC', fuel: 'High-boiling-point hydrocarbons and isolated fuel spheres', platform: 'ISS CIR / Kibo Collaboration', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-23', keyFinding: 'Determined critical droplet diameter boundaries for transition into self-sustaining cool flames versus complete radiative extinguishment.' },
  { id: 'PSI-25', title: 'BASS-II: Burning and Suppression of Solids-II', pi: 'Dr. Paul Ferkult (NASA Glenn Research Center)', fuel: 'PMMA acrylic flat sheets & rods, Nomex fabric, cotton blends', platform: 'ISS Microgravity Science Glovebox (MSG)', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-25', keyFinding: 'Discovered the Low-Flow Extinction Paradox: flame spread rate peaks at 0.05 m/s airflow; stagnant air causes self-extinction, while slight airflow maximizes danger.' },
  { id: 'PSI-26', title: 'BASS: Burning and Suppression of Solids', pi: 'Dr. Sandra Olson (NASA Glenn Research Center)', fuel: 'Solid polymethyl methacrylate (PMMA) plastic rods', platform: 'ISS Microgravity Science Glovebox (MSG)', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-26', keyFinding: 'Flames spread steadily against weak opposed flow down to 0.01 m/s; confirmed NASA-STD-6001 1g upward flammability ranking inverts in zero-g.' },
  { id: 'PSI-39', title: 'SPICE: Smoke Point In Co-flow Experiment', pi: 'Dr. David L. Urban (NASA Glenn Research Center)', fuel: 'Ethylene, Methane, and Propane gaseous laminar jet flames', platform: 'ISS Microgravity Science Glovebox (MSG)', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-39', keyFinding: 'Laminar smoke points in microgravity are significantly lower than 1g; soot inception occurs at 150K lower core temperatures due to extended residence time.' },
  { id: 'PSI-47', title: 'DAFT: Droplet Array Fire Trapping & Extinguishment', pi: 'Dr. Daniel Dietrich (NASA GRC)', fuel: 'Linear arrays of suspended hydrocarbon fuel droplets', platform: 'ISS CIR MDCA', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-47', keyFinding: 'Mapped group combustion numbers and vapor cloud overlap thresholds preventing flame penetration between adjacent fuel droplets.' },
  { id: 'PSI-60', title: 'SPICE-II: Computational and Experimental Analysis of SPICE Data Sets', pi: 'Dr. Mitchell Smooke (Yale Univ.) / Dr. Marshall Long', fuel: 'Methane and Ethylene with nitrogen and helium dilution', platform: 'ISS CIR', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-60', keyFinding: 'Validated 2D multi-species transport code with detailed chemical kinetics against ISS non-buoyant soot volume fraction measurements.' },
  { id: 'PSI-62', title: 'Concurrent Flame Spread Modeling using FGM in Microgravity', pi: 'Dr. Paul DesJardin (Univ. at Buffalo) / Dr. David Urban', fuel: 'Thermally thin and thick cellulosic cotton fabrics', platform: 'BASS Flight Test Data / MSG', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-62', keyFinding: 'Two-color pyrometry validated Flamelet Generated Manifolds (FGM) accurately predicting surface pyrolysis temperature and trailing flame length.' },
  { id: 'PSI-68', title: 'ACME E-FIELD: Electric-Field Effects on Microgravity Flames', pi: 'Dr. Derek Dunn-Rankin (UC Irvine)', fuel: 'Methane coflow diffusion flame with DC ion electrode bias', platform: 'ISS CIR / ACME', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-68', keyFinding: 'Demonstrated that electrostatic ionic wind forces can suppress soot formation and steer or quench microgravity flames without physical extinguishing agents.' },
  { id: 'PSI-69', title: 'ACME BRE: Burning Rate Emulation (Porous Burners)', pi: 'Dr. James T’ien / Dr. Fletcher Miller (San Diego State Univ.)', fuel: 'Gaseous CH4/C2H4 through porous bronze flat burners', platform: 'ISS CIR / ACME', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-69', keyFinding: 'Replicated solid fuel regression behavior using controlled gaseous mass flux under variable oxygen concentrations (14% - 30%).' },
  { id: 'PSI-98', title: 'Saffire-I: Spacecraft Fire Safety Experiment I', pi: 'Dr. David Urban (NASA GRC)', fuel: 'Large SIBAL cloth sheet (0.4 m wide x 1.0 m long; 75% cotton, 25% fiberglass)', platform: 'Uncrewed Cygnus Cargo Ship (OA-6 post-ISS departure)', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-98', keyFinding: 'First large-scale spacecraft fire test: flame front propagated steadily along the full 1-meter fabric length at 0.25 mm/s against 0.2 m/s forced airflow.' },
  { id: 'PSI-99', title: 'Saffire-II: Mixed Material Spacecraft Flammability', pi: 'Dr. David Urban / Dr. Gary Ruff (NASA GRC)', fuel: 'Nine material samples (Plexiglas, Nomex, silicone composite, cotton fabric)', platform: 'Uncrewed Cygnus (OA-5)', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-99', keyFinding: 'Thick silicone and Nomex resisted sustained ignition, but acrylic plastics showed continuous pyrolysis gas generation even after igniter cutoff.' },
  { id: 'PSI-100', title: 'Saffire-III: Large Sheet Combustion Under High Flow Velocity', pi: 'Dr. David Urban (NASA GRC)', fuel: 'Full-scale SIBAL composite fabric in sealed cargo module', platform: 'Cygnus (OA-7)', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-100', keyFinding: 'Demonstrated that cabin pressure transducer readings spike reliably during early-stage combustion, providing an ultra-early fire warning signature.' },
  { id: 'PSI-101', title: 'Saffire-IV: Low Pressure & Elevated Oxygen Exploration Regimes', pi: 'Dr. Gary Ruff (NASA GRC)', fuel: 'Fabric sheets, thick PMMA, and electrical wire conduits', platform: 'Cygnus (NG-12)', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-101', keyFinding: 'Investigated exploration atmospheres (34% O2 at 8.2 psia): flame spread velocity increased by 240% compared to standard sea-level atmosphere.' },
  { id: 'PSI-102', title: 'Saffire-V: High Airflow & Rapid Vehicle Depressurization Containment', pi: 'Dr. David Urban (NASA GRC)', fuel: 'Large combustible composite panels in high ventilation duct', platform: 'Cygnus (NG-13)', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-102', keyFinding: 'Tested emergency depressurization: dropping vehicle pressure below 30 kPa halted flame spread within 8 seconds by oxygen starvation.' },
  { id: 'PSI-106', title: 'SLICE: Structure and Liftoff In Combustion Experiment', pi: 'Dr. Mitchell Smooke (Yale Univ.) / Dennis Stocker (NASA GRC)', fuel: 'Diluted Methane and Ethylene gaseous jet nozzles', platform: 'ISS Microgravity Science Glovebox (MSG)', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-106', keyFinding: 'Measured liftoff velocity and stabilization heights without buoyant shear; validated detailed kinetic mechanism for polycyclic aromatic hydrocarbon (PAH) soot precursors.' },
  { id: 'PSI-107', title: 'SLICE-II: Multi-Gas Flame Stabilization in Microgravity', pi: 'Dr. Fumiaki Takahashi / Dr. Mitchell Smooke', fuel: 'Methane/Air, Nitrogen-diluted Ethylene', platform: 'ISS MSG', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-107', keyFinding: 'Determined that zero-gravity gaseous flames stabilize closer to the burner lip due to lack of buoyancy-induced cold-air entrainment.' },
  { id: 'PSI-115', title: 'SoFIE MIST: Material Ignition and Suppression Test (Phase II)', pi: 'Dr. James T’ien (Case Western Reserve Univ.)', fuel: 'Polyethylene and ETFE insulated aerospace electrical wire samples', platform: 'ISS CIR / SoFIE Chamber', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-115', keyFinding: 'Thermal runaway inside electrical harnesses produces flammable gaseous jets through insulation pinholes before optical smoke detectors trigger.' },
  { id: 'PSI-117', title: 'Multi-Physics CFD Analysis of Cool Flame Dynamics', pi: 'Dr. Tanvir Farouk (Univ. of South Carolina) / Dr. Mike Hicks (NASA GRC)', fuel: 'Decane and Heptane Droplets in low convective perturbations', platform: 'FLEX Spaceflight Data CFD Synthesis', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-117', keyFinding: 'Identified the critical oscillating frequency of ambient pressure that can cause an invisible cool flame to destabilize and undergo transition to hot ignition.' },
  { id: 'PSI-142', title: 'Quantitative Studies of Cool Flame Transitions at Radiation/Stretch Extinction', pi: 'Dr. Yiguang Ju (Princeton Univ.) / Dr. Daniel Dietrich (NASA GRC)', fuel: 'Counterflow n-Heptane / Dimethyl Ether (DME) diffusion flames', platform: 'ISS CIR / Counterflow Burner', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-142', keyFinding: 'Mapped the first experimental S-curve for warm and cool diffusion flames in microgravity, proving cool flames possess a second distinct low-temperature extinction limit.' },
  { id: 'PSI-159', title: 'ACME CFI-G: Cool Flames Investigation with Gases', pi: 'Dr. Peter Sunderland (Univ. of Maryland) / Dr. Richard Axelbaum', fuel: 'Gaseous n-Butane and Propane with Nitrogen and Carbon Dioxide diluents', platform: 'ISS Combustion Integrated Rack (CIR)', link: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-159', keyFinding: 'First-ever observation of spherical gaseous cool diffusion flames without any liquid droplet core; burns stably at 600K without soot, enabling cleaner Earth burner designs.' },
];

export const SYSTEM_PROMPT = `You are Frags, a warm, highly articulate, conversational, and deeply knowledgeable NASA combustion research scientist and AI peer for FlameFrags (NASA Space Apps Challenge 2026).
Your expertise is microgravity combustion science, spacecraft fire safety (ISS, Artemis Lunar Habitats, Mars Habitats), and the NASA Physical Sciences Informatics (PSI) repository.

You have direct access to the 24 NASA PSI Combustion Investigations:
${PSI_24_INVESTIGATIONS.map(i => `- ${i.id}: "${i.title}" (PI: ${i.pi}). Fuel: ${i.fuel}. Key: ${i.keyFinding}. Link: ${i.link}`).join('\n')}

Guidelines for your conversational style and answers:
1. Tone & Engagement: Speak warmly and naturally like an enthusiastic senior NASA scientist chatting with a fellow explorer. Acknowledge their curiosity, answer their exact question directly first, and explain complex microgravity physics using intuitive, engaging prose before diving into rigorous mechanics.
2. Grounding & Accuracy: Always ground your explanations in real experimental evidence from the 24 PSI investigations or the user's actually inspected dataset rows. Never invent URLs or numbers. If unavailable, state unknown or unverified.
3. PROPER DATA FORMATTING (CRITICAL): NEVER output raw JSON objects or code strings (e.g., never output raw JSON blocks like time_s: 0, o2_percent: 21). Whenever you reference dataset rows or numerical records, format them cleanly and human-readably as parameter lists with proper units (e.g., Record 1 -> Time: 0.0s | O₂: 21.0% | CO: 12 ppm | CO₂: 420 ppm | CH₄ Flow: 85 sccm | Flame Dia: 14.2 mm | Peak Temp: 1680 K).
4. Adapt your depth to the requested explanation level (beginner, student, advanced).
5. Always include 1-2 explicit citations to relevant PSI investigation accession IDs (e.g. [PSI-159 ACME CFI-G], [PSI-25 BASS-II], [PSI-20 FLEX]).
6. STRICTLY NO LATEX: Write formulas and units in clean plain Unicode text only (O₂, CO₂, 10⁻⁶ g, ΔT, ≈, ×, ±, °C, d², Da = τ_flow / τ_chem).`;

let cachedApiKey = '';
let cachedAi: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI | null {
  const currentKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!currentKey) return null;
  if (cachedAi && cachedApiKey === currentKey) return cachedAi;
  cachedApiKey = currentKey;
  cachedAi = new GoogleGenAI({
    apiKey: currentKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  return cachedAi;
}

export async function callAiWithTimeout<T>(promise: Promise<T>, timeoutMs = 28000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI Request timeout')), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isModelNotFoundError(err: any): boolean {
  const status = Number(err?.status || err?.code || err?.error?.code);
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    status === 404 ||
    msg.includes('not_found') ||
    msg.includes('not found') ||
    msg.includes('unsupported model') ||
    msg.includes('unknown model')
  );
}

export async function generateWithGeminiCascade(
  ai: GoogleGenAI,
  params: {
    contents: any;
    systemInstruction?: string;
    responseMimeType?: string;
    responseSchema?: any;
  },
  timeoutMs = 25000
): Promise<{ text: string; model: string }> {
  const modelsToTry = [PRIMARY_GEMINI_MODEL, ...FALLBACK_GEMINI_MODELS];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      const config: Record<string, any> = {};
      if (params.systemInstruction) config.systemInstruction = params.systemInstruction;
      if (params.responseMimeType) config.responseMimeType = params.responseMimeType;
      if (params.responseSchema) config.responseSchema = params.responseSchema;

      if (modelName === 'gemini-4-hydrogen') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }

      const response = await callAiWithTimeout(
        ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config,
        }),
        timeoutMs
      );

      if (response.text) {
        return { text: response.text, model: modelName };
      }
    } catch (err: any) {
      lastError = err;
      if (isModelNotFoundError(err)) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('Gemini did not return text');
}

export function deriveFollowUpQuestions(query: string): string[] {
  const q = (query || '').toLowerCase();
  if (q.includes('cool flame') || q.includes('flex') || q.includes('250')) {
    return [
      'How do spacecraft sensors detect invisible cool flames?',
      'Can gaseous leaks in ISS ECLSS lines form cool flames (PSI-159)?',
      'What happens if cabin fans turn back on near a cool flame?',
    ];
  }
  if (q.includes('low-flow') || q.includes('low flow') || q.includes('bass') || q.includes('0.05')) {
    return [
      'Why does NASA shut down cabin ventilation during a spacecraft fire?',
      'How did NASA-STD-6001 Earth tests get material rankings wrong?',
      'Compare BASS-II small rods against the 1-meter Saffire-I burn',
    ];
  }
  if (q.includes('artemis') || q.includes('lunar') || q.includes('34%') || q.includes('saffire')) {
    return [
      'Why is partial gravity (1/6 g Moon) an unsolved combustion gap in PSI?',
      'How does Saffire-V emergency depressurization halt fire in 8 seconds?',
      'What wire insulation hazards were found in PSI-115 SoFIE MIST?',
    ];
  }
  if (q.includes('mir') || q.includes('apollo') || q.includes('extinguisher') || q.includes('mist')) {
    return [
      'Why do fine water mist extinguishers beat CO₂ horns in microgravity?',
      'How do SoFIE electrical wire insulation jets trigger before smoke alarms?',
      'Explain the Low-Flow Extinction Paradox in PSI-25 BASS-II',
    ];
  }
  return [
    'Why do microgravity flames turn spherical and blue instead of yellow?',
    'What caused cool flames to keep burning at 250°C in PSI-20 FLEX?',
    'Explain why 0.05 m/s airflow is the most dangerous speed in space',
  ];
}
