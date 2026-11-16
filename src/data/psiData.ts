import { PsiMission } from '../types';

export const PSI_MISSIONS: PsiMission[] = [
  {
    id: 'bass-1',
    acronym: 'BASS',
    name: 'Burning and Suppression of Solids',
    facility: 'ISS Microgravity Science Glovebox (MSG)',
    fuelType: 'PMMA (Acrylic), Cotton fabric, Nomex',
    summary: 'Investigated burning and extinction characteristics of various solid materials in microgravity with slow forced airflow.',
    keyFindings: [
      'Flames spread steadily against weak opposed flow down to 0.01 m/s.',
      'Soot shells form closer to the fuel surface in microgravity than in 1g.',
      'Extinction oxygen limits in 0g were significantly lower than Earth 1g tests (flames survived in lower O2).'
    ],
    relevanceToExploration: 'Proved NASA-STD-6001 upward flammability ranking misses materials that ignite and propagate under low microgravity airflow.',
    imageHint: 'Cylindrical PMMA rod burning with blue spherical envelope and trailing soot wake',
    dnaSimilarityScore: 92
  },
  {
    id: 'bass-2',
    acronym: 'BASS-II',
    name: 'Burning and Suppression of Solids II',
    facility: 'ISS Microgravity Science Glovebox (MSG)',
    fuelType: 'Thick and thin flat polymethyl methacrylate, composite fabrics',
    summary: 'Extended BASS with varied oxygen concentrations (14-30%) and flow rates to rigorously map spacecraft flammability boundaries.',
    keyFindings: [
      'Airflow speed strongly dictates flame survival: near-zero flow starves the flame by suffocation, while slight flow feeds fresh oxygen without buoyant blowout.',
      'Discovered low-flow extinction paradox where a critical breeze (0.05–0.1 m/s) maximizes fire risk.',
      'Extinguishment requires cutting rack ventilation immediately to induce self-smothering.'
    ],
    relevanceToExploration: 'Directly mandated the ISS flight rule to disable inter-module air loop ventilation immediately upon smoke detection.',
    imageHint: 'Flat fuel sample with infrared thermal camera map showing slow flame crawl',
    dnaSimilarityScore: 96
  },
  {
    id: 'saffire-1',
    acronym: 'Saffire-I',
    name: 'Spacecraft Fire Experiment I',
    facility: 'Uncrewed Cygnus Cargo Vehicle (OA-6 post-departure)',
    fuelType: 'Large cotton-fiberglass fabric blend sheet (0.4m x 1.0m)',
    summary: 'First realistic large-scale spacecraft fire conducted on an uncrewed cargo vehicle departing the ISS before atmospheric destructive re-entry.',
    keyFindings: [
      'Large cloth sheet burned slowly but steadily across its full 1-meter length.',
      'Flame spread speed was approximately 0.25 mm/s, much slower than 1g upward flame spread.',
      'Smoke and aerosol sensor timing data validated computational fluid dynamic (CFD) spacecraft safety models.'
    ],
    relevanceToExploration: 'Demonstrated large material sheets will sustain slow, stealthy fires in spacecraft ventilation channels.',
    imageHint: '1-meter long fabric sample ignited inside Cygnus flow duct with video telemetry',
    dnaSimilarityScore: 94
  },
  {
    id: 'saffire-3',
    acronym: 'Saffire-III',
    name: 'Spacecraft Fire Experiment III',
    facility: 'Cygnus OA-7 cargo vehicle',
    fuelType: 'Full-scale cotton/fiberglass composite fabric under varied airflow',
    summary: 'Repeated the large-sheet burn under higher flow velocities to measure heat release rate, cabin pressure fluctuations, and toxic gas buildup.',
    keyFindings: [
      'Cabin pressure and CO/CO2 levels rose measurably during the burn in sealed vehicle volume.',
      'Pressure transducer signatures could serve as a secondary early-warning fire indicator before optical smoke detectors trigger.',
      'Extinction achieved purely by oxygen depletion in sealed module.'
    ],
    relevanceToExploration: 'Informed environmental control and life support system (ECLSS) scrub recovery sizing for Orion and Gateway.',
    imageHint: 'High-speed imaging showing flame front propagation against forced convection',
    dnaSimilarityScore: 89
  },
  {
    id: 'flex-1',
    acronym: 'FLEX',
    name: 'Flame Extinguishment Experiment',
    facility: 'ISS Combustion Integrated Rack (CIR) / MDCA',
    fuelType: 'Heptane, Methanol, and Decane isolated droplets',
    summary: 'Examined droplet combustion and the physical limits of extinguishing droplet flames in microgravity.',
    keyFindings: [
      'Breakthrough discovery of "Cool Flames": after the visible hot flame extinguished at ~1400°C, chemical reactions continued invisibly at ~200-300°C without visible light!',
      'Cool flames continued to consume fuel until droplet exhaustion.',
      'Confirmed spherical symmetry of droplet vapor clouds in zero-gravity.'
    ],
    relevanceToExploration: 'Critical hazard alert: crew might declare "all clear" when invisible cool flames are still reacting and can reignite with fresh air!',
    imageHint: 'Spherical glowing droplet surrounded by cool blue chemiluminescence ring',
    dnaSimilarityScore: 98
  },
  {
    id: 'flex-2',
    acronym: 'FLEX-2',
    name: 'Flame Extinguishment Experiment 2',
    facility: 'ISS Combustion Integrated Rack (CIR)',
    fuelType: 'Multi-component hydrocarbon blends, droplet pairs, and soot shells',
    summary: 'Investigated droplet pairs and soot accumulation in microgravity cool flames and radiative extinction limits.',
    keyFindings: [
      'Soot shells form spherical cages around droplets due to lack of buoyant escape.',
      'Droplet interactions cause sudden flaring if fuel vapors merge.',
      'Fine water mist suppression cools the boundary layer below the cool flame kinetic threshold.'
    ],
    relevanceToExploration: 'Established baseline droplet suppression chemistry for Orion and Lunar Gateway PFE extinguishers.',
    imageHint: 'Concentric soot shells orbiting glowing droplet core in 0g',
    dnaSimilarityScore: 91
  },
  {
    id: 'acme-cfig',
    acronym: 'ACME CFI-G',
    name: 'Coflow Flame / Gaseous (ACME)',
    facility: 'ISS CIR / ACME Chamber',
    fuelType: 'Methane and Ethylene gaseous diffusion flames with nitrogen/CO2 diluents',
    summary: 'Analyzed spherical gaseous diffusion flame soot inception, radiative extinction, and cool diffusion flames sustained in microgravity.',
    keyFindings: [
      'Gaseous cool diffusion flames can burn stably without any buoyancy plume.',
      'Zero buoyant convection allows precise measurement of chemical kinetics otherwise masked by 1g gravity.',
      'Soot inception temperatures were 150K lower in 0g than in 1g.'
    ],
    relevanceToExploration: 'Led to breakthrough burner models for clean terrestrial power plants and future Mars in-situ fuel thrusters.',
    imageHint: 'Laminar spherical blue gas flame with precise laser diagnostics',
    dnaSimilarityScore: 88
  }
];

export const SPACE_FIRE_PARADOXES = [
  {
    title: 'The Low-Flow Extinction Paradox',
    category: 'Fluid Dynamics',
    status: 'Strongly Supported by BASS & Saffire',
    summary: 'In 1g, wind blows out a small flame. In 0g microgravity, a weak breeze (0.05 - 0.2 m/s) is required for the fire to survive. Complete stillness suffocates it in its own CO2, but turning off ventilation leaves pockets of air that can sustain quiet smoldering.',
    actionItem: 'Isolate module ventilation immediately, but recognize that crew movement creates air drafts that feed local flames.'
  },
  {
    title: 'Invisible Cool-Flame Re-ignition Hazard',
    category: 'Chemical Kinetics',
    status: 'Discovered on ISS (FLEX / CIR)',
    summary: 'After the visible flame appears extinguished (zero light, IR cooling), low-temperature chemical reactions (200-300°C) persist. Opening an equipment rack or introducing fresh O2 can cause violent, sudden hot reignition without warning.',
    actionItem: 'Never unseal a burned rack until compound gas analyzers confirm zero CO production and thermal sensors confirm room temperature.'
  },
  {
    title: 'NASA-STD-6001 Ranking Inversion',
    category: 'Material Safety',
    status: 'Active Investigation',
    summary: 'Materials rated non-flammable under standard NASA-STD-6001 Test 1 on Earth can become flammable in microgravity with low oxygen and elevated flow, or vice versa. Natural buoyancy on Earth accelerates heat away, while 0g keeps hot products enveloping the sample.',
    actionItem: 'Spacecraft materials require 0g and partial-gravity validation for Artemis lunar and Mars transit architectures.'
  },
  {
    title: 'Partial-Gravity (Moon & Mars) Smoldering Blindspot',
    category: 'Exploration Gap',
    status: 'High Research Priority',
    summary: 'At 1/6th g (Moon) and 3/8th g (Mars), buoyancy is weak but non-zero. Smoldering transitions to flaming fires faster under weak partial buoyancy than either pure 0g or 1g.',
    actionItem: 'Artemis surface habitat fire safety systems cannot assume ISS zero-g protocols; dedicated lunar drill procedures are required.'
  }
];

export const ISS_SOP_STEPS = [
  {
    step: 1,
    title: 'Fire Alarm & Emergency Notification',
    badge: 'Immediate Action',
    duration: '0-15s',
    action: 'Sound station klaxon, acknowledge master alarm, announce "FIRE FIRE FIRE" and specify module location over intercom to crew and Capcom (MCC-H / MCC-M).',
    protocolRef: 'ISS FDIR 1.102',
    icon: 'bell'
  },
  {
    step: 2,
    title: 'Don Personal Breathing Equipment (PBE)',
    badge: 'Crew Survival',
    duration: '15-45s',
    action: 'Each crewmember grabs and dons a PBE hood (providing 15+ minutes of positive-pressure breathing oxygen) to prevent inhalation of toxic HCN, CO, and fluorinated decomposition gases.',
    protocolRef: 'ISS ECLSS Emergency Book',
    icon: 'shield'
  },
  {
    step: 3,
    title: 'Isolate Module Ventilation & Electrical Breakers',
    badge: 'Mitigate Spread',
    duration: '45-90s',
    action: 'Command IMV (Inter-Module Ventilation) isolation valves closed to stop smoke spreading to neighboring modules. Flip power breakers on the affected rack to de-energize potential electrical ignition sources.',
    protocolRef: 'ISS EPS / C&T SOP 4.2',
    icon: 'zap-off'
  },
  {
    step: 4,
    title: 'Discharge Fire Extinguisher (PFE)',
    badge: 'Active Suppression',
    duration: '90-180s',
    action: 'Retrieve Portable Fire Extinguisher (PFE). For enclosed racks, insert the nozzle into the rack fire port and discharge fine water mist or CO2. Maintain seal to prevent toxic particulate back-splatter.',
    protocolRef: 'ISS Fire Response SOP 5.1',
    icon: 'flame'
  },
  {
    step: 5,
    title: 'Atmosphere Sampling & Toxic Gas Verification',
    badge: 'Hazard Assessment',
    duration: '3-10 min',
    action: 'Deploy compound-specific Dräeger tubes and the Air Quality Monitor (AQM) to measure carbon monoxide (CO), hydrogen cyanide (HCN), and hydrochloric acid (HCl) before anyone removes a PBE.',
    protocolRef: 'ISS Toxic Hazard Level (THL) 3',
    icon: 'gauge'
  },
  {
    step: 6,
    title: 'Post-Fire Scrubbing or Depress/Repress',
    badge: 'Recovery',
    duration: '15 min - 2 hrs',
    action: 'If atmosphere is cleanable, install emergency charcoal/catalytic scrubber cartridges into the cabin air loop. If contaminants exceed THL 4, seal module, initiate emergency depressurization to space vacuum, and repressurize from N2/O2 tanks.',
    protocolRef: 'ISS Depress Recovery SOP',
    icon: 'refresh'
  }
];
