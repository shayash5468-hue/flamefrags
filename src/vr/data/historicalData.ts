import { SpacecraftMissionData, SpacecraftId } from '../types.ts';

export const SPACECRAFT_MISSIONS: Record<SpacecraftId, SpacecraftMissionData> = {
  apollo1: {
    id: 'apollo1',
    name: 'Apollo 1 Command Module (CM-012)',
    shortName: 'Apollo 1 · 1967',
    year: 1967,
    missionDesignation: 'AS-204 (Apollo 1)',
    dateLabel: 'January 27, 1967 · 18:31 EST',
    agency: 'NASA',
    crew: [
      'Virgil "Gus" Grissom (Command Pilot)',
      'Edward H. White II (Senior Pilot)',
      'Roger B. Chaffee (Pilot)',
    ],
    overview:
      'During a "plugs-out" launch rehearsal inside Command Module 012 atop Saturn IB (SA-204) at Launch Complex 34, Cape Kennedy, an electrical fault ignited a rapid fire inside a pressurized 100% pure oxygen cabin.',
    historicalReferenceTitle:
      'NASA History: 55 Years Ago – The Apollo 1 Fire and Its Aftermath',
    historicalReferenceUrl:
      'https://www.nasa.gov/history/55-years-ago-the-apollo-1-fire-and-its-aftermath/',
    spawnPosition: [0, 1.5, 1.02],
    spawnLookAt: [0, 1.35, -0.55],
    boundsMin: [-1.55, 0.55, -1.35],
    boundsMax: [1.55, 2.35, 1.35],
    annotations: [
      {
        id: 'a1-wiring',
        number: 1,
        componentName: 'Lower Equipment Bay Wiring & ECS Plumbing',
        subsystem: 'Electrical Power & Environmental Control',
        anchorPosition: [-0.74, 0.98, -0.45],
        markerOffset: [0.16, 0.34, 0.14],
        focusCameraPosition: [-0.15, 1.38, 0.25],
        focusLookAt: [-0.74, 0.98, -0.45],
        historicalAccuracyNote:
          'NASA AS-204 Review Board identified a vulnerable wire bundle near the Environmental Control Unit in the left-hand lower equipment bay as the most probable ignition site, while noting that fire damage prevented absolute certainty on the exact initial spark point.',
        sourceLabel: 'NASA AS-204 Review Board / NASA History',
        sourceUrl:
          'https://www.nasa.gov/history/55-years-ago-the-apollo-1-fire-and-its-aftermath/',
        simple: {
          whatIsIt:
            'Bundles of electrical wires running beside coolant pipes and Environmental Control System (ECS) tubing beneath the crew couches.',
          whenDidItHappen:
            'January 27, 1967, at approximately 6:31 p.m. EST (23:31 UTC), during a simulated countdown test.',
          whatHappened:
            'A damaged electrical wire likely created a spark near flammable materials and coolant plumbing, starting a fire inside the cabin.',
          howDidItHappen:
            'Wires routed near moving equipment and sharp edges suffered insulation wear. When an electrical short occurred, the spark immediately found fuel and pure oxygen.',
          whyDidItHappen:
            'Silver-plated copper wiring lacked armored protection, was routed near glycol coolant pipes, and passed through crowded bays where technicians and crew moved around.',
          consequences:
            'The fire spread across the lower equipment bay and cabin within seconds, destroying internal systems and tragically claiming the lives of Grissom, White, and Chaffee.',
          howFixedOrAddressed:
            'Pad technicians and pad emergency crews fought intense heat and thick smoke for several minutes before forcing open the hatch, though the crew could not be saved.',
          howPrevented:
            'Block II Apollo Command Modules redesigned wiring harnesses with protective chafe guards, Teflon insulation, armor routing, and non-flammable coolant containment.',
          scientificLesson:
            'High-energy electrical routing must be physically isolated from flammable materials, fluid lines, and mechanical wear points.',
        },
        advanced: {
          whatIsIt:
            'Silver-plated copper Teflon-insulated power and instrumentation harnesses routed adjacent to the Environmental Control Unit (ECU) and ethylene-glycol/water coolant lines in the left-hand Lower Equipment Bay.',
          whenDidItHappen:
            'January 27, 1967, 23:30:55–23:31:04 UTC (18:30:55–18:31:04 EST), T-10 minutes hold in the plugs-out test.',
          whatHappened:
            'Telemetry showed momentary AC bus voltage anomalies seconds before Roger Chaffee and Edward White reported fire in the cockpit at 23:31:04.7 UTC.',
          howDidItHappen:
            'The AS-204 Review Board determined the most probable initiator was an electrical arc from a vulnerable wire bundle near the ECU where insulation had been abraded against a metal door edge or structural surface.',
          whyDidItHappen:
            'Over 1,100 engineering changes before test delivery, inadequate harness protection against mechanical abrasion, and proximity to combustible Velcro and coolant lines created multiple ignition pathways.',
          consequences:
            'Thermal breakdown of wire bundles caused rapid loss of telemetry and communications within ~17 seconds of first fire report as pressure surged past ~29 psi and ruptured the inner pressure hull.',
          howFixedOrAddressed:
            'Ground crews attempted rescue using CO2 extinguishers and breathing masks not rated for dense toxic smoke; fire containment occurred once hull rupture vented pressure and depleted oxygen.',
          howPrevented:
            'NASA implemented strict harness routing rules, 3D harness mockups, stainless-steel protective trays, solder-joint protection, and rigorous pre-test configuration freeze.',
          scientificLesson:
            'Electrical fault energy in oxygen-enriched atmospheres requires defense-in-depth: prevent abrasion, eliminate adjacent fuel, and isolate coolant chemicals.',
        },
      },
      {
        id: 'a1-atmosphere',
        number: 2,
        componentName: '100% Oxygen Cabin Atmosphere (16.7 psi)',
        subsystem: 'Environmental & Pressurization System',
        anchorPosition: [0, 1.55, -0.35],
        markerOffset: [0.35, 0.28, 0.08],
        focusCameraPosition: [0.15, 1.62, 0.55],
        focusLookAt: [0, 1.5, -0.35],
        historicalAccuracyNote:
          'Cabin atmosphere metrics (~16.7 psi, 100% O2 during pad tests) are directly established by NASA AS-204 technical records.',
        sourceLabel: 'NASA History – Apollo 1',
        sourceUrl:
          'https://www.nasa.gov/history/55-years-ago-the-apollo-1-fire-and-its-aftermath/',
        simple: {
          whatIsIt:
            'The breathable air mixture pumped into the Command Module during ground testing and launch preparations.',
          whenDidItHappen:
            'January 27, 1967, pressurized throughout the afternoon test until cabin rupture at 6:31 p.m. EST.',
          whatHappened:
            'The cabin was filled with pure 100% oxygen at higher-than-sea-level pressure, turning ordinary cabin materials into fast-burning fuel.',
          howDidItHappen:
            'In pure oxygen at 16.7 psi, materials that barely smolder in normal air (21% oxygen) ignite at much lower temperatures and burn explosively fast.',
          whyDidItHappen:
            'NASA used pure oxygen to keep spacecraft plumbing simple and match the lower-pressure 5 psi pure oxygen atmosphere used in orbit, without treating the 16.7 psi pad test as a severe fire hazard.',
          consequences:
            'A small electrical spark escalated into a high-temperature, high-pressure flash fire within ~15 seconds, rupturing the cabin wall.',
          howFixedOrAddressed:
            'After the fire, engineers immediately stopped using 100% oxygen for pressurized ground tests on the launch pad.',
          howPrevented:
            'NASA switched pad pressurization to a 60% oxygen / 40% nitrogen mixture for Block II Apollo launches, bleeding in pure oxygen only after reaching space.',
          scientificLesson:
            'Combustion rate depends heavily on oxygen partial pressure; high-pressure pure oxygen removes the safety buffer of nitrogen dilution.',
        },
        advanced: {
          whatIsIt:
            'Cabin pressurization system supplying 100% gaseous O2 at ~16.7 psia (~115 kPa, ~2 psi above ambient Cape Kennedy sea-level pressure to test structural sealing).',
          whenDidItHappen:
            'Cabin reached ~16.7 psia pure O2 prior to 23:31 UTC on January 27, 1967.',
          whatHappened:
            'Oxygen partial pressure was ~5.3 times higher than normal Earth sea-level air (~3.1 psia O2), creating an extreme oxidizing environment.',
          howDidItHappen:
            'Nitrogen normally acts as an inert thermal sink that absorbs combustion heat. Without nitrogen, flame temperatures soar, ignition activation energies drop, and flame-front propagation speed increases by an order of magnitude.',
          whyDidItHappen:
            'While NASA knew 100% O2 carried fire risk, the plugs-out test was misclassified as non-hazardous because no propellant or pyrotechnics were armed.',
          consequences:
            'Rapid combustion raised internal cabin pressure from 16.7 psi to ~29 psi within ~15 seconds, bursting the Command Module inner hull at 23:31:19 UTC.',
          howFixedOrAddressed:
            'The AS-204 Review Board recommended eliminating pure O2 on the pad and redefining any pressurized pure-oxygen test as high-hazard.',
          howPrevented:
            'Block II Command Modules launched with a 60% O2 / 40% N2 mix at 16.7 psia (reducing oxygen partial pressure while preventing nitrogen decompression sickness) before transitioning to 5 psia O2 in orbit.',
          scientificLesson:
            'Both oxygen concentration (%) and total pressure (psia) govern flammability limits; nitrogen dilution is critical during high-pressure ground operations.',
        },
      },
      {
        id: 'a1-hatch',
        number: 3,
        componentName: 'Inward-Opening Multi-Piece Hatch',
        subsystem: 'Crew Access & Pressure Structure',
        anchorPosition: [0, 1.98, 0.25],
        markerOffset: [-0.36, -0.1, -0.05],
        focusCameraPosition: [0.22, 1.5, 0.78],
        focusLookAt: [0, 1.98, 0.22],
        historicalAccuracyNote:
          'The Block I inward-opening hatch pressure-lock mechanism and ~90-second opening time are established in NASA AS-204 Review Board reports.',
        sourceLabel: 'NASA History – Apollo 1',
        sourceUrl:
          'https://www.nasa.gov/history/55-years-ago-the-apollo-1-fire-and-its-aftermath/',
        simple: {
          whatIsIt:
            'The multi-layer crew entry door located above the astronauts’ couches.',
          whenDidItHappen:
            'January 27, 1967, at 6:31 p.m. EST, when the crew attempted emergency egress.',
          whatHappened:
            'Because the inner hatch swung inward into the cabin, higher air pressure inside the burning spacecraft pushed the door tightly shut.',
          howDidItHappen:
            'Even in normal conditions, opening the three hatch layers took around 90 seconds with tools. As fire heated the cabin gas, pressure rose above outside air, clamping the inner hatch like a plug.',
          whyDidItHappen:
            'Engineers designed an inward-opening plug hatch to prevent accidental blowout in the vacuum of space (referencing the 1961 Mercury hatch incident), sacrificing rapid ground escape.',
          consequences:
            'The crew could not equalize pressure or unlatch the heavy inward hatch in time, and external rescue crews needed over five minutes to open all hatch layers.',
          howFixedOrAddressed:
            'Rescue crews outside the White Room unbolted the boost protective cover and outer hatch after heat and smoke cleared enough to approach.',
          howPrevented:
            'NASA designed a completely new single-piece outward-opening Block II Unified Hatch that could be unlatched and swung open in under 5 seconds.',
          scientificLesson:
            'Emergency egress designs must function reliably under worst-case internal overpressure, not only under nominal vacuum conditions.',
        },
        advanced: {
          whatIsIt:
            'Three-part Block I hatch assembly: inner crew pressure hatch (opening inward), outer ablative heat-shield hatch, and Boost Protective Cover hatch.',
          whenDidItHappen:
            'Between 23:31:04 UTC (fire report) and 23:36 UTC (pad crew opening of inner hatch).',
          whatHappened:
            'Crew center-couch astronaut Ed White attempted to open the inner hatch per emergency procedures, but cabin overpressure pinned it against the frame seal.',
          howDidItHappen:
            'A cabin pressure differential ΔP of just +2 psi across a ~0.5 m² hatch produces thousands of newtons of clamping force. As fire raised ΔP toward ~14 psi above ambient, manual inward retraction became physically impossible.',
          whyDidItHappen:
            'Design priority favored fail-safe space pressure retention (inward plug) over rapid pad egress; emergency vent valves could not dump pressure faster than thermal gas expansion.',
          consequences:
            'Zero rapid egress capability on the launch pad; toxic smoke inhalation and thermal trauma occurred before pad workers could breach the outer covers.',
          howFixedOrAddressed:
            'AS-204 Review Board mandated replacement of the three-piece inward system with a quick-release outward hatch.',
          howPrevented:
            'The Block II Unified Hatch used a nitrogen-powered counterbalance and over-center toggle latches, allowing full outward opening in 3–5 seconds even with slight internal pressure.',
          scientificLesson:
            'Safety designs solving one failure mode (in-flight depressurization) must be analyzed across all mission phases (ground pressurization emergencies).',
        },
      },
      {
        id: 'a1-materials',
        number: 4,
        componentName: 'Flammable Cabin Materials (Velcro & Nylon Netting)',
        subsystem: 'Crew Compartment Interior',
        anchorPosition: [0.68, 1.32, -0.3],
        markerOffset: [-0.22, 0.26, 0.14],
        focusCameraPosition: [0.1, 1.42, 0.48],
        focusLookAt: [0.68, 1.32, -0.3],
        historicalAccuracyNote:
          'Extensive use of nylon netting, Velcro, polyurethane foam, and non-fireproof materials in CM-012 is documented in the NASA AS-204 investigation.',
        sourceLabel: 'NASA History – Apollo 1',
        sourceUrl:
          'https://www.nasa.gov/history/55-years-ago-the-apollo-1-fire-and-its-aftermath/',
        simple: {
          whatIsIt:
            'Storage nets, Velcro strips, foam pads, and equipment liners lining the spacecraft cabin walls.',
          whenDidItHappen:
            'January 27, 1967, immediately fueling the spread of fire across the cabin.',
          whatHappened:
            'More than 70 pounds of flammable fabrics, plastics, and Velcro inside the cabin acted as rapid kindling once ignited.',
          howDidItHappen:
            'Nylon netting stretched across bays gave flames continuous pathways to leap across the cabin, melting and dripping burning material.',
          whyDidItHappen:
            'Materials were tested in air or low-pressure oxygen rather than 16.7 psi pure oxygen, and loose Velcro strips were added extensively for zero-gravity convenience.',
          consequences:
            'The fire consumed cabin interiors in seconds and released dense toxic carbon monoxide and smoke.',
          howFixedOrAddressed:
            'NASA cataloged and removed thousands of flammable items from future Apollo capsules.',
          howPrevented:
            'Engineers invented and adopted fireproof fiberglass Beta cloth, Fluorel elastomers, and fire-resistant suit outer layers across Block II spacecraft.',
          scientificLesson:
            'Every non-metallic material inside a sealed crewed habitat must be tested for flammability and toxic off-gassing at maximum worst-case oxygen pressure.',
        },
        advanced: {
          whatIsIt:
            'Raschel nylon debris netting, nylon Velcro hook-and-loop fasteners (~34 sq ft), polyurethane foam cushions, and nylon spacesuit outer layers.',
          whenDidItHappen:
            'Combusted rapidly between 23:31:04 and 23:31:20 UTC on January 27, 1967.',
          whatHappened:
            'Once ignited, nylon netting and Velcro propagated the flame front horizontally and vertically across all three crew stations.',
          howDidItHappen:
            'High surface-area-to-mass mesh fabrics vaporize rapidly under radiant heat; in 16.7 psia O2, molten nylon drips ignited secondary pools below the couches.',
          whyDidItHappen:
            'Incomplete flammability standards (materials were not consistently qualified at 16.5+ psia 100% O2) and unchecked addition of operational Velcro pads.',
          consequences:
            'Massive heat release rate (~MW-scale flashover inside a ~6 m³ volume) and lethal carbon monoxide / toxic pyrolysis gases.',
          howFixedOrAddressed:
            'NASA created a strict Materials Control Board to test every polymer, adhesive, and fabric at 16.5 psia pure oxygen.',
          howPrevented:
            'Replacement with woven silica-glass Beta cloth (melting point >1,500°F), Fluorel fluorocarbon foams, anodized metal covers, and A7L spacesuits with Beta-cloth outer layers.',
          scientificLesson:
            'Material flammability is a system-level property governed by geometry (mesh vs. solid), atmosphere, and adjacent ignition pathways.',
        },
      },
    ],
    timeline: [
      {
        id: 'a1-step-1',
        stepNumber: 1,
        phaseLabel: 'Before the Incident',
        title: 'Plugs-Out Test at 16.7 psi Pure Oxygen',
        timestamp: 'Jan 27, 1967 · 13:00–18:30 EST',
        summary:
          'CM-012 sits atop an unfueled Saturn IB at Pad 34. The hatch is sealed and the cabin is pressurized to 16.7 psi with 100% pure oxygen.',
        scientificMechanism:
          'At 16.7 psi pure O2, oxygen partial pressure is >5× Earth air. Without nitrogen to absorb heat, ordinary plastics and nylon become highly flammable.',
        distinctionLabel: 'Historical Reconstruction',
        distinctionNote:
          'Cabin pressure (16.7 psia) and test timeline are directly recorded in NASA AS-204 logs.',
        focusAnnotationId: 'a1-atmosphere',
        visualState: 'precondition',
        cameraPosition: [0.15, 1.58, 0.72],
        cameraLookAt: [0, 1.42, -0.4],
      },
      {
        id: 'a1-step-2',
        stepNumber: 2,
        phaseLabel: 'Initial Event',
        title: 'Electrical Fault in Lower Equipment Bay',
        timestamp: '18:30:54 – 18:31:04 EST',
        summary:
          'Telemetry registers an AC bus voltage fluctuation. Seconds later, the crew reports fire inside the cockpit.',
        scientificMechanism:
          'The AS-204 Review Board found a vulnerable silver-plated wire bundle near coolant plumbing as the probable arc origin, igniting nearby nylon/Velcro.',
        distinctionLabel: 'Simplified Educational Animation',
        distinctionNote:
          'The exact wire strand that sparked was destroyed by fire; animation depicts the probable ECU bay region identified by NASA.',
        focusAnnotationId: 'a1-wiring',
        visualState: 'ignition',
        cameraPosition: [-0.15, 1.38, 0.25],
        cameraLookAt: [-0.74, 0.98, -0.45],
      },
      {
        id: 'a1-step-3',
        stepNumber: 3,
        phaseLabel: 'Problem Development',
        title: 'Rapid Flashover & Hatch Pressure Lock',
        timestamp: '18:31:04 – 18:31:19 EST',
        summary:
          'Fed by pure O2 and nylon netting, flames engulf the cabin. Heated gas pushes internal pressure to ~29 psi, pinning the inward-opening hatch.',
        scientificMechanism:
          'Thermal expansion drives cabin pressure higher than outside air, applying tons of clamping force against the inward plug hatch before the pressure hull ruptures.',
        distinctionLabel: 'Simplified Educational Animation',
        distinctionNote:
          'Heat plume and force vectors simplify the complex fluid-combustion dynamics inside the ~6 m³ cabin.',
        focusAnnotationId: 'a1-hatch',
        visualState: 'escalation',
        cameraPosition: [0.22, 1.5, 0.78],
        cameraLookAt: [0, 1.85, 0.1],
      },
      {
        id: 'a1-step-4',
        stepNumber: 4,
        phaseLabel: 'Crew & Ground Response',
        title: 'Emergency Egress Attempt & Pad Rescue',
        timestamp: '18:31:19 – 18:36 EST',
        summary:
          'Crew attempts to unlatch the multi-piece inward hatch while pad technicians rush into dense smoke with unsuited respirators.',
        scientificMechanism:
          'Even without fire, opening the 3-part hatch took ~90 seconds. Intense smoke, ruptured hull heat, and bolted outer covers delayed pad entry by over 5 minutes.',
        distinctionLabel: 'Historical Reconstruction',
        distinctionNote:
          'Based on pad rescue timelines and communication recordings documented by NASA.',
        focusAnnotationId: 'a1-hatch',
        visualState: 'response',
        cameraPosition: [0, 1.55, 0.95],
        cameraLookAt: [0, 1.9, 0.22],
      },
      {
        id: 'a1-step-5',
        stepNumber: 5,
        phaseLabel: 'Final Outcome',
        title: 'Loss of Crew & Mission Pause',
        timestamp: 'Jan 27, 1967 · Evening',
        summary:
          'Gus Grissom, Ed White, and Roger Chaffee perish from smoke inhalation and thermal trauma. NASA halts crewed launches for 21 months.',
        scientificMechanism:
          'Combustion of polyurethane and nylon in oxygen-rich confinement produces lethal concentrations of carbon monoxide within seconds.',
        distinctionLabel: 'Historical Reconstruction',
        distinctionNote:
          'Presented respectfully without graphic imagery per NASA archival records.',
        focusAnnotationId: 'a1-materials',
        visualState: 'outcome',
        cameraPosition: [0, 1.48, 0.92],
        cameraLookAt: [0, 1.35, -0.55],
      },
      {
        id: 'a1-step-6',
        stepNumber: 6,
        phaseLabel: 'Engineering Improvements',
        title: 'Block II Safety Overhaul (Unified Hatch & Beta Cloth)',
        timestamp: '1967–1968 Redesign',
        summary:
          'NASA introduces an outward-opening quick-release hatch (<5s), 60/40 O2/N2 pad mix, armored wiring, and fireproof Beta cloth.',
        scientificMechanism:
          'Eliminating pure O2 on the pad restores nitrogen thermal damping; outward over-center latches prevent pressure lock; silica-glass Beta cloth resists ignition.',
        distinctionLabel: 'Historical Reconstruction',
        distinctionNote:
          'Reflects verified Block II Apollo Command Module engineering modifications.',
        focusAnnotationId: 'a1-hatch',
        visualState: 'upgraded',
        cameraPosition: [0.22, 1.55, 0.85],
        cameraLookAt: [0, 1.68, -0.15],
      },
    ],
    comparisons: [
      {
        id: 'a1-comp-hatch',
        system: 'Crew Hatch Design',
        beforeTitle: 'Block I: 3-Piece Inward Plug Hatch',
        beforeSummary:
          'Opened inward into the cabin; required ~90 seconds under normal conditions and locked shut under internal cabin overpressure.',
        afterTitle: 'Block II: Outward Quick-Release Unified Hatch',
        afterSummary:
          'Single-piece outward-swinging hatch with gas-counterbalanced mechanism that opens in under 5 seconds.',
        engineeringImpact:
          'Restored reliable emergency pad egress without compromising vacuum sealing in orbit.',
      },
      {
        id: 'a1-comp-atm',
        system: 'Launch Pad Atmosphere',
        beforeTitle: '100% Pure Oxygen at 16.7 psia',
        beforeSummary:
          'Eliminated nitrogen thermal sink; dramatically reduced ignition energy and accelerated flame spread.',
        afterTitle: '60% Oxygen / 40% Nitrogen Mix on Pad',
        afterSummary:
          'Maintained safe nitrogen dilution during high-pressure ground tests, transitioning to 5 psia O2 only after ascent.',
        engineeringImpact:
          'Reduced ground fire propagation speeds to manageable levels comparable to sea-level air.',
      },
      {
        id: 'a1-comp-mat',
        system: 'Cabin Materials & Wiring',
        beforeTitle: 'Exposed Nylon Netting, Velcro & Unarmored Bundles',
        beforeSummary:
          'Over 70 lbs of combustible polymers and exposed harnesses routed near glycol plumbing.',
        afterTitle: 'Beta Cloth, Fluorel & Armored Harnesses',
        afterSummary:
          'Non-flammable woven fiberglass fabrics, Fluorel foam, and protective stainless-steel wire trays.',
        engineeringImpact:
          'Removed continuous fuel pathways and protected power wiring against abrasion.',
      },
    ],
  },

  apollo13: {
    id: 'apollo13',
    name: 'Apollo 13 (Odyssey · SM Bay 4 · Aquarius)',
    shortName: 'Apollo 13 · 1970',
    year: 1970,
    missionDesignation: 'AS-508 (Apollo 13)',
    dateLabel: 'April 13, 1970 · 55:54:53 GET',
    agency: 'NASA',
    crew: [
      'James A. Lovell Jr. (Commander)',
      'John L. Swigert Jr. (Command Module Pilot)',
      'Fred W. Haise Jr. (Lunar Module Pilot)',
    ],
    overview:
      'At 55 hours 54 minutes into the lunar flight, Cryogenic Oxygen Tank No. 2 in Service Module Bay 4 ruptured, crippling Odyssey’s fuel cells and electrical power and forcing the crew into Lunar Module Aquarius as a four-day lifeboat.',
    historicalReferenceTitle:
      'NASA History: 50 Years Ago – Apollo 13 Review Board Report',
    historicalReferenceUrl:
      'https://www.nasa.gov/history/50-years-ago-apollo-13-review-board-report/',
    spawnPosition: [0.22, 1.48, 1.28],
    spawnLookAt: [0, 1.36, -0.55],
    boundsMin: [-2.1, 0.4, -2.5],
    boundsMax: [2.1, 2.5, 2.3],
    annotations: [
      {
        id: 'a13-o2tank2',
        number: 1,
        componentName: 'Service Module Cryogenic Oxygen Tank No. 2 (Bay 4)',
        subsystem: 'Cryogenic Oxygen Storage System',
        anchorPosition: [-0.92, 1.15, -0.82],
        markerOffset: [-0.28, 0.42, 0.18],
        focusCameraPosition: [-0.15, 1.48, 0.42],
        focusLookAt: [-0.92, 1.15, -0.82],
        historicalAccuracyNote:
          'The spatial cutaway combines Service Module Bay 4 directly behind the Command Module cabin for educational inspection; the tank’s 65V heater thermostatic switch failure and Teflon wire fire are directly documented in the NASA Apollo 13 Review Board Report.',
        sourceLabel: 'NASA Apollo 13 Review Board Report (Cortright Commission)',
        sourceUrl:
          'https://www.nasa.gov/history/50-years-ago-apollo-13-review-board-report/',
        simple: {
          whatIsIt:
            'An insulated spherical tank in the Service Module storing super-cold liquid/supercritical oxygen for breathing and electricity-producing fuel cells.',
          whenDidItHappen:
            'April 13, 1970, at 55 hours 54 minutes 53 seconds Mission Elapsed Time (~9:07 p.m. CST), ~321,860 km from Earth.',
          whatHappened:
            'When the crew switched on an internal stirring fan, damaged wire insulation inside Oxygen Tank 2 caught fire, overheating the oxygen until the tank burst and blew off the outer Bay 4 panel.',
          howDidItHappen:
            'Weeks earlier on the launch pad, engineers used a 65-volt power supply to boil off trapped oxygen inside the tank. The tank’s safety thermostat switches were only rated for 28 volts, so they welded shut, letting heaters exceed ~1,000°F and melt Teflon wire insulation.',
          whyDidItHappen:
            'A combination of a tank drop during factory handling (damaging the fill tube), an unnoticed mismatch between 65V ground equipment and 28V switches, and an inaccurate heater temperature gauge.',
          consequences:
            'Tank 2 ruptured violently, also damaging Tank 1 and starving the Service Module of oxygen, electricity, and water.',
          howFixedOrAddressed:
            'The crew shut down the dying Command Module and moved into the attached Lunar Module Aquarius to survive the return trip around the Moon.',
          howPrevented:
            'For Apollo 14+, NASA added a third isolated oxygen tank, removed internal stirring fans and fragile thermostatic switches from inside the tanks, and sheathed internal wires in stainless steel.',
          scientificLesson:
            'Changes to ground-test procedures or power supplies must be re-verified against every internal component rating, especially inside sealed pressure vessels.',
        },
        advanced: {
          whatIsIt:
            'Supercritical cryogenic O2 storage vessel (~320 lb capacity at ~900 psi, -297°F) containing dual heater tubes, two thermostatic switches, quantity probe, and two motor-driven destratification fans.',
          whenDidItHappen:
            'April 13, 1970, 55:54:53.5 GET (April 14, 03:07:53 UTC), ~16 seconds after initiating the standard cryo-stir procedure.',
          whatHappened:
            'Electrical arcing from stripped Teflon-insulated fan motor leads ignited the Teflon in supercritical ~900 psi oxygen, causing rapid pressure excursion that ruptured the Inconel dome and ejected the Bay 4 aluminum honeycomb panel.',
          howDidItHappen:
            'After an unrecorded factory drop misaligned the drain tube, pad detanking failed; operators ran the tank heaters on 65V DC ground power for 8 hours. The 28V-rated bimetallic switches welded shut under 65V arc current, allowing internal temperatures to reach ~1,000°F and degrade FEP Teflon insulation while the external gauge pegged at its 85°F maximum.',
          whyDidItHappen:
            'Systemic communication gaps across contractor, pad operations, and sensor design: the 1965 switch upgrade to 65V was missed in Tank 2’s assembly, and telemetry temperature limit masked overheating.',
          consequences:
            'Complete loss of O2 Tank 2, severe leak in O2 Tank 1 valve/line, shock shutdown of Fuel Cells 1 & 3, and structural damage to SM Sector 4.',
          howFixedOrAddressed:
            'With SM unrecoverable, Mission Control and crew preserved CM re-entry batteries, performed a Lunar Module DPS free-return burn, and powered down non-essential systems to ~12 amps.',
          howPrevented:
            'Apollo 14 introduced a third O2 tank in SM Bay 1, eliminated motorized stir fans (relying on thermal convection/slosh), upgraded wiring to stainless-steel-sheathed conductors, and added a 400-amp-hour auxiliary SM battery.',
          scientificLesson:
            'Sealed hazardous components should minimize internal electrical/mechanical ignition sources; telemetry ranges must cover off-nominal thermal fault regimes.',
        },
      },
      {
        id: 'a13-fuelcells',
        number: 2,
        componentName: 'Service Module Fuel Cells & Main Electrical Buses',
        subsystem: 'Electrical Power Generation',
        anchorPosition: [-0.72, 1.56, -0.58],
        markerOffset: [0.3, 0.25, 0.16],
        focusCameraPosition: [0.1, 1.62, 0.45],
        focusLookAt: [-0.72, 1.56, -0.58],
        historicalAccuracyNote:
          'Loss of Fuel Cells 1 and 3 at impact and depletion of Fuel Cell 2 over ~2 hours is established in Apollo 13 telemetry.',
        sourceLabel: 'NASA Apollo 13 Review Board Report',
        sourceUrl:
          'https://www.nasa.gov/history/50-years-ago-apollo-13-review-board-report/',
        simple: {
          whatIsIt:
            'Three power plants in the Service Module that combined oxygen and hydrogen to make electricity and drinking water for the Command Module.',
          whenDidItHappen:
            'April 13, 1970, immediately after the 55:54:53 GET explosion through ~58:00 GET.',
          whatHappened:
            'The shock knocked out Fuel Cells 1 and 3 right away, and Fuel Cell 2 died about two hours later as the remaining oxygen leaked into space.',
          howDidItHappen:
            'Without oxygen from Tanks 1 and 2, the fuel cells could no longer run the chemical reaction that generated electrical power.',
          whyDidItHappen:
            'All three fuel cells shared oxygen supplied by the two adjacent tanks in Sector 4 with no isolated backup tank or auxiliary Service Module battery.',
          consequences:
            'The Command Module lost its main power supply, heating, and life support—leaving only small re-entry batteries needed for splashdown.',
          howFixedOrAddressed:
            'Swigert and Mission Control powered down Odyssey completely to save its re-entry batteries and routed a small trickle back up from the Lunar Module later.',
          howPrevented:
            'NASA added an isolated third oxygen tank and a dedicated backup battery in another Service Module bay for subsequent Apollo missions.',
          scientificLesson:
            'Redundant power generators fail simultaneously if they share a single vulnerable fuel or oxidizer manifold.',
        },
        advanced: {
          whatIsIt:
            'Three Pratt & Whitney Bacon-type alkaline hydrogen-oxygen fuel cells (28V DC) feeding Main Buses A and B, coupled to CM entry silver-zinc batteries.',
          whenDidItHappen:
            'Fuel Cells 1 & 3 failed at ~55:55–55:57 GET (Main Bus B undervoltage); Fuel Cell 2 failed at ~58:07 GET when O2 Tank 1 depleted.',
          whatHappened:
            'Shock loading closed reactant shutoff valves on Fuel Cells 1 & 3; O2 Tank 1 pressure bled steadily to zero over 130 minutes, collapsing the last fuel cell.',
          howDidItHappen:
            'Fuel cells convert H2 + 1/2 O2 -> H2O + electricity. Once O2 manifold pressure dropped below ~40 psi, electrochemical output ceased, dropping Main Bus voltages.',
          whyDidItHappen:
            'Lack of physical separation between Cryo O2 Tanks 1 & 2 and lack of an independent SM auxiliary battery left zero margin for Sector 4 containment failure.',
          consequences:
            'CM Odyssey had to be completely powered down before re-entry battery depletion; cabin temperature fell to ~38°F (3°C).',
          howFixedOrAddressed:
            'Mission Control devised a reverse power transfer procedure ("LM-to-CM umbilical jumper") to recharge CM entry batteries and power Odyssey back up from cold soak.',
          howPrevented:
            'Installed an isolated third cryo O2 tank (Bay 1) with an isolation valve separating it from Tanks 1 & 2, plus a 400 Ah auxiliary battery in Bay 4.',
          scientificLesson:
            'True redundancy requires physical separation and isolation valves so a single-bay energetic failure cannot propagate across all redundant channels.',
        },
      },
      {
        id: 'a13-cm',
        number: 3,
        componentName: 'Command Module "Odyssey" Control Console',
        subsystem: 'Command & Navigation Avionics',
        anchorPosition: [0.05, 1.32, -0.38],
        markerOffset: [0.32, 0.24, 0.22],
        focusCameraPosition: [0.15, 1.48, 0.45],
        focusLookAt: [0.05, 1.32, -0.38],
        historicalAccuracyNote:
          'Main Bus B alarms, cryo quantity drops, and full CM power-down/power-up checklist development are verified in Apollo 13 mission transcripts.',
        sourceLabel: 'NASA Apollo 13 Review Board Report',
        sourceUrl:
          'https://www.nasa.gov/history/50-years-ago-apollo-13-review-board-report/',
        simple: {
          whatIsIt:
            'The main cockpit instrument panel of the Command Module where the astronauts monitored power, oxygen, and guidance.',
          whenDidItHappen:
            'April 13–17, 1970, powered down shortly after the explosion and restarted hours before Earth splashdown.',
          whatHappened:
            'Warning lights flashed across the console as power failed; the crew had to copy navigation coordinates to the Lunar Module before turning Odyssey completely off.',
          howDidItHappen:
            'With fuel cells dying, keeping Odyssey’s computers and heaters running would drain the small batteries needed to steer through Earth’s atmosphere.',
          whyDidItHappen:
            'Command Module re-entry batteries were only sized for the final few hours of descent, not a multi-day return from the Moon.',
          consequences:
            'Odyssey became dark, silent, and freezing (~38°F), causing heavy water condensation inside the cabin—though powered-down switches stayed safe until restart.',
          howFixedOrAddressed:
            'Engineers in Houston spent three days writing and testing an emergency cold-start power-up sequence under strict amp limits.',
          howPrevented:
            'Future Command Modules added extra backup power capacity and updated contingency checklists for cross-vehicle power sharing.',
          scientificLesson:
            'Preserving critical end-of-mission reserves (like re-entry power) requires decisive early shutdown of primary systems during an anomaly.',
        },
        advanced: {
          whatIsIt:
            'Apollo CM Main Display Console (MDC) housing the Apollo Guidance Computer (AGC/DSKY), EPS Bus monitoring, Cryo O2/H2 gauges, and Caution & Warning matrix.',
          whenDidItHappen:
            'Master Alarm triggered at 55:54:55 GET; CM powered down by ~58:40 GET; cold-start power-up began ~138:00 GET on April 17, 1970.',
          whatHappened:
            'Swigert transferred IMU alignment gimbal angles to Aquarius before shutting down the AGC, heaters, and displays to preserve CM Entry Batteries A, B, and C.',
          howDidItHappen:
            'Low-power survival required shedding ~60 amps of CM load down to zero while conserving ~12 amps in the LM to ensure enough amp-hours remained for CM separation and atmospheric entry.',
          whyDidItHappen:
            'Heavy condensation formed on cold ~38°F panels; engineers feared moisture could short-circuit avionics upon re-energization.',
          consequences:
            'Successful cold restart on April 17 without electrical shorts thanks to Block II Apollo 1 conformal moisture coatings and wire sealing!',
          howFixedOrAddressed:
            'Ground simulators verified a step-by-step power-up order keeping peak draw below battery limits; Apollo 1’s waterproofing upgrades ironically saved Apollo 13.',
          howPrevented:
            'Enhanced cross-tie power transfer hardware and formalized cryogenic failure checklists.',
          scientificLesson:
            'Safety upgrades from prior tragedies (Apollo 1 moisture-sealing and non-flammable harness standards) directly enabled Odyssey’s cold-soak survival.',
        },
      },
      {
        id: 'a13-lm',
        number: 4,
        componentName: 'Lunar Module "Aquarius" Lifeboat & CO2 "Mailbox"',
        subsystem: 'Life Support & Emergency Habitation',
        anchorPosition: [0.88, 1.38, 0.28],
        markerOffset: [-0.26, 0.34, -0.05],
        focusCameraPosition: [0.12, 1.48, 0.88],
        focusLookAt: [0.88, 1.38, 0.28],
        historicalAccuracyNote:
          'Aquarius is shown docked via the forward tunnel for integrated spatial inspection; the square-to-round LiOH "mailbox" scrubber adaptation is a verified historical artifact.',
        sourceLabel: 'NASA Apollo 13 Review Board Report',
        sourceUrl:
          'https://www.nasa.gov/history/50-years-ago-apollo-13-review-board-report/',
        simple: {
          whatIsIt:
            'The two-person Lunar Module attached to the nose of Odyssey, converted into a three-person emergency lifeboat, plus the improvised CO2 filter adapter.',
          whenDidItHappen:
            'April 13–17, 1970 (~83 hours of emergency lifeboat operation).',
          whatHappened:
            'Aquarius provided oxygen, power, and rocket thrust to bring the crew home—but its round air-scrubbing canisters ran low while toxic carbon dioxide rose.',
          howDidItHappen:
            'The Command Module had plenty of square lithium hydroxide (LiOH) canisters left, but they did not fit the Lunar Module’s round filter sockets.',
          whyDidItHappen:
            'The two spacecraft were built by different contractors (North American and Grumman) and never designed to swap air-filter cartridges.',
          consequences:
            'CO2 levels climbed toward dangerous limits (~15 mmHg) until engineers on Earth designed a working adapter from items aboard the spacecraft.',
          howFixedOrAddressed:
            'Using flight plan plastic covers, cardboard, spare suit hoses, plastic bags, and gray duct tape, the crew built the "mailbox" adapter, dropping CO2 back to safe levels.',
          howPrevented:
            'NASA standardized interface hardware and added additional water and power margins to subsequent Lunar Modules.',
          scientificLesson:
            'Standardizing consumable hardware interfaces across docked spacecraft provides life-saving cross-vehicle resilience.',
        },
        advanced: {
          whatIsIt:
            'Grumman LM-7 Environmental Control System (ECS) with circular LiOH cartridges, paired via improvised ducting ("mailbox") to North American square CM LiOH canisters.',
          whenDidItHappen:
            'CO2 reached critical threshold (~15 mmHg partial pressure) around April 15 (~88:00 GET) before improvised scrubber deployment.',
          whatHappened:
            'Three crew members exhaled ~50% more CO2 than the two-person 45-hour LM ECS baseline was sized for, exhausting round LM LiOH canisters mid-return.',
          howDidItHappen:
            'LiOH removes exhaled CO2 via 2 LiOH + CO2 -> Li2CO3 + H2O. Houston’s Crew Systems Division prototyped an airtight manifold forcing LM suit-fan airflow through square CM canisters using cue cards, thermal bags, hoses, and tape.',
          whyDidItHappen:
            'Independent contractor specifications produced incompatible form factors for chemically identical LiOH scrubbers across CM and LM.',
          consequences:
            'Within hours of installing the mailbox adapter, cabin CO2 partial pressure dropped from ~15 mmHg down to safe ~0.1–2 mmHg levels.',
          howFixedOrAddressed:
            'Crews operated Aquarius at minimal 12A electrical load, conserved water down to ~6 oz/day per astronaut, and executed manual mid-course burns using the LM Descent Propulsion System.',
          howPrevented:
            'NASA standardized emergency transfer procedures, added potable water reserves in LM-8+, and established cross-vehicle consumable compatibility audits.',
          scientificLesson:
            'Cross-module interoperability of basic life-support consumables turns separate spacecraft modules into true mutual rescue assets.',
        },
      },
    ],
    timeline: [
      {
        id: 'a13-step-1',
        stepNumber: 1,
        phaseLabel: 'Before the Incident',
        title: 'Pad Detanking Damage & Nominal Cruise',
        timestamp: 'March 1970 (Pad) – April 13, 1970',
        summary:
          'During pre-launch testing, 65V ground power welded Tank 2’s 28V thermostat switches closed, charring internal Teflon wire insulation unseen.',
        scientificMechanism:
          'Heaters inside Tank 2 reached ~1,000°F while the temperature sensor read max 85°F, leaving bare electrical conductors submerged in supercritical liquid oxygen.',
        distinctionLabel: 'Simplified Educational Animation',
        distinctionNote:
          'Internal cutaway visualizes the Review Board’s thermal switch & Teflon failure reconstruction.',
        focusAnnotationId: 'a13-o2tank2',
        visualState: 'precondition',
        cameraPosition: [-0.15, 1.48, 0.42],
        cameraLookAt: [-0.92, 1.15, -0.82],
      },
      {
        id: 'a13-step-2',
        stepNumber: 2,
        phaseLabel: 'Initial Event',
        title: 'Cryo Stir Fan Activation Sparks Tank 2 Rupture',
        timestamp: 'April 13, 1970 · 55:54:53 GET',
        summary:
          'Swigert toggles the cryo fan switches. Sixteen seconds later, an electrical short ignites Teflon inside Tank 2, blowing off SM Bay 4.',
        scientificMechanism:
          'Arc energy in ~900 psi supercritical O2 rapidly combusts Teflon insulation, driving internal pressure past burst limits and venting gas into Bay 4.',
        distinctionLabel: 'Simplified Educational Animation',
        distinctionNote:
          'Shows the internal arc, pressure surge, and Bay 4 panel separation sequence.',
        focusAnnotationId: 'a13-o2tank2',
        visualState: 'ignition',
        cameraPosition: [-0.08, 1.48, 0.55],
        cameraLookAt: [-0.92, 1.15, -0.82],
      },
      {
        id: 'a13-step-3',
        stepNumber: 3,
        phaseLabel: 'Problem Development',
        title: 'Fuel Cell Collapse & Main Bus Loss',
        timestamp: '55:55 – 58:07 GET',
        summary:
          'Fuel Cells 1 & 3 fail immediately; Tank 1 bleeds oxygen into space, forcing shutdown of Odyssey’s last fuel cell and main power.',
        scientificMechanism:
          'With O2 supply depleted, hydrogen-oxygen electrochemical reaction halts. Odyssey must shut down completely to preserve re-entry batteries.',
        distinctionLabel: 'Historical Reconstruction',
        distinctionNote:
          'Directly matches Apollo 13 telemetry of Main Bus B undervoltage and Fuel Cell 2 depletion.',
        focusAnnotationId: 'a13-fuelcells',
        visualState: 'escalation',
        cameraPosition: [0.1, 1.62, 0.45],
        cameraLookAt: [-0.72, 1.56, -0.58],
      },
      {
        id: 'a13-step-4',
        stepNumber: 4,
        phaseLabel: 'Crew & Ground Response',
        title: 'LM Aquarius Lifeboat & "Mailbox" CO2 Scrubber',
        timestamp: 'April 14–16, 1970',
        summary:
          'Crew powers down Odyssey, moves into Aquarius, rations power to ~12A, and builds the square-to-round "mailbox" CO2 adapter.',
        scientificMechanism:
          'Suit fan airflow is forced through square CM LiOH cartridges using cardboard, bags, and tape, chemically scrubbing exhaled CO2 (2LiOH + CO2 -> Li2CO3 + H2O).',
        distinctionLabel: 'Historical Reconstruction',
        distinctionNote:
          'Depicts the verified LM lifeboat habitation and improvised LiOH manifold.',
        focusAnnotationId: 'a13-lm',
        visualState: 'response',
        cameraPosition: [0.12, 1.48, 0.88],
        cameraLookAt: [0.88, 1.38, 0.28],
      },
      {
        id: 'a13-step-5',
        stepNumber: 5,
        phaseLabel: 'Final Outcome',
        title: 'Cold-Start Re-Entry & Safe Splashdown',
        timestamp: 'April 17, 1970 · 142:54:41 GET',
        summary:
          'Following a custom ground-tested checklist, crew powers Odyssey back up from 38°F cold soak and splashes down safely in the Pacific.',
        scientificMechanism:
          'Conformal moisture coatings implemented after Apollo 1 prevented condensation short circuits during Odyssey’s restart.',
        distinctionLabel: 'Historical Reconstruction',
        distinctionNote:
          'Based on NASA Apollo 13 Review Board and Flight Journal records.',
        focusAnnotationId: 'a13-cm',
        visualState: 'outcome',
        cameraPosition: [0.15, 1.48, 0.45],
        cameraLookAt: [0.05, 1.32, -0.38],
      },
      {
        id: 'a13-step-6',
        stepNumber: 6,
        phaseLabel: 'Engineering Improvements',
        title: 'Apollo 14+ Cryogenic & Power Redesign',
        timestamp: '1970–1971 Hardware Upgrades',
        summary:
          'NASA adds an isolated 3rd O2 tank, removes internal stir fans/thermostat switches, armors wiring in stainless steel, and adds a 400 Ah SM battery.',
        scientificMechanism:
          'Removing internal motors and unprotected switches eliminates ignition sources inside supercritical oxygen; isolation valves prevent single-bay loss.',
        distinctionLabel: 'Historical Reconstruction',
        distinctionNote:
          'Reflects verified Apollo 14–17 Service Module modifications.',
        focusAnnotationId: 'a13-o2tank2',
        visualState: 'upgraded',
        cameraPosition: [-0.15, 1.48, 0.55],
        cameraLookAt: [-0.88, 1.25, -0.78],
      },
    ],
    comparisons: [
      {
        id: 'a13-comp-tank',
        system: 'Cryogenic Oxygen Tanks',
        beforeTitle: '2 Tanks in Bay 4 with Internal Fans & 28V Switches',
        beforeSummary:
          'Teflon-insulated fan wires and bimetallic switches vulnerable to 65V ground overload inside pure supercritical oxygen.',
        afterTitle: '3rd Isolated Tank + Fanless Design + Steel Sheathing',
        afterSummary:
          'Removed internal motors/thermostat switches, sheathed remaining wires in stainless steel, and placed Tank 3 in Bay 1.',
        engineeringImpact:
          'Eliminated internal mechanical/electrical ignition triggers and isolated tank failures.',
      },
      {
        id: 'a13-comp-pwr',
        system: 'Electrical & Water Reserves',
        beforeTitle: 'Fuel Cells Dependent Solely on Sector 4 O2',
        beforeSummary:
          'No independent Service Module battery or emergency backup water reserve in CM/SM.',
        afterTitle: '400 Ah Auxiliary SM Battery & Emergency Water',
        afterSummary:
          'Added a dedicated auxiliary battery in SM Bay 4 and extra potable water storage bags.',
        engineeringImpact:
          'Provided independent return-home power even if all fuel cells stopped.',
      },
    ],
  },

  mir: {
    id: 'mir',
    name: 'Mir Space Station · Kvant-1 Module',
    shortName: 'Mir · 1997',
    year: 1997,
    missionDesignation: 'Mir EO-22 / EO-23 Handover',
    dateLabel: 'February 23, 1997 · ~22:35 UTC',
    agency: 'Roscosmos / NASA Shuttle-Mir',
    crew: [
      'Vasily Tsibliyev (EO-23 Commander)',
      'Aleksandr Lazutkin (EO-23 Flight Engineer)',
      'Jerry Linenger (NASA Astronaut)',
      'Valery Korzun (EO-22 Commander)',
      'Aleksandr Kaleri (EO-22 Flight Engineer)',
      'Reinhold Ewald (DLR/ESA)',
    ],
    overview:
      'During a six-person crew handover aboard Mir, a lithium-perchlorate solid-fuel oxygen generator ("Vika" / SFOG) canister in the Kvant-1 module malfunctioned, erupting into an intense ~1.5-foot torch-like flame with molten sparks that filled the station with smoke and temporarily blocked one Soyuz escape route.',
    historicalReferenceTitle:
      'NASA History: 25 Years Ago – Fire Aboard Space Station Mir',
    historicalReferenceUrl:
      'https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/',
    spawnPosition: [0, 1.48, 1.82],
    spawnLookAt: [0, 1.42, -0.75],
    boundsMin: [-1.18, 0.45, -2.2],
    boundsMax: [1.18, 2.38, 2.2],
    annotations: [
      {
        id: 'mir-sfog',
        number: 1,
        componentName: 'Vika (SFOG) Solid-Fuel Oxygen Generator',
        subsystem: 'Auxiliary Oxygen Generation (Kvant-1)',
        anchorPosition: [-0.62, 1.44, -0.78],
        markerOffset: [0.36, 0.28, 0.2],
        focusCameraPosition: [0.22, 1.48, 0.15],
        focusLookAt: [-0.62, 1.44, -0.78],
        historicalAccuracyNote:
          'Kvant-1’s Vika/SFOG unit placement and the ~1.5-foot torch-like flame event are documented in NASA Shuttle-Mir historical records; internal cylinder dimensions and rack layout are proportionally reconstructed.',
        sourceLabel: 'NASA History – 25 Years Ago: Fire Aboard Space Station Mir',
        sourceUrl:
          'https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/',
        simple: {
          whatIsIt:
            'A backup oxygen-making device that burned solid chemical "oxygen candles" (lithium perchlorate) to release breathable oxygen when extra crew were aboard.',
          whenDidItHappen:
            'February 23, 1997 (around 22:35 UTC; early February 24 Moscow Time) during a crew handover with six astronauts aboard.',
          whatHappened:
            'Shortly after a fresh canister was ignited, it malfunctioned and shot out an intense 1.5-foot blowtorch flame and showering sparks into Kvant-1 for roughly 90 seconds to a few minutes.',
          howDidItHappen:
            'A defective or contaminated solid-fuel oxygen candle over-pressurized and burned violently out of its housing instead of decomposing gently.',
          whyDidItHappen:
            'With six people aboard instead of three, the primary Elektron water-electrolysis units needed supplemental SFOG canisters, and manufacturing quality or contamination triggered runaway combustion.',
          consequences:
            'Thick toxic smoke spread throughout Mir, forcing the crew to fight the fire in masks, though the metal canister burned itself out once its fuel was consumed.',
          howFixedOrAddressed:
            'Crew shielded nearby cables and panels with fire extinguishers while keeping the flame from igniting surrounding equipment until the chemical candle exhausted itself.',
          howPrevented:
            'Tighter quality control on oxygen candles, protective fire-resistant shrouds around SFOG housings, and updated microgravity fire protocols.',
          scientificLesson:
            'Chemical oxygen generators carry their own oxidizer and cannot be starved of oxygen by normal extinguishers—containment and thermal shielding are essential.',
        },
        advanced: {
          whatIsIt:
            'TGK / Vika Solid-Fuel Oxygen Generator (SFOG) using cylindrical cartridges of lithium perchlorate (LiClO4) and iron powder ignited electrically/mechanically to produce O2.',
          whenDidItHappen:
            'February 23, 1997, ~22:35 UTC (post-dinner period during EO-22 / EO-23 Soyuz handover).',
          whatHappened:
            'Exothermic decomposition transitioned into violent jetting combustion, projecting a ~0.45 m (~1.5 ft) oxygen-fed flame plume and molten slag across Kvant-1’s narrow aisle.',
          howDidItHappen:
            'Normal LiClO4 decomposition (LiClO4 -> LiCl + 2O2) runs at ~450–600°C. Suspected canister impurity or rubber/seal contamination reacted violently with hot pure oxygen, breaching the cartridge housing.',
          whyDidItHappen:
            'Six-person occupancy doubled O2 demand beyond Elektron capacity; the SFOG unit operated in an open rack without an enclosed blast/spark containment shroud.',
          consequences:
            'Dense smoke obscured visibility to inches; toxic combustion products and elevated CO lingered for hours while heat scorched adjacent bulkhead panels.',
          howFixedOrAddressed:
            'Because LiClO4 supplies its own oxygen, foam/water extinguishers could not extinguish the candle itself; crew cooled adjacent walls and prevented secondary cable ignition until burnout (~90s–several minutes).',
          howPrevented:
            'Engineers added protective metallic/ceramic fire containment sleeves, strict cartridge X-ray/QC inspection, and improved electrical isolation around SFOG racks.',
          scientificLesson:
            'Self-oxidizing chemical reactions cannot be extinguished by oxygen starvation; fire suppression must focus on cooling surrounding structures and isolating fuel.',
        },
      },
      {
        id: 'mir-corridor',
        number: 2,
        componentName: 'Kvant-1 Narrow Corridor & Adjacent Equipment Racks',
        subsystem: 'Module Structure & Egress Path',
        anchorPosition: [0.46, 1.38, -0.58],
        markerOffset: [-0.24, 0.3, 0.22],
        focusCameraPosition: [-0.1, 1.48, 0.35],
        focusLookAt: [0.46, 1.38, -0.58],
        historicalAccuracyNote:
          'NASA records confirm the Kvant-1 fire physically blocked access to one of the two docked Soyuz return spacecraft during the incident.',
        sourceLabel: 'NASA History – Fire Aboard Space Station Mir',
        sourceUrl:
          'https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/',
        simple: {
          whatIsIt:
            'The narrow cylindrical passageway through Kvant-1 connecting Mir’s Base Block to one of the two docked Soyuz return capsules.',
          whenDidItHappen:
            'February 23, 1997, immediately upon SFOG ignition.',
          whatHappened:
            'The flame jetted straight across the cramped corridor, cutting off three crew members’ path to one of the two Soyuz lifeboats.',
          howDidItHappen:
            'In a crowded orbital module (~2.2 m internal width filled with racks and cables), a 1.5-foot jet of sparks left no safe room to pass.',
          whyDidItHappen:
            'The SFOG unit faced directly into the main transit corridor, and Mir’s dual Soyuz capsules sat at opposite ends of the station.',
          consequences:
            'Had the fire forced an immediate evacuation, only one Soyuz (capacity 3) was accessible on the Base Block side for all 6 crew members until the fire burned out.',
          howFixedOrAddressed:
            'Commander Korzun and crew stood their ground to fight the fire, preventing it from spreading to structural walls or cables and keeping the station habitable.',
          howPrevented:
            'Station architecture rules (such as on the ISS) require unobstructed dual-egress paths and never placing high-hazard chemical generators in single-aisle escape corridors.',
          scientificLesson:
            'Hazardous equipment must never be placed where a single failure can sever an emergency evacuation route.',
        },
        advanced: {
          whatIsIt:
            'Kvant-1 pressurized cylindrical interior (~4.15 m diameter outer hull, narrow ~1.2 m clear aisle between experiment and life-support racks) linking Mir Core aft node to Soyuz TM-24.',
          whenDidItHappen:
            'February 23, 1997, blocking the aft Soyuz TM-24 transfer tunnel for the duration of active flame and high heat.',
          whatHappened:
            'Molten metal sparks ricocheted in microgravity (where buoyancy does not carry hot gases upward) across adjacent wall panels and cables.',
          howDidItHappen:
            'In microgravity, without natural convection, flames burn nearly spherically or jet forcefully along exhaust vents while sparks travel linearly until hitting racks or walls.',
          whyDidItHappen:
            'High equipment density on an aging station plus placement of an unshielded pyrotechnic oxygen generator along a primary axial escape corridor.',
          consequences:
            'Divided station access: 6 crew members temporarily had unblocked access to only one 3-seat Soyuz (TM-25) during the critical initial minutes.',
          howFixedOrAddressed:
            'Crew quickly suppressed secondary sparks on opposing racks with water-foam extinguishers and maintained station attitude control.',
          howPrevented:
            'ISS safety standards enforce two-fault-tolerant hazard containment, shielded stowage away from hatches, and dedicated crew egress clearance.',
          scientificLesson:
            'Microgravity alters flame behavior (no upward convection) and habitat layout directly determines crew survival options during an emergency.',
        },
      },
      {
        id: 'mir-ventilation',
        number: 3,
        componentName: 'Ventilation Ducts & Foam/Water Fire Extinguishers',
        subsystem: 'Atmosphere Circulation & Fire Suppression',
        anchorPosition: [0, 2.02, -0.35],
        markerOffset: [0.32, -0.26, 0.2],
        focusCameraPosition: [0.15, 1.52, 0.58],
        focusLookAt: [0, 1.98, -0.35],
        historicalAccuracyNote:
          'Ventilation shutdown, smoke spread across Mir, and use of multiple onboard extinguishers are documented in NASA Shuttle-Mir histories.',
        sourceLabel: 'NASA History – Fire Aboard Space Station Mir',
        sourceUrl:
          'https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/',
        simple: {
          whatIsIt:
            'The air circulation fans that move breathable air through Mir’s modules and the pressurized fire extinguishers used by the crew.',
          whenDidItHappen:
            'February 23, 1997, during and immediately after the 90+ second fire.',
          whatHappened:
            'Ventilation initially carried smoke through the station before being shut down, while crew discharged multiple fire extinguishers to cool nearby equipment.',
          howDidItHappen:
            'In weightlessness, stale CO2 builds up around people without fans—so fans run constantly. During a fire, those same fans push smoke into other modules unless turned off.',
          whyDidItHappen:
            'Without gravity, hot smoke does not rise to the ceiling; it drifts wherever air currents carry it, quickly blinding the crew.',
          consequences:
            'After extinguishing secondary hotspots, Mir’s crew spent hours running air scrubbers and wearing masks until the thick haze cleared.',
          howFixedOrAddressed:
            'Crew turned off inter-module ventilation, used three extinguishers to cool surrounding surfaces, and later restarted filtration scrubbers once flame ceased.',
          howPrevented:
            'Modern stations include automated smoke-triggered ventilation cutoffs, inter-module hatch isolation drills, and CO2/water-mist extinguishers.',
          scientificLesson:
            'In microgravity, airflow management is double-edged: essential for breathing, yet a vector for smoke spread if not rapidly isolated during fire.',
        },
        advanced: {
          whatIsIt:
            'Inter-module forced-air circulation ducts and Russian VPD-series water-foam fire extinguishers positioned along Kvant-1 and Base Block bulkheads.',
          whenDidItHappen:
            'Active suppression between ~22:35 and ~22:40 UTC; atmospheric scrubbing continued for >24 hours.',
          whatHappened:
            'Multiple extinguishers were discharged directly toward the burning SFOG canister and opposing Kvant-1 panels; one extinguisher initially failed or sputtered before backup units worked.',
          howDidItHappen:
            'Water-foam cannot halt perchlorate decomposition inside a sealed cartridge, but evaporative cooling prevents adjacent wiring/polymers from reaching auto-ignition.',
          whyDidItHappen:
            'Microgravity eliminates buoyant stratification of smoke and heat, creating uniform opaque aerosols that defeat visual navigation.',
          consequences:
            'Post-fire filtration required hours of charcoal/catalytic scrubbing; NASA astronaut Jerry Linenger monitored crew carbon monoxide and health metrics continuously.',
          howFixedOrAddressed:
            'Crew closed ventilation dampers to contain smoke spread, confirmed no hot-spot reignition using thermal touch checks, and purged atmosphere.',
          howPrevented:
            'ISS implements single-command Fire Isolation mode (automatically killing rack power and module ventilation) and pressurized CO2 / fine water-mist extinguishers.',
          scientificLesson:
            'Firefighting in microgravity requires immediate power/airflow shutdown plus thermal cooling of adjacent surfaces, not only flame-core targeting.',
        },
      },
      {
        id: 'mir-respirators',
        number: 4,
        componentName: 'Emergency Respirators & Soyuz Escape Route',
        subsystem: 'Crew Personal Protective Equipment',
        anchorPosition: [0, 1.32, 0.52],
        markerOffset: [-0.36, 0.24, 0.1],
        focusCameraPosition: [0.25, 1.5, 1.35],
        focusLookAt: [0, 1.32, 0.52],
        historicalAccuracyNote:
          'Mask shortages/faults encountered by some crew members and prolonged smoke-mask usage are documented in NASA Shuttle-Mir accounts.',
        sourceLabel: 'NASA History – Fire Aboard Space Station Mir',
        sourceUrl:
          'https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/',
        simple: {
          whatIsIt:
            'Emergency gas masks and oxygen respirators stored around the station for toxic smoke events, plus the corridor back toward Soyuz TM-25.',
          whenDidItHappen:
            'February 23–24, 1997, during firefighting and the long smoke cleanup.',
          whatHappened:
            'Crew rushed to put on protective masks in near-zero visibility, discovering that several masks were hard to reach or had defective oxygen canisters.',
          howDidItHappen:
            'Thick smoke made finding and activating masks difficult, and a few older stored units failed to deliver clean oxygen immediately.',
          whyDidItHappen:
            'Six crew members needed simultaneous masks, and aging reserve PPE units lacked frequent point-of-use readiness checks.',
          consequences:
            'Crew had to share working respirators and work in shifts while clearing the toxic cabin air without evacuating.',
          howFixedOrAddressed:
            'Crew distributed functioning masks, monitored each other for CO exposure, and stabilized Mir without abandoning the station.',
          howPrevented:
            'Pre-positioned, regularly inspected Quick-Don Masks and Portable Breathing Apparatus (PBA) at every workstation and hatch.',
          scientificLesson:
            'Emergency breathing gear must be immediately reachable in zero visibility and inspected regularly for every person onboard—including visiting crews.',
        },
        advanced: {
          whatIsIt:
            'IPK-1 / filtering gas masks and closed-circuit oxygen respirators stowed in Kvant-1 and Base Block lockers, plus forward Base Block access to Soyuz TM-25.',
          whenDidItHappen:
            'Donned within ~1–2 minutes of fire alarm (~22:36 UTC) and worn intermittently through cleanup.',
          whatHappened:
            'In blinding smoke, crew discovered some masks had expired/faulty O2 cartridges or clogged valves, forcing rapid troubleshooting in the dark.',
          howDidItHappen:
            'Combustion of seals and coatings emitted CO and irritant particulates; filtering masks do not protect against high carbon monoxide without specialized hopcalite/O2 supply.',
          whyDidItHappen:
            'Handover periods increased headcount from 3 to 6, straining PPE distribution and inspection discipline.',
          consequences:
            'No serious crew injury occurred thanks to rapid teamwork and Jerry Linenger’s medical monitoring, though the incident became a landmark case study for Shuttle-Mir safety.',
          howFixedOrAddressed:
            'Crew switched to verified oxygen-supplying units and cleared residual smoke via Mir’s environmental scrubbers.',
          howPrevented:
            'ISS standardized Portable Breathing Apparatus (PBA) stations at every module hatch with pressure-gauge inspection logs and tactile guides for zero-visibility donning.',
          scientificLesson:
            'Human factors under zero-visibility smoke stress require tactile PPE placement, verified oxygen supply (not filter-only masks), and capacity sized for peak crew handover.',
        },
      },
    ],
    timeline: [
      {
        id: 'mir-step-1',
        stepNumber: 1,
        phaseLabel: 'Before the Incident',
        title: 'Six-Crew Handover & Routine SFOG Ignition',
        timestamp: 'Feb 23, 1997 · ~22:34 UTC',
        summary:
          'Six crew are aboard Mir during handover. To supplement primary Elektron O2 generators, Aleksandr Lazutkin activates a Vika (SFOG) canister in Kvant-1.',
        scientificMechanism:
          'Normally, lithium perchlorate (LiClO4) decomposes smoothly inside the cartridge at ~450–600°C, releasing pure gaseous oxygen into the cabin.',
        distinctionLabel: 'Historical Reconstruction',
        distinctionNote:
          'Crew complement (6) and use of the Kvant-1 Vika generator are verified in NASA records.',
        focusAnnotationId: 'mir-sfog',
        visualState: 'precondition',
        cameraPosition: [0.22, 1.48, 0.15],
        cameraLookAt: [-0.62, 1.44, -0.78],
      },
      {
        id: 'mir-step-2',
        stepNumber: 2,
        phaseLabel: 'Initial Event',
        title: 'Defective Canister Erupts Into 1.5-Foot Torch Flame',
        timestamp: '~22:35 UTC',
        summary:
          'Instead of normal oxygen release, the canister ruptures with a roaring ~1.5-foot blowtorch flame and sprays molten sparks across Kvant-1.',
        scientificMechanism:
          'Contaminants or casing failure triggered runaway exothermic combustion fed directly by the canister’s own pure oxygen output.',
        distinctionLabel: 'Simplified Educational Animation',
        distinctionNote:
          'Flame jet and microgravity spark trajectories illustrate the NASA account of the ~1.5-ft torch.',
        focusAnnotationId: 'mir-sfog',
        visualState: 'ignition',
        cameraPosition: [0.25, 1.48, 0.28],
        cameraLookAt: [-0.55, 1.44, -0.78],
      },
      {
        id: 'mir-step-3',
        stepNumber: 3,
        phaseLabel: 'Problem Development',
        title: 'Soyuz Escape Path Blocked & Dense Smoke Fills Mir',
        timestamp: '~22:35 – 22:37 UTC',
        summary:
          'The flame cuts across the narrow Kvant-1 corridor, blocking one Soyuz return vehicle while fans rapidly spread opaque toxic smoke.',
        scientificMechanism:
          'Without gravity-driven convection, smoke does not rise—it suspends uniformly in the air and rides forced ventilation ducts across modules.',
        distinctionLabel: 'Simplified Educational Animation',
        distinctionNote:
          'Visualizes smoke diffusion and corridor blockage across Kvant-1.',
        focusAnnotationId: 'mir-corridor',
        visualState: 'escalation',
        cameraPosition: [0, 1.5, 0.72],
        cameraLookAt: [0, 1.44, -0.65],
      },
      {
        id: 'mir-step-4',
        stepNumber: 4,
        phaseLabel: 'Crew & Ground Response',
        title: 'Respirators, Ventilation Shutoff & Extinguishers',
        timestamp: '~22:36 – 22:42 UTC',
        summary:
          'Crew don emergency masks (discovering some faulty units), shut down ventilation, and discharge foam/water extinguishers onto surrounding racks.',
        scientificMechanism:
          'Because the chemical candle supplies its own oxygen, extinguishers cannot snuff the core—they cool adjacent metal and cables until the cartridge burns out.',
        distinctionLabel: 'Historical Reconstruction',
        distinctionNote:
          'Reflects crew firefighting actions and faulty mask challenges recorded by NASA.',
        focusAnnotationId: 'mir-ventilation',
        visualState: 'response',
        cameraPosition: [0.15, 1.52, 0.58],
        cameraLookAt: [0, 1.65, -0.55],
      },
      {
        id: 'mir-step-5',
        stepNumber: 5,
        phaseLabel: 'Final Outcome',
        title: 'Fire Burns Out; Station Saved Without Evacuation',
        timestamp: 'Feb 23–24, 1997',
        summary:
          'After ~90 seconds to a few minutes of intense burning, the canister fuel is spent. Crew scrub the smoke for hours and save Mir.',
        scientificMechanism:
          'Preventing secondary cable/liner ignition allowed the self-limiting solid fuel to exhaust safely; continuous air scrubbing restored safe CO levels.',
        distinctionLabel: 'Historical Reconstruction',
        distinctionNote:
          'All six crew members remained healthy after medical checks by NASA astronaut Jerry Linenger.',
        focusAnnotationId: 'mir-respirators',
        visualState: 'outcome',
        cameraPosition: [0.25, 1.5, 1.35],
        cameraLookAt: [0, 1.38, -0.4],
      },
      {
        id: 'mir-step-6',
        stepNumber: 6,
        phaseLabel: 'Engineering Improvements',
        title: 'Containment Shrouds, PPE Readiness & ISS Protocols',
        timestamp: 'Post-1997 Upgrades',
        summary:
          'Agencies add metal containment shrouds around SFOG units, tighten canister QC, inspect respirators at hatches, and codify ISS fire-isolation rules.',
        scientificMechanism:
          'Automated power/ventilation cutoffs + dual unobstructed egress corridors ensure no single equipment fire can trap crew or spread smoke.',
        distinctionLabel: 'Historical Reconstruction',
        distinctionNote:
          'Reflects Shuttle-Mir joint safety board and ISS operational improvements.',
        focusAnnotationId: 'mir-sfog',
        visualState: 'upgraded',
        cameraPosition: [0.22, 1.48, 0.25],
        cameraLookAt: [-0.62, 1.44, -0.78],
      },
    ],
    comparisons: [
      {
        id: 'mir-comp-sfog',
        system: 'SFOG Oxygen Generator Housing',
        beforeTitle: 'Open Rack-Mounted Canister Unit',
        beforeSummary:
          'Exposed canister housing aimed directly into the narrow Kvant-1 transit corridor without a thermal/spark shroud.',
        afterTitle: 'Containment Shroud & Quality Inspection',
        afterSummary:
          'Protective metal shielding around active cartridges, stricter manufacturing QC, and isolated placement away from cables.',
        engineeringImpact:
          'Contained slag and flame jets if a chemical oxygen candle fractured during burn.',
      },
      {
        id: 'mir-comp-ppe',
        system: 'Respirators & Egress Architecture',
        beforeTitle: 'Shared Filter/O2 Masks & Single-Aisle Soyuz Path',
        beforeSummary:
          'Some masks failed inspection during smoke emergency; fire in Kvant-1 severed access to one Soyuz.',
        afterTitle: 'Hatch-Side PBA Stations & Dual Unobstructed Egress',
        afterSummary:
          'Dedicated oxygen-supplying respirators inspected regularly per crew member, plus ISS fire-isolation cutoffs and clear escape paths.',
        engineeringImpact:
          'Guaranteed breathable air in zero visibility and preserved evacuation access.',
      },
    ],
  },
};

export const MISSION_ORDER: SpacecraftId[] = ['apollo1', 'apollo13', 'mir'];
