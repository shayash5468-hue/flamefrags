import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { sound } from '../utils/audio';
import { 
  Boxes, 
  Layers, 
  Camera, 
  Info, 
  Shield, 
  Flame, 
  Wind, 
  RotateCcw,
  Sparkles,
  Maximize2
} from 'lucide-react';

interface StationSector {
  id: string;
  name: string;
  type: 'rack' | 'cupola' | 'hatch' | 'sensor' | 'safety';
  position: [number, number, number];
  description: string;
  status: 'nominal' | 'monitoring' | 'equipment';
}

const SECTORS: StationSector[] = [
  {
    id: 'ogs',
    name: 'OGS (Oxygen Generation System)',
    type: 'rack',
    position: [-2.1, 0, -4],
    description: 'Electrolyzes recycled water to generate oxygen for the 6-person crew. High fire hazard due to pressurized pure O2 lines.',
    status: 'monitoring'
  },
  {
    id: 'eclss',
    name: 'ECLSS Water Recovery System',
    type: 'rack',
    position: [-2.1, 0, -8],
    description: 'Recycles graywater and crew urine into drinkable water with catalytic oxidation reactors.',
    status: 'nominal'
  },
  {
    id: 'ared',
    name: 'ARED Exercise System',
    type: 'rack',
    position: [2.1, 0, -8],
    description: 'Vacuum cylinder resistive exercise device for counteracting muscle and bone density loss in microgravity.',
    status: 'nominal'
  },
  {
    id: 'whc',
    name: 'WHC (Waste & Hygiene)',
    type: 'rack',
    position: [2.1, 0, -4],
    description: 'Private crew hygiene compartment with urine transfer system and odor catalytic filters.',
    status: 'nominal'
  },
  {
    id: 'cupola',
    name: 'Cupola Observation Module',
    type: 'cupola',
    position: [0, -2.6, 0],
    description: '7-window observatory viewing platform facing Earth (Nadir). Used for Canadarm2 robotic operations and Earth science photography.',
    status: 'nominal'
  },
  {
    id: 'hatch-node1',
    name: 'Forward Hatch to Node 1 (Unity)',
    type: 'hatch',
    position: [0, 0, 10.5],
    description: 'Primary emergency ingress and egress route connecting Tranquility to the US orbital segment core.',
    status: 'nominal'
  },
  {
    id: 'pfe-station',
    name: 'PFE & PBE Emergency Locker',
    type: 'safety',
    position: [-1.8, 1.2, 2],
    description: 'Contains two Fine Water Mist Portable Fire Extinguishers and four 15-minute PBE oxygen hoods.',
    status: 'equipment'
  }
];

export const StationMap: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedSector, setSelectedSector] = useState<StationSector>(SECTORS[0]);
  const [showRacks, setShowRacks] = useState<boolean>(true);
  const [showAirflow, setShowAirflow] = useState<boolean>(true);
  const [showSensors, setShowSensors] = useState<boolean>(true);
  const [showSafetyGear, setShowSafetyGear] = useState<boolean>(true);

  // References for Three.js
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const racksGroupRef = useRef<THREE.Group | null>(null);
  const airflowGroupRef = useRef<THREE.Group | null>(null);
  const sensorsGroupRef = useRef<THREE.Group | null>(null);
  const safetyGroupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number>(0);

  // Mouse orbit interaction
  const isDraggingRef = useRef<boolean>(false);
  const prevMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const sphericalRef = useRef<{ radius: number; theta: number; phi: number }>({
    radius: 20,
    theta: Math.PI / 4,
    phi: Math.PI / 3,
  });

  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060913);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0x475569, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.8);
    dirLight1.position.set(10, 15, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x818cf8, 1.0);
    dirLight2.position.set(-10, -10, -10);
    scene.add(dirLight2);

    // 5. Module Cylindrical Hull Cutaway
    const hullRadius = 3.2;
    const hullLength = 18;
    // Semi-cylinder cutaway so interior racks are visible
    const cutawayGeo = new THREE.CylinderGeometry(hullRadius, hullRadius, hullLength, 32, 1, true, 0, Math.PI * 1.3);
    cutawayGeo.rotateX(Math.PI / 2);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.35,
      side: THREE.DoubleSide,
      wireframe: false,
    });
    const hullMesh = new THREE.Mesh(cutawayGeo, hullMat);
    scene.add(hullMesh);

    // Structural Rib Rings
    for (let z = -8; z <= 8; z += 4) {
      const ringGeo = new THREE.TorusGeometry(hullRadius, 0.08, 12, 32);
      const ringMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0, 0, z);
      scene.add(ring);
    }

    // 6. Attached Cupola 7-window dome at Nadir (-Y)
    const cupolaGroup = new THREE.Group();
    const cupolaGeo = new THREE.CylinderGeometry(1.4, 1.8, 1.2, 8);
    const cupolaMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    const cupolaMesh = new THREE.Mesh(cupolaGeo, cupolaMat);
    cupolaGroup.add(cupolaMesh);

    // Glass windows on cupola
    const winGeo = new THREE.CircleGeometry(0.7, 16);
    const winMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    const winMesh = new THREE.Mesh(winGeo, winMat);
    winMesh.rotateX(Math.PI / 2);
    winMesh.position.y = -0.61;
    cupolaGroup.add(winMesh);

    cupolaGroup.position.set(0, -3.2, 0);
    scene.add(cupolaGroup);

    // 7. Equipment Racks Group
    const racksGroup = new THREE.Group();
    racksGroupRef.current = racksGroup;
    scene.add(racksGroup);

    const rackGeo = new THREE.BoxGeometry(1.0, 2.2, 2.4);
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.4 });
    const rackBorderMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });

    SECTORS.filter(s => s.type === 'rack').forEach((s) => {
      const rack = new THREE.Mesh(rackGeo, rackMat);
      rack.position.set(...s.position);
      racksGroup.add(rack);

      const wire = new THREE.LineSegments(new THREE.WireframeGeometry(rackGeo), rackBorderMat);
      wire.position.set(...s.position);
      racksGroup.add(wire);
    });

    // 8. Airflow Circulation Ducts Group
    const airflowGroup = new THREE.Group();
    airflowGroupRef.current = airflowGroup;
    scene.add(airflowGroup);

    const ductCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.8, 2.2, -8),
      new THREE.Vector3(0, 2.6, -2),
      new THREE.Vector3(1.8, 2.2, 4),
      new THREE.Vector3(0, 2.6, 8),
    ]);
    const ductGeo = new THREE.TubeGeometry(ductCurve, 40, 0.15, 8, false);
    const ductMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true, transparent: true, opacity: 0.6 });
    const duct = new THREE.Mesh(ductGeo, ductMat);
    airflowGroup.add(duct);

    // 9. Fire Sensors Group
    const sensorsGroup = new THREE.Group();
    sensorsGroupRef.current = sensorsGroup;
    scene.add(sensorsGroup);

    const sensorGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const sensorMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const sensorPositions = [
      new THREE.Vector3(-2.2, 1.6, -4),
      new THREE.Vector3(2.2, 1.6, -4),
      new THREE.Vector3(0, 2.5, 0),
      new THREE.Vector3(0, -2.5, 0),
    ];
    sensorPositions.forEach(p => {
      const sensor = new THREE.Mesh(sensorGeo, sensorMat);
      sensor.position.copy(p);
      sensorsGroup.add(sensor);
    });

    // 10. Safety Gear Group (PFE Extinguishers & PBE)
    const safetyGroup = new THREE.Group();
    safetyGroupRef.current = safetyGroup;
    scene.add(safetyGroup);

    const pfeGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 12);
    const pfeMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8 });
    const pfe1 = new THREE.Mesh(pfeGeo, pfeMat);
    pfe1.position.set(-1.8, 1.2, 2);
    safetyGroup.add(pfe1);

    // Animation Loop
    const animate = (now: number) => {
      animFrameRef.current = requestAnimationFrame(animate);

      // Pulse sensors
      sensorPositions.forEach((_, idx) => {
        const sMesh = sensorsGroup.children[idx] as THREE.Mesh;
        if (sMesh) {
          const sc = 1.0 + Math.sin(now * 0.005 + idx) * 0.25;
          sMesh.scale.set(sc, sc, sc);
        }
      });

      renderer.render(scene, camera);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    // Resize handler
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // Update visibility when toggles change
  useEffect(() => {
    if (racksGroupRef.current) racksGroupRef.current.visible = showRacks;
    if (airflowGroupRef.current) airflowGroupRef.current.visible = showAirflow;
    if (sensorsGroupRef.current) sensorsGroupRef.current.visible = showSensors;
    if (safetyGroupRef.current) safetyGroupRef.current.visible = showSafetyGear;
  }, [showRacks, showAirflow, showSensors, showSafetyGear]);

  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { radius, theta, phi } = sphericalRef.current;
    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(0, 0, 0);
  };

  // Mouse drag Orbit Controls
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - prevMousePosRef.current.x;
    const deltaY = e.clientY - prevMousePosRef.current.y;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };

    sphericalRef.current.theta -= deltaX * 0.008;
    sphericalRef.current.phi -= deltaY * 0.008;
    sphericalRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, sphericalRef.current.phi));
    updateCameraPosition();
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const setPerspectivePreset = (preset: 'iso' | 'cupola' | 'corridor') => {
    sound.playClick();
    if (preset === 'iso') {
      sphericalRef.current = { radius: 22, theta: Math.PI / 4, phi: Math.PI / 3 };
    } else if (preset === 'cupola') {
      sphericalRef.current = { radius: 14, theta: 0, phi: Math.PI * 0.85 };
    } else if (preset === 'corridor') {
      sphericalRef.current = { radius: 10, theta: 0, phi: Math.PI / 2 };
    }
    updateCameraPosition();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div className="glass p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-600/50 text-purple-300 text-xs font-mono">
            <Boxes className="w-3.5 h-3.5 text-purple-400" />
            <span>INTERACTIVE ARCHITECTURAL 3D SCHEMATIC</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mt-1">
            ISS Node 3 (Tranquility) 3D Cutaway Blueprint
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
            Rotate and examine equipment racks, Cupola observatory port, fire detection sensors, and emergency safety lockers.
          </p>
        </div>

        {/* Camera Perspective Presets */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400">CAMERA:</span>
          <button
            onClick={() => setPerspectivePreset('iso')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            Isometric
          </button>
          <button
            onClick={() => setPerspectivePreset('cupola')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60"
          >
            Cupola Nadir
          </button>
          <button
            onClick={() => setPerspectivePreset('corridor')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-800/60"
          >
            Module Hatch
          </button>
        </div>
      </div>

      {/* Grid: 3D Viewport on left (8 cols), Sector Dossier & Layers on right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <div className="glass p-4 rounded-2xl flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3 text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-purple-400" />
                <span>CLICK AND DRAG TO ROTATE 3D MODULE</span>
              </span>
              <span className="text-purple-300">REAL-TIME WEBGL RENDERING</span>
            </div>

            <div
              ref={mountRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="w-full h-[460px] rounded-xl overflow-hidden cursor-grab active:cursor-grabbing border border-purple-900/30 bg-[#040711]"
            />

            {/* Layer Controls Bar */}
            <div className="w-full mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono pt-3 border-t border-slate-800">
              <span className="text-slate-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>SCHEMATIC LAYERS:</span>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowRacks(!showRacks)}
                  className={`px-2.5 py-1 rounded-lg border transition ${
                    showRacks ? 'bg-purple-600/30 border-purple-400 text-purple-200' : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  Equipment Racks
                </button>
                <button
                  onClick={() => setShowAirflow(!showAirflow)}
                  className={`px-2.5 py-1 rounded-lg border transition ${
                    showAirflow ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200' : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  IMV Airflow Loop
                </button>
                <button
                  onClick={() => setShowSensors(!showSensors)}
                  className={`px-2.5 py-1 rounded-lg border transition ${
                    showSensors ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200' : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  Fire Sensors
                </button>
                <button
                  onClick={() => setShowSafetyGear(!showSafetyGear)}
                  className={`px-2.5 py-1 rounded-lg border transition ${
                    showSafetyGear ? 'bg-red-600/30 border-red-400 text-red-200' : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  PFE / PBE Stations
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sector Dossier Inspector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass p-5 rounded-2xl border-purple-900/40 space-y-4">
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-purple-400" />
              <span>Module Sectors Directory</span>
            </h3>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {SECTORS.map((s) => {
                const isSelected = selectedSector.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => { sound.playClick(); setSelectedSector(s); }}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      isSelected
                        ? 'bg-purple-950/50 border-purple-400 shadow-glow'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{s.name}</span>
                      <span className="font-mono text-[10px] text-purple-300 capitalize">{s.type}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Sector Details Dossier */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-purple-400 font-bold uppercase">
                  ACTIVE SECTOR INSPECTION
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-700/50">
                  {selectedSector.status.toUpperCase()}
                </span>
              </div>

              <h4 className="font-display font-bold text-base text-white">{selectedSector.name}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedSector.description}
              </p>

              <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex justify-between">
                <span>Coordinates:</span>
                <span className="text-slate-200">X:{selectedSector.position[0]} Y:{selectedSector.position[1]} Z:{selectedSector.position[2]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
