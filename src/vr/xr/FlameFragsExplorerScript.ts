import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as xb from 'xrblocks';
import { SPACECRAFT_MISSIONS } from '../data/historicalData.ts';
import { AnnotationSystem } from '../three/AnnotationSystem.ts';
import { buildSpacecraftScene } from '../three/SpacecraftBuilder.ts';
import {
  BuiltSpacecraftScene,
  ExplorerMode,
  ExplanationDepth,
  HeadTrackingMode,
  InvestigationStep,
  InvestigationVisualState,
  ScientificAnnotation,
  SpacecraftId,
  SpacecraftMissionData,
} from '../types.ts';
import { createProceduralTextures, ProceduralTextureSet } from '../utils/proceduralTextures.ts';
import {
  detectDedicatedXRHeadset,
  detectEmbeddedIframe,
} from '../utils/deviceDetection.ts';
import { SpatialVRPanel } from './SpatialVRPanel.ts';
import { WebcamHeadTracker } from './WebcamHeadTracker.ts';

// Pre-allocated scratch math objects (zero GC in update loop)
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _moveDelta = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _lookMat = new THREE.Matrix4();
const _targetQuat = new THREE.Quaternion();
const _pointerNdc = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();
const _up = new THREE.Vector3(0, 1, 0);

// Head-gaze & VR locomotion scratch math
const _gazeOrigin = new THREE.Vector3();
const _gazeDir = new THREE.Vector3();
const _gazePos = new THREE.Vector3();
const _xrHeadFwd = new THREE.Vector3();
const _xrHeadRight = new THREE.Vector3();
const _xrHeadPos = new THREE.Vector3();
const _pivotOffset = new THREE.Vector3();
const _snapQuat = new THREE.Quaternion();

// IMU DeviceOrientation quaternion scratch math (horizon-locked world-frame 3DoF)
const _imuEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _imuQuat = new THREE.Quaternion();
const _imuScreenAdjust = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -90 deg X
const _imuOrientQuat = new THREE.Quaternion();
const _imuYawOffsetQuat = new THREE.Quaternion();
const _imuFwd = new THREE.Vector3();
const _imuZAxis = new THREE.Vector3(0, 0, 1);
const _renderSize = new THREE.Vector2();

const DWELL_TRIGGER_SECONDS = 0.95;

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export interface ExplorerStateSnapshot {
  mission: SpacecraftMissionData;
  mode: ExplorerMode;
  depth: ExplanationDepth;
  annotationsVisible: boolean;
  showUpgradeComparison: boolean;
  selectedAnnotation: ScientificAnnotation | null;
  hoveredAnnotationId: string | null;
  timelineIndex: number;
  timelinePlaying: boolean;
  currentStep: InvestigationStep | null;
  isInVR: boolean;
  splitVRMode: boolean;
  splitStereoDepth: number;
  splitEyeScale: number;
  vrPanelVisible: boolean;
  vrFoveationActive: boolean;
  gyroEnabled: boolean;
  headTrackingMode: HeadTrackingMode;
  headGazeEnabled: boolean;
  headTrackingLabel: string;
  factAutoCloseActive: boolean;
  factSecondsLeft: number;
  factsVisible: boolean;
  factsSecondsLeft: number;
  contextLost: boolean;
}

export class FlameFragsExplorerScript extends xb.Script {
  private onStateChange: (snapshot: ExplorerStateSnapshot) => void;
  private onError: (message: string) => void;

  private textures: ProceduralTextureSet | null = null;
  private envRT: THREE.WebGLRenderTarget | null = null;
  private spacecraftContainer = new THREE.Group();
  private currentScene: BuiltSpacecraftScene | null = null;
  private annotationSystem: AnnotationSystem | null = null;
  private spatialVRPanel: SpatialVRPanel | null = null;

  // 3D Head-Tracked Gaze Reticle (Shader-driven radial dwell ring, zero GC)
  private headReticleMesh: THREE.Mesh | null = null;
  private headReticleMat: THREE.ShaderMaterial | null = null;
  private headGazeEnabled = false;
  private gazeHitId: string | null = null;
  private gazeDwellTime = 0;
  private gazeTriggeredId: string | null = null;

  // Mission & Investigation State
  private missionId: SpacecraftId = 'apollo1';
  private mode: ExplorerMode = 'explore';
  private depth: ExplanationDepth = 'simple';
  private annotationsVisible = true;
  private showUpgradeComparison = false;
  private selectedAnnotationId: string | null = null;
  private hoveredAnnotationId: string | null = null;
  private vrFactAutoCloseTimer: number | null = null;
  private vrFactCountdownInterval: number | null = null;
  private factSecondsLeft = 0;
  private factsVisible = false;
  private factsSecondsLeft = 0;
  private factsAutoCloseTimer: number | null = null;
  private factsCountdownInterval: number | null = null;
  private vrPanelAutoOpenedForFacts = false;
  private timelineIndex = 0;
  private timelinePlaying = false;
  private timelinePlayElapsed = 0;
  private isInVR = false;
  private splitVRMode = false;
  private splitStereoDepth = 0;
  private splitEyeScale = 0.9;
  private stereoCamera = new THREE.StereoCamera();
  private vrPanelVisible = true;
  private vrFoveationActive = false;
  private isSoftwareGl = false;
  private contextLost = false;
  private suspended = false;

  // VR Controller Locomotion, Comfort Vignette & Smooth Component Glide
  private vrSnapTurnLatch = false;
  private vrSnapTurnCooldown = 0;
  private vrToggleButtonLatch = false;
  private vrVignetteMesh: THREE.Mesh | null = null;
  private vrVignetteMat: THREE.ShaderMaterial | null = null;
  private vrVignetteStrength = 0;
  private vrContainerGliding = false;
  private vrContainerTargetPos = new THREE.Vector3();

  // Camera & Input State (Desktop WASD + Mouse Drag + Touch Drag + Head Tracking)
  private camPos = new THREE.Vector3(0, 1.48, 0.92);
  private camTargetPos = new THREE.Vector3(0, 1.48, 0.92);
  private camYaw = 0;
  private camPitch = -0.08;
  private targetYaw = 0;
  private targetPitch = -0.08;
  private camQuat = new THREE.Quaternion();
  private cameraGliding = false;

  private keysDown = new Set<string>();
  private mobileMoveVec = new THREE.Vector3();
  private isPointerDown = false;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pointerTravelPx = 0;
  private lastHoverCheckMs = 0;
  private activePointers = new Map<number, { x: number; y: number }>();
  private lastPinchDist: number | null = null;
  private wasMultiTouch = false;

  // Multi-mode Head Tracking (IMU 3DoF + Webcam Optical + Cursor Head-Look)
  private headTrackingMode: HeadTrackingMode = 'off';
  private webcamTracker = new WebcamHeadTracker();
  private imuHasLiveReading = false;
  private imuCalibrated = false;
  private imuYawOffset = 0;
  private imuTargetQuat = new THREE.Quaternion();
  private imuTimeoutId: number | null = null;
  private webcamBaseYaw = 0;
  private webcamBasePitch = 0;
  private cursorBaseYaw = 0;
  private cursorBasePitch = 0;
  private cursorRefX: number | null = null;
  private cursorRefY: number | null = null;

  // Bound event listeners for clean teardown
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;
  private boundPointerCancel: (e: PointerEvent) => void;
  private boundWheel: (e: WheelEvent) => void;
  private boundDeviceOrientation: (e: DeviceOrientationEvent) => void;
  private boundDeviceOrientationAbs: (e: DeviceOrientationEvent) => void;
  private boundContextLost: (e: Event) => void;
  private boundContextRestored: (e: Event) => void;
  private boundResize: () => void;
  private boundSessionError: (event: { error: unknown }) => void;

  private domElement: HTMLElement | null = null;
  private elapsed = 0;
  private lastFrameMs = performance.now();

  constructor(
    onStateChange: (snapshot: ExplorerStateSnapshot) => void,
    onError: (message: string) => void
  ) {
    super();
    this.onStateChange = onStateChange;
    this.onError = onError;

    this.boundKeyDown = (e) => this.handleKeyDown(e);
    this.boundKeyUp = (e) => this.handleKeyUp(e);
    this.boundPointerDown = (e) => this.handlePointerDown(e);
    this.boundPointerMove = (e) => this.handlePointerMove(e);
    this.boundPointerUp = (e) => this.handlePointerUp(e);
    this.boundPointerCancel = (e) => this.handlePointerUp(e);
    this.boundWheel = (e) => this.handleWheel(e);
    this.boundDeviceOrientation = (e) => this.handleDeviceOrientation(e, false);
    this.boundDeviceOrientationAbs = (e) => this.handleDeviceOrientation(e, true);
    this.boundContextLost = (e) => {
      e.preventDefault();
      this.contextLost = true;
      this.emitState();
    };
    this.boundContextRestored = () => {
      this.contextLost = false;
      this.emitState();
    };
    this.boundResize = () => this.handleResize();
    this.boundSessionError = (event: { error: unknown }) => {
      const detail =
        event.error instanceof Error
          ? event.error.message
          : 'WebXR headset session could not start here.';
      this.onError(
        `${detail} Continuing in Head-Tracked VR mode inside the preview.`
      );
    };
  }

  init(): void {
    try {
      const renderer = xb.core.renderer as THREE.WebGLRenderer;
      const scene = xb.core.scene;
      const camera = xb.core.camera;
      this.isSoftwareGl = detectSoftwareWebGL();

      // Configure studio PBR rendering pipeline with VR-optimized shadow caching
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.setPixelRatio(
        this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
      );
      renderer.shadowMap.enabled = !this.isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;

      // Calibrated desktop/mobile FOV (zoomed out slightly for wide VR cabin awareness; WebXR overrides when presenting)
      camera.fov = 74;
      camera.near = 0.04;
      camera.far = 250;
      camera.aspect =
        window.innerHeight > 0 ? window.innerWidth / window.innerHeight : 1.77;
      camera.updateProjectionMatrix();

      // Studio environment reflections (PMREM + RoomEnvironment)
      const pmrem = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      this.envRT = pmrem.fromScene(roomEnv, 0.04);
      scene.environment = this.envRT.texture;
      roomEnv.dispose();
      pmrem.dispose();

      // Deep aerospace background & subtle atmospheric depth (kept light so stars/earth stay vivid)
      scene.background = new THREE.Color(0x060b16);
      scene.fog = new THREE.FogExp2(0x060b16, 0.01);

      // Balanced 3-point lighting rig (warm key + cool hemisphere fill + rim accent)
      const hemi = new THREE.HemisphereLight(0xdbeafe, 0x263142, 1.65);
      this.add(hemi);

      const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.0);
      keyLight.position.set(1.8, 3.6, 2.2);
      if (!this.isSoftwareGl) {
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(1024, 1024);
        keyLight.shadow.camera.near = 0.2;
        keyLight.shadow.camera.far = 12;
        const d = 3.5;
        keyLight.shadow.camera.left = -d;
        keyLight.shadow.camera.right = d;
        keyLight.shadow.camera.top = d;
        keyLight.shadow.camera.bottom = -d;
        keyLight.shadow.bias = -0.0005;
        keyLight.shadow.normalBias = 0.02;
      }
      this.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
      rimLight.position.set(-2.5, 2.2, -3.0);
      this.add(rimLight);

      const cabinPoint = new THREE.PointLight(0xfff7ed, 1.15, 7.5, 1.4);
      cabinPoint.position.set(0, 1.85, 0.15);
      this.add(cabinPoint);

      // Procedural textures & annotation system
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      this.textures = createProceduralTextures(maxAniso);
      this.annotationSystem = new AnnotationSystem(
        maxAniso,
        (id) => this.selectAnnotation(id),
        (id) => this.setHoveredAnnotation(id)
      );

      this.add(this.spacecraftContainer);
      this.createHeadGazeReticle();
      this.createVRComfortVignette();

      // In-VR Spatial UI Console (hidden on 2D desktop/mobile)
      this.spatialVRPanel = new SpatialVRPanel({
        onSelectMission: (id) => this.loadMission(id),
        onSelectAnnotation: (id) => this.selectAnnotation(id, true),
        onSetMode: (mode) => this.setMode(mode),
        onStepTimeline: (delta) => this.stepTimeline(delta),
        onToggleAnnotations: () => this.toggleAnnotations(),
        onToggleDepth: () => this.toggleExplanationDepth(),
        onToggleUpgradeComparison: () => this.toggleUpgradeComparison(),
        onToggleHeadGaze: () => this.toggleHeadGaze(),
        onToggleFacts: () => this.toggleFacts(),
        onHideVRPanel: () => this.toggleVRPanel(false),
        onExitVR: () => void this.exitVRSession(),
      });
      this.add(this.spatialVRPanel);

      // Load initial mission
      this.loadMission('apollo1');

      // Attach DOM input listeners
      this.domElement = renderer.domElement;
      this.domElement.style.touchAction = 'none';
      this.domElement.style.display = 'block';

      window.addEventListener('keydown', this.boundKeyDown);
      window.addEventListener('keyup', this.boundKeyUp);
      window.addEventListener('resize', this.boundResize);
      this.domElement.addEventListener('pointerdown', this.boundPointerDown);
      window.addEventListener('pointermove', this.boundPointerMove);
      window.addEventListener('pointerup', this.boundPointerUp);
      window.addEventListener('pointercancel', this.boundPointerCancel);
      this.domElement.addEventListener('wheel', this.boundWheel, { passive: false });
      this.domElement.addEventListener('webglcontextlost', this.boundContextLost);
      this.domElement.addEventListener(
        'webglcontextrestored',
        this.boundContextRestored
      );
      xb.core.webXRSessionManager?.addEventListener(
        xb.WebXRSessionEventType.SESSION_ERROR,
        this.boundSessionError
      );
    } catch (err) {
      this.onError(
        err instanceof Error ? err.message : 'Failed to initialize 3D scene.'
      );
    }
  }

  private createHeadGazeReticle(): void {
    const geo = new THREE.PlaneGeometry(0.056, 0.056);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uHover: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv * 2.0 - 1.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uProgress;
        uniform float uHover;
        void main() {
          float dist = length(vUv);
          if (dist > 0.96) discard;

          // Center precision dot
          float dotAlpha = 1.0 - smoothstep(0.11, 0.16, dist);
          // Outer thin reticle ring
          float ringDist = abs(dist - 0.56);
          float ringAlpha = (1.0 - smoothstep(0.035, 0.065, ringDist)) * 0.72;

          // Clockwise dwell progress arc (starts at top +Y)
          float angle = atan(vUv.x, vUv.y);
          if (angle < 0.0) angle += 6.28318530718;
          float normAngle = angle / 6.28318530718;
          float arcBand = 1.0 - smoothstep(0.06, 0.095, abs(dist - 0.78));
          float arcAlpha = step(normAngle, uProgress) * arcBand * uHover;

          vec3 cyan = vec3(0.024, 0.714, 0.831);
          vec3 amber = vec3(0.961, 0.620, 0.043);
          vec3 baseCol = mix(cyan, amber, uHover);

          vec3 col = mix(baseCol, amber, arcAlpha);
          float alpha = max(dotAlpha * 0.95, max(ringAlpha, arcAlpha * 0.96));
          if (alpha < 0.02) discard;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'HeadGazeReticle';
    mesh.renderOrder = 950;
    mesh.visible = false;
    mesh.xb = { pointerEvents: 'none' };
    this.add(mesh);

    this.headReticleMesh = mesh;
    this.headReticleMat = mat;
  }

  private createVRComfortVignette(): void {
    const geo = new THREE.PlaneGeometry(1.5, 1.5);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uStrength: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv * 2.0 - 1.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uStrength;
        void main() {
          float r = length(vUv);
          float edge = smoothstep(0.42, 0.98, r);
          float alpha = edge * uStrength;
          if (alpha < 0.005) discard;
          gl_FragColor = vec4(0.012, 0.02, 0.04, alpha);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'VRComfortVignette';
    mesh.renderOrder = 990;
    mesh.visible = false;
    mesh.xb = { pointerEvents: 'none' };
    this.add(mesh);

    this.vrVignetteMesh = mesh;
    this.vrVignetteMat = mat;
  }

  onXRSessionStarted(): void {
    if (this.splitVRMode) {
      this.setSplitVRMode(false);
    }
    this.isInVR = true;
    this.vrPanelVisible = true;
    this.cameraGliding = false;
    this.headGazeEnabled = true;
    this.vrSnapTurnLatch = false;
    this.vrSnapTurnCooldown = 0;
    this.vrToggleButtonLatch = false;
    this.vrVignetteStrength = 0;
    this.vrContainerGliding = false;

    const renderer = xb.core.renderer as THREE.WebGLRenderer;
    // VR GPU Optimizations: enable Fixed Foveated Rendering & skip stereo shadow-map passes
    const xrMgr = renderer.xr as THREE.WebXRManager & {
      setFoveation?: (value: number) => void;
    };
    if (typeof xrMgr.setFoveation === 'function') {
      xrMgr.setFoveation(1.0);
      this.vrFoveationActive = true;
    }
    renderer.shadowMap.enabled = false;

    const mission = this.getCurrentMission();
    this.spacecraftContainer.rotation.set(0, 0, 0);
    this.spacecraftContainer.position.set(
      -mission.spawnPosition[0] * 0.65,
      0,
      -mission.spawnPosition[2] * 0.84
    );

    if (this.spatialVRPanel) {
      this.spatialVRPanel.visible = true;
      const xrCam = renderer.xr.getCamera();
      this.spatialVRPanel.snapToHead(xrCam);
    }

    this.emitState();
  }

  onXRSessionEnded(): void {
    this.isInVR = false;
    this.vrPanelVisible = true;
    this.vrFoveationActive = false;
    this.vrContainerGliding = false;
    this.vrVignetteStrength = 0;
    if (this.vrVignetteMesh) {
      this.vrVignetteMesh.visible = false;
    }

    const renderer = xb.core.renderer as THREE.WebGLRenderer;
    renderer.shadowMap.enabled = !this.isSoftwareGl;
    renderer.shadowMap.needsUpdate = true;

    if (this.spatialVRPanel) {
      this.spatialVRPanel.visible = false;
    }
    this.spacecraftContainer.rotation.set(0, 0, 0);
    this.spacecraftContainer.position.set(0, 0, 0);
    this.resetCameraView();
    this.emitState();
  }

  setSplitVRMode(enabled: boolean, preferredTrackMode?: HeadTrackingMode): void {
    if (this.isInVR) return;
    if (this.splitVRMode === enabled) return;

    this.splitVRMode = enabled;
    const renderer = xb.core.renderer as THREE.WebGLRenderer | undefined;

    if (enabled) {
      this.stereoCamera.eyeSep = this.splitStereoDepth;
      this.stereoCamera.aspect = 1.0;
      this.headGazeEnabled = true;

      if (renderer) {
        // VR stereo optimization: skip expensive shadow re-passes & cap DPR for steady 60-120fps
        renderer.shadowMap.enabled = false;
        renderer.setPixelRatio(
          this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)
        );
      }

      xb.core.renderSceneOverride = (r, scene, camera) => {
        this.renderSplitStereo(r as THREE.WebGLRenderer, scene, camera);
      };

      if (preferredTrackMode && preferredTrackMode !== 'off') {
        void this.setHeadTrackingMode(preferredTrackMode);
      } else if (this.headTrackingMode === 'off') {
        const isTouchLike =
          (navigator.maxTouchPoints ?? 0) > 0 ||
          (window.matchMedia?.('(pointer: coarse)').matches ?? false);
        void this.setHeadTrackingMode(isTouchLike ? 'imu' : 'cursor');
      }
    } else {
      xb.core.renderSceneOverride = undefined;
      if (renderer) {
        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(
          this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
        );
        renderer.shadowMap.enabled = !this.isSoftwareGl;
        renderer.shadowMap.needsUpdate = true;
      }
    }

    this.emitState();
  }

  toggleSplitVRMode(): void {
    this.setSplitVRMode(!this.splitVRMode);
  }

  toggleSplitStereoDepth(): void {
    this.splitStereoDepth = this.splitStereoDepth === 0 ? 0.02 : 0;
    this.emitState();
  }

  adjustSplitEyeScale(delta: number): void {
    const stepped = Math.round((this.splitEyeScale + delta) * 20) / 20;
    this.splitEyeScale = THREE.MathUtils.clamp(stepped, 0.7, 1.0);
    this.emitState();
  }

  private renderSplitStereo(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ): void {
    renderer.getSize(_renderSize);
    const fullW = _renderSize.x;
    const fullH = _renderSize.y;
    const halfW = Math.floor(fullW / 2);
    const eyeBoxW = Math.max(64, Math.floor(halfW * this.splitEyeScale));
    const leftX = halfW - eyeBoxW;
    const rightX = halfW;

    const prevScissor = renderer.getScissorTest();
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, fullW, fullH);
    renderer.setClearColor(0x04070d, 1);
    renderer.clear(true, true, true);

    if (camera instanceof THREE.PerspectiveCamera) {
      const origAspect = camera.aspect;
      const origFov = camera.fov;
      const origFocus = camera.focus;

      camera.aspect = eyeBoxW / Math.max(fullH, 1);
      camera.fov = 76;
      camera.focus = 1.4;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();

      this.stereoCamera.eyeSep = this.splitStereoDepth;
      this.stereoCamera.aspect = 1.0;
      this.stereoCamera.update(camera);

      // Restore main camera projection immediately so raycasters stay aligned
      camera.aspect = origAspect;
      camera.fov = origFov;
      camera.focus = origFocus;
      camera.updateProjectionMatrix();

      renderer.setScissorTest(true);

      // Left Eye Viewport (snug to center divider)
      renderer.setScissor(leftX, 0, eyeBoxW, fullH);
      renderer.setViewport(leftX, 0, eyeBoxW, fullH);
      renderer.render(scene, this.stereoCamera.cameraL);

      // Right Eye Viewport (snug to center divider)
      renderer.setScissor(rightX, 0, eyeBoxW, fullH);
      renderer.setViewport(rightX, 0, eyeBoxW, fullH);
      renderer.render(scene, this.stereoCamera.cameraR);

      renderer.setScissorTest(prevScissor);
      renderer.setViewport(0, 0, fullW, fullH);
    } else {
      renderer.render(scene, camera);
    }
  }

  async enterVRSession(): Promise<void> {
    try {
      if (detectEmbeddedIframe() && !detectDedicatedXRHeadset()) {
        this.headGazeEnabled = true;
        await this.setHeadTrackingMode('imu');
        this.emitState();
        return;
      }

      const manager = xb.core.webXRSessionManager;
      if (!manager || !manager.isXRSupported()) {
        this.onError(
          'WebXR headset session is unavailable on this browser/device.'
        );
        return;
      }
      manager.startSession();
    } catch (err) {
      this.onError(
        err instanceof Error ? err.message : 'Failed to start WebXR session.'
      );
    }
  }

  async exitVRSession(): Promise<void> {
    try {
      await xb.core.webXRSessionManager?.endSession();
    } catch {
      // Ignore session end failures
    }
  }

  loadMission(id: SpacecraftId): void {
    if (!this.textures || !this.annotationSystem) return;
    this.clearVrFactTimer();
    this.clearFactsTimers();
    this.factsVisible = false;
    this.factsSecondsLeft = 0;
    this.vrPanelAutoOpenedForFacts = false;
    this.missionId = id;
    this.mode = 'explore';
    this.selectedAnnotationId = null;
    this.hoveredAnnotationId = null;
    this.timelineIndex = 0;
    this.timelinePlaying = false;
    this.showUpgradeComparison = false;
    this.gazeHitId = null;
    this.gazeDwellTime = 0;
    this.gazeTriggeredId = null;

    // Tear down previous spacecraft meshes
    this.annotationSystem.clear();
    if (this.currentScene) {
      this.currentScene.root.removeFromParent();
      this.currentScene.dispose();
      this.currentScene = null;
    }

    const built = buildSpacecraftScene(id, this.textures);
    this.currentScene = built;
    this.spacecraftContainer.add(built.root);
    this.spacecraftContainer.rotation.set(0, 0, 0);

    const mission = this.getCurrentMission();
    this.annotationSystem.mountAnnotations(
      mission.annotations,
      built.componentAnchors
    );
    this.annotationSystem.setSelectedId(null);

    if (this.isInVR) {
      this.spacecraftContainer.position.set(
        -mission.spawnPosition[0] * 0.65,
        0,
        -mission.spawnPosition[2] * 0.84
      );
    } else {
      this.spacecraftContainer.position.set(0, 0, 0);
    }

    this.invalidateShadows();
    this.resetCameraView(true);
    this.emitState();
  }

  private invalidateShadows(): void {
    const renderer = xb.core.renderer as THREE.WebGLRenderer | undefined;
    if (renderer && renderer.shadowMap.enabled) {
      renderer.shadowMap.needsUpdate = true;
    }
  }

  resetCameraView(immediate = false): void {
    const mission = this.getCurrentMission();
    this.glideCameraTo(
      mission.spawnPosition,
      mission.spawnLookAt,
      immediate
    );
    if (this.headTrackingMode !== 'off') {
      this.recenterHeadTracking();
    }
  }

  glideCameraTo(
    posArr: [number, number, number],
    lookArr: [number, number, number],
    immediate = false
  ): void {
    const targetPos = new THREE.Vector3(...posArr);
    const lookTarget = new THREE.Vector3(...lookArr);
    _lookMat.lookAt(targetPos, lookTarget, _up);
    _targetQuat.setFromRotationMatrix(_lookMat);
    _euler.setFromQuaternion(_targetQuat, 'YXZ');

    this.camTargetPos.copy(targetPos);
    this.targetYaw = _euler.y;
    this.targetPitch = THREE.MathUtils.clamp(_euler.x, -1.25, 1.25);

    if (immediate) {
      this.camPos.copy(this.camTargetPos);
      this.camYaw = this.targetYaw;
      this.camPitch = this.targetPitch;
      this.camQuat.setFromEuler(_euler.set(this.camPitch, this.camYaw, 0, 'YXZ'));
      this.cameraGliding = false;
      this.applyCameraTransform();
    } else {
      this.cameraGliding = true;
    }
  }

  private clearVrFactTimer(): void {
    if (this.vrFactAutoCloseTimer !== null) {
      window.clearTimeout(this.vrFactAutoCloseTimer);
      this.vrFactAutoCloseTimer = null;
    }
    if (this.vrFactCountdownInterval !== null) {
      window.clearInterval(this.vrFactCountdownInterval);
      this.vrFactCountdownInterval = null;
    }
    this.factSecondsLeft = 0;
  }

  private clearFactsTimers(): void {
    if (this.factsAutoCloseTimer !== null) {
      window.clearTimeout(this.factsAutoCloseTimer);
      this.factsAutoCloseTimer = null;
    }
    if (this.factsCountdownInterval !== null) {
      window.clearInterval(this.factsCountdownInterval);
      this.factsCountdownInterval = null;
    }
  }

  toggleFacts(force?: boolean): void {
    const next = force !== undefined ? force : !this.factsVisible;
    this.clearFactsTimers();

    if (!next) {
      this.factsVisible = false;
      this.factsSecondsLeft = 0;
      if (this.vrPanelAutoOpenedForFacts) {
        this.vrPanelAutoOpenedForFacts = false;
        if (this.isInVR && this.spatialVRPanel) {
          this.vrPanelVisible = false;
          this.spatialVRPanel.visible = false;
        }
      }
      this.emitState();
      return;
    }

    this.clearVrFactTimer();
    this.selectedAnnotationId = null;
    this.annotationSystem?.setSelectedId(null);

    this.factsVisible = true;
    this.factsSecondsLeft = 5;

    if (this.isInVR && this.spatialVRPanel && !this.vrPanelVisible) {
      this.vrPanelAutoOpenedForFacts = true;
      this.vrPanelVisible = true;
      this.spatialVRPanel.visible = true;
      const renderer = xb.core.renderer as THREE.WebGLRenderer;
      const xrCam = renderer?.xr?.getCamera();
      if (xrCam) this.spatialVRPanel.snapToHead(xrCam);
    } else {
      this.vrPanelAutoOpenedForFacts = false;
    }

    this.factsCountdownInterval = window.setInterval(() => {
      if (!this.factsVisible) {
        this.clearFactsTimers();
        return;
      }
      this.factsSecondsLeft = Math.max(0, this.factsSecondsLeft - 1);
      this.emitState();
    }, 1000);

    this.factsAutoCloseTimer = window.setTimeout(() => {
      this.toggleFacts(false);
    }, 5000);

    this.emitState();
  }

  setMode(mode: ExplorerMode): void {
    this.clearVrFactTimer();
    this.clearFactsTimers();
    this.factsVisible = false;
    this.factsSecondsLeft = 0;
    this.mode = mode;
    this.timelinePlaying = false;
    this.timelinePlayElapsed = 0;

    if (mode === 'investigate') {
      this.goToTimelineStep(0);
    } else {
      this.selectedAnnotationId = null;
      this.annotationSystem?.setSelectedId(null);
      this.resetCameraView();
      this.invalidateShadows();
      this.emitState();
    }
  }

  selectAnnotation(id: string | null, glideInVR = false): void {
    this.clearVrFactTimer();
    if (id !== null && this.factsVisible) {
      this.clearFactsTimers();
      this.factsVisible = false;
      this.factsSecondsLeft = 0;
      this.vrPanelAutoOpenedForFacts = false;
    }

    this.selectedAnnotationId = id;
    this.annotationSystem?.setSelectedId(id);

    if (id) {
      const ann = this.getCurrentMission().annotations.find((a) => a.id === id);
      if (ann) {
        if (this.isInVR && glideInVR) {
          this.vrGlideToFocus(ann.focusLookAt);
        } else if (!this.isInVR && this.headTrackingMode === 'off') {
          this.glideCameraTo(ann.focusCameraPosition, ann.focusLookAt);
        }
      }

      if (this.isInVR && this.spatialVRPanel && !this.vrPanelVisible) {
        this.vrPanelVisible = true;
        this.spatialVRPanel.visible = true;
        const renderer = xb.core.renderer as THREE.WebGLRenderer;
        const xrCam = renderer?.xr?.getCamera();
        if (xrCam) this.spatialVRPanel.snapToHead(xrCam);
      }

      // Show component facts for 5 seconds on the VR side and auto-exit cleanly
      if (this.mode === 'explore') {
        this.factSecondsLeft = 5;
        this.vrFactCountdownInterval = window.setInterval(() => {
          if (this.selectedAnnotationId !== id || this.mode !== 'explore') {
            this.clearVrFactTimer();
            return;
          }
          this.factSecondsLeft = Math.max(0, this.factSecondsLeft - 1);
          this.emitState();
        }, 1000);

        this.vrFactAutoCloseTimer = window.setTimeout(() => {
          this.vrFactAutoCloseTimer = null;
          if (this.selectedAnnotationId === id && this.mode === 'explore') {
            this.selectAnnotation(null);
          }
        }, 5000);
      }
    }
    this.emitState();
  }

  setHoveredAnnotation(id: string | null): void {
    if (this.hoveredAnnotationId === id) return;
    this.hoveredAnnotationId = id;
    this.annotationSystem?.setHoveredId(id);
    if (this.domElement) {
      this.domElement.style.cursor = id ? 'pointer' : 'grab';
    }
    this.emitState();
  }

  goToTimelineStep(index: number): void {
    this.clearVrFactTimer();
    this.clearFactsTimers();
    this.factsVisible = false;
    this.factsSecondsLeft = 0;
    const mission = this.getCurrentMission();
    const clamped = THREE.MathUtils.clamp(index, 0, mission.timeline.length - 1);
    this.timelineIndex = clamped;
    this.timelinePlayElapsed = 0;

    const step = mission.timeline[clamped];
    this.selectedAnnotationId = step.focusAnnotationId;
    this.annotationSystem?.setSelectedId(step.focusAnnotationId);

    if (this.isInVR) {
      this.vrGlideToFocus(step.cameraLookAt);
    } else if (this.headTrackingMode === 'off') {
      this.glideCameraTo(step.cameraPosition, step.cameraLookAt);
    }
    this.invalidateShadows();
    this.emitState();
  }

  private vrGlideToFocus(localFocusLookAt: [number, number, number]): void {
    const renderer = xb.core.renderer as THREE.WebGLRenderer;
    const xrCam = renderer?.xr?.getCamera();
    if (!xrCam) return;

    xrCam.getWorldPosition(_xrHeadPos);
    xrCam.getWorldDirection(_xrHeadFwd);
    _xrHeadFwd.y = 0;
    if (_xrHeadFwd.lengthSq() < 0.0001) {
      _xrHeadFwd.set(0, 0, -1);
    } else {
      _xrHeadFwd.normalize();
    }

    // Place target component ~1.08m ahead of current VR gaze direction without rotating camera
    _pivotOffset.set(
      localFocusLookAt[0],
      localFocusLookAt[1],
      localFocusLookAt[2]
    );
    _pivotOffset.applyQuaternion(this.spacecraftContainer.quaternion);

    this.vrContainerTargetPos
      .copy(_xrHeadPos)
      .addScaledVector(_xrHeadFwd, 1.08)
      .sub(_pivotOffset);
    this.vrContainerTargetPos.x = THREE.MathUtils.clamp(
      this.vrContainerTargetPos.x,
      -2.6,
      2.6
    );
    this.vrContainerTargetPos.y = THREE.MathUtils.clamp(
      this.vrContainerTargetPos.y - 0.08,
      -0.95,
      0.95
    );
    this.vrContainerTargetPos.z = THREE.MathUtils.clamp(
      this.vrContainerTargetPos.z,
      -2.6,
      2.6
    );
    this.vrContainerGliding = true;
  }

  stepTimeline(delta: number): void {
    const mission = this.getCurrentMission();
    const next =
      (this.timelineIndex + delta + mission.timeline.length) %
      mission.timeline.length;
    this.goToTimelineStep(next);
  }

  setTimelinePlaying(playing: boolean): void {
    this.timelinePlaying = playing;
    this.timelinePlayElapsed = 0;
    this.emitState();
  }

  toggleAnnotations(): void {
    if (!this.annotationSystem) return;
    this.annotationsVisible = !this.annotationsVisible;
    this.annotationSystem.setVisible(this.annotationsVisible);
    this.emitState();
  }

  toggleExplanationDepth(): void {
    this.depth = this.depth === 'simple' ? 'advanced' : 'simple';
    this.emitState();
  }

  toggleUpgradeComparison(): void {
    this.showUpgradeComparison = !this.showUpgradeComparison;
    this.invalidateShadows();
    this.emitState();
  }

  setHeadGazeEnabled(enabled: boolean): void {
    if (this.headGazeEnabled === enabled) return;
    this.headGazeEnabled = enabled;
    this.gazeHitId = null;
    this.gazeDwellTime = 0;
    this.gazeTriggeredId = null;
    this.emitState();
  }

  toggleHeadGaze(): void {
    this.setHeadGazeEnabled(!this.headGazeEnabled);
  }

  toggleVRPanel(force?: boolean): void {
    if (!this.isInVR || !this.spatialVRPanel) return;
    const next = force !== undefined ? force : !this.vrPanelVisible;
    this.vrPanelVisible = next;
    this.spatialVRPanel.visible = next;
    if (next) {
      const renderer = xb.core.renderer as THREE.WebGLRenderer;
      const xrCam = renderer?.xr?.getCamera();
      if (xrCam) this.spatialVRPanel.snapToHead(xrCam);
    }
    this.emitState();
  }

  recenterHeadTracking(): void {
    if (this.isInVR) {
      const renderer = xb.core.renderer as THREE.WebGLRenderer;
      const xrCam = renderer.xr.getCamera();
      this.spatialVRPanel?.snapToHead(xrCam);
      return;
    }

    if (this.headTrackingMode === 'imu') {
      this.imuCalibrated = false;
      return;
    }

    if (this.headTrackingMode === 'webcam') {
      this.webcamTracker.recenter();
      this.webcamBaseYaw = this.camYaw;
      this.webcamBasePitch = this.camPitch;
      return;
    }

    if (this.headTrackingMode === 'cursor') {
      this.cursorRefX = null;
      this.cursorRefY = null;
      this.cursorBaseYaw = this.camYaw;
      this.cursorBasePitch = this.camPitch;
      return;
    }

    this.resetCameraView();
  }

  setMobileMoveInput(strafeX: number, forwardZ: number, verticalY = 0): void {
    this.mobileMoveVec.set(strafeX, verticalY, forwardZ);
    if (this.mobileMoveVec.lengthSq() > 0.001) {
      this.cameraGliding = false;
    }
  }

  private clearImuTimeout(): void {
    if (this.imuTimeoutId !== null) {
      window.clearTimeout(this.imuTimeoutId);
      this.imuTimeoutId = null;
    }
  }

  async setHeadTrackingMode(mode: HeadTrackingMode): Promise<void> {
    if (mode === 'webxr' || this.isInVR) return;
    if (this.headTrackingMode === mode) return;

    // Tear down prior tracking mode cleanly
    this.clearImuTimeout();
    window.removeEventListener('deviceorientation', this.boundDeviceOrientation);
    window.removeEventListener(
      'deviceorientationabsolute',
      this.boundDeviceOrientationAbs
    );
    this.webcamTracker.stop();
    this.imuHasLiveReading = false;
    this.imuCalibrated = false;
    this.cursorRefX = null;
    this.cursorRefY = null;

    if (mode === 'off') {
      this.headTrackingMode = 'off';
      this.targetYaw = this.camYaw;
      this.targetPitch = this.camPitch;
      this.emitState();
      return;
    }

    if (mode === 'imu') {
      this.headTrackingMode = 'imu';
      this.imuTargetQuat.copy(this.camQuat);
      this.headGazeEnabled = true;
      window.addEventListener('deviceorientation', this.boundDeviceOrientation);
      window.addEventListener(
        'deviceorientationabsolute',
        this.boundDeviceOrientationAbs
      );

      // Verify hardware gyro actually delivers readings; fallback cleanly on desktops without IMU
      this.imuTimeoutId = window.setTimeout(() => {
        this.imuTimeoutId = null;
        if (this.headTrackingMode === 'imu' && !this.imuHasLiveReading) {
          this.onError(
            'No hardware gyroscope sensor detected. Switched to Cursor Head-Look (or choose Webcam Head Track).'
          );
          void this.setHeadTrackingMode('cursor');
        }
      }, 950);
      this.emitState();
      return;
    }

    if (mode === 'webcam') {
      try {
        await this.webcamTracker.start();
        this.headTrackingMode = 'webcam';
        this.webcamBaseYaw = this.camYaw;
        this.webcamBasePitch = this.camPitch;
        this.headGazeEnabled = true;
        this.emitState();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Webcam permission denied.';
        this.onError(
          `Webcam head tracking unavailable (${msg}). Switched to Cursor Head-Look.`
        );
        await this.setHeadTrackingMode('cursor');
      }
      return;
    }

    if (mode === 'cursor') {
      this.headTrackingMode = 'cursor';
      this.cursorBaseYaw = this.camYaw;
      this.cursorBasePitch = this.camPitch;
      this.cursorRefX = null;
      this.cursorRefY = null;
      this.headGazeEnabled = true;
      this.emitState();
    }
  }

  setGyroEnabled(enabled: boolean): void {
    void this.setHeadTrackingMode(enabled ? 'imu' : 'off');
  }

  getCurrentMission(): SpacecraftMissionData {
    return SPACECRAFT_MISSIONS[this.missionId];
  }

  private getHeadTrackingLabel(): string {
    if (this.isInVR) return 'VR 6DoF Head + Gaze';
    switch (this.headTrackingMode) {
      case 'imu':
        return this.imuHasLiveReading
          ? 'IMU 3DoF Head Tracking'
          : 'Calibrating Gyro Head Track…';
      case 'webcam':
        return 'Webcam Optical Head Tracking';
      case 'cursor':
        return 'Cursor Free Head-Look';
      default:
        return this.headGazeEnabled ? 'Drag Look + Gaze' : 'Drag / Touch Look';
    }
  }

  getSnapshot(): ExplorerStateSnapshot {
    const mission = this.getCurrentMission();
    const selectedAnnotation =
      mission.annotations.find((a) => a.id === this.selectedAnnotationId) ?? null;
    const currentStep =
      this.mode === 'investigate'
        ? mission.timeline[this.timelineIndex] ?? null
        : null;

    return {
      mission,
      mode: this.mode,
      depth: this.depth,
      annotationsVisible: this.annotationsVisible,
      showUpgradeComparison: this.showUpgradeComparison,
      selectedAnnotation,
      hoveredAnnotationId: this.hoveredAnnotationId,
      timelineIndex: this.timelineIndex,
      timelinePlaying: this.timelinePlaying,
      currentStep,
      isInVR: this.isInVR,
      splitVRMode: this.splitVRMode,
      splitStereoDepth: this.splitStereoDepth,
      splitEyeScale: this.splitEyeScale,
      vrPanelVisible: this.vrPanelVisible,
      vrFoveationActive: this.vrFoveationActive,
      gyroEnabled: this.headTrackingMode !== 'off',
      headTrackingMode: this.isInVR ? 'webxr' : this.headTrackingMode,
      headGazeEnabled: this.headGazeEnabled,
      headTrackingLabel: this.getHeadTrackingLabel(),
      factAutoCloseActive: this.vrFactAutoCloseTimer !== null,
      factSecondsLeft: this.factSecondsLeft,
      factsVisible: this.factsVisible,
      factsSecondsLeft: this.factsSecondsLeft,
      contextLost: this.contextLost,
    };
  }

  private emitState(): void {
    const snap = this.getSnapshot();
    this.spatialVRPanel?.syncState({
      mission: snap.mission,
      mode: snap.mode,
      depth: snap.depth,
      annotationsVisible: snap.annotationsVisible,
      showUpgradeComparison: snap.showUpgradeComparison,
      headGazeEnabled: snap.headGazeEnabled,
      factsVisible: snap.factsVisible,
      factsSecondsLeft: snap.factsSecondsLeft,
      factSecondsLeft: snap.factSecondsLeft,
      annotation: snap.selectedAnnotation,
      timelineStep: snap.currentStep,
    });
    this.onStateChange(snap);
  }

  update(): void {
    const now = performance.now();
    const dt = Math.min((now - this.lastFrameMs) / 1000, 0.05);
    this.lastFrameMs = now;
    this.elapsed += dt;

    // 1. Update visual state of active spacecraft & scientific animations
    const visualState: InvestigationVisualState =
      this.mode === 'investigate'
        ? this.getCurrentMission().timeline[this.timelineIndex]?.visualState ??
          'nominal'
        : this.showUpgradeComparison
          ? 'upgraded'
          : 'nominal';

    this.currentScene?.updateVisualState(
      visualState,
      this.elapsed,
      dt,
      this.showUpgradeComparison
    );

    // 2. Auto-play investigation timeline
    if (this.mode === 'investigate' && this.timelinePlaying) {
      this.timelinePlayElapsed += dt;
      if (this.timelinePlayElapsed >= 6.5) {
        const len = this.getCurrentMission().timeline.length;
        if (this.timelineIndex < len - 1) {
          this.goToTimelineStep(this.timelineIndex + 1);
        } else {
          this.timelinePlaying = false;
          this.emitState();
        }
      }
    }

    const renderer = xb.core.renderer as THREE.WebGLRenderer;
    const activeCamera =
      this.isInVR && renderer?.xr?.isPresenting
        ? renderer.xr.getCamera()
        : xb.core.camera;

    // 3. VR Controller Locomotion + Head-Follow Console vs Desktop/Mobile Navigation
    if (this.isInVR) {
      this.updateVRControllerLocomotion(activeCamera, dt);
      this.updateVRComfortVignette(activeCamera, dt);
      if (this.vrPanelVisible) {
        this.spatialVRPanel?.updateHeadFollow(activeCamera, dt);
      }
    } else {
      this.updateCameraNavigation(dt);
    }

    // 4. Head-Tracked Gaze Reticle & Dwell-to-Inspect
    this.updateHeadGaze(activeCamera, dt);

    // 5. Update 3D marker billboards & highlight rings
    this.annotationSystem?.update(activeCamera, this.elapsed);
  }

  private applyVRStickCurve(raw: number, deadzone = 0.14): number {
    const abs = Math.abs(raw);
    if (abs <= deadzone) return 0;
    const norm = (abs - deadzone) / (1 - deadzone);
    return Math.sign(raw) * Math.pow(norm, 1.55);
  }

  private updateVRControllerLocomotion(activeCamera: THREE.Camera, dt: number): void {
    const renderer = xb.core.renderer as THREE.WebGLRenderer;
    const session = renderer?.xr?.getSession();
    if (!session) return;

    if (this.vrSnapTurnCooldown > 0) {
      this.vrSnapTurnCooldown = Math.max(0, this.vrSnapTurnCooldown - dt);
    }

    activeCamera.getWorldPosition(_xrHeadPos);
    activeCamera.getWorldDirection(_xrHeadFwd);
    _xrHeadFwd.y = 0;
    if (_xrHeadFwd.lengthSq() < 0.0001) {
      _xrHeadFwd.set(0, 0, -1);
    } else {
      _xrHeadFwd.normalize();
    }
    _xrHeadRight.crossVectors(_xrHeadFwd, _up).normalize();

    let moveX = 0;
    let moveZ = 0;
    let moveY = 0;
    let turnInput = 0;
    let togglePressed = false;

    for (const src of session.inputSources) {
      const gp = src.gamepad;
      if (!gp) continue;

      // Secondary face button (B / Y) toggles the floating VR Console cleanly
      if (gp.buttons[5]?.pressed) {
        togglePressed = true;
      }

      if (gp.axes.length < 2) continue;
      const axX = gp.axes.length >= 4 ? gp.axes[2] : gp.axes[0];
      const axY = gp.axes.length >= 4 ? gp.axes[3] : gp.axes[1];

      if (src.handedness === 'right') {
        if (Math.abs(axX) > 0.55) turnInput = axX;
        const shapedY = this.applyVRStickCurve(-axY, 0.18);
        if (shapedY !== 0) moveY = shapedY;
      } else {
        const shapedX = this.applyVRStickCurve(axX, 0.14);
        const shapedZ = this.applyVRStickCurve(-axY, 0.14);
        if (shapedX !== 0) moveX = shapedX;
        if (shapedZ !== 0) moveZ = shapedZ;
      }
    }

    if (togglePressed) {
      if (!this.vrToggleButtonLatch) {
        this.vrToggleButtonLatch = true;
        this.toggleVRPanel();
      }
    } else {
      this.vrToggleButtonLatch = false;
    }

    const moveSpeedMag = Math.hypot(moveX, moveZ, moveY * 0.7);
    if (moveSpeedMag > 0.01) {
      this.vrContainerGliding = false;
      const hSpeed = 1.55;
      const vSpeed = 1.05;
      _moveDelta
        .set(0, 0, 0)
        .addScaledVector(_xrHeadFwd, -moveZ * hSpeed * dt)
        .addScaledVector(_xrHeadRight, -moveX * hSpeed * dt);
      _moveDelta.y -= moveY * vSpeed * dt;

      this.spacecraftContainer.position.add(_moveDelta);
      this.spacecraftContainer.position.x = THREE.MathUtils.clamp(
        this.spacecraftContainer.position.x,
        -2.6,
        2.6
      );
      this.spacecraftContainer.position.y = THREE.MathUtils.clamp(
        this.spacecraftContainer.position.y,
        -0.95,
        0.95
      );
      this.spacecraftContainer.position.z = THREE.MathUtils.clamp(
        this.spacecraftContainer.position.z,
        -2.6,
        2.6
      );
    } else if (this.vrContainerGliding) {
      const alpha = 1 - Math.exp(-5.0 * dt);
      this.spacecraftContainer.position.lerp(this.vrContainerTargetPos, alpha);
      if (this.spacecraftContainer.position.distanceToSquared(this.vrContainerTargetPos) < 0.0004) {
        this.vrContainerGliding = false;
      }
    }

    // Comfort 30-degree Snap Turn around current VR head position
    let snappedThisFrame = false;
    if (Math.abs(turnInput) > 0.65) {
      if (!this.vrSnapTurnLatch && this.vrSnapTurnCooldown <= 0) {
        this.vrContainerGliding = false;
        const angle = turnInput > 0 ? Math.PI / 6 : -Math.PI / 6;
        _pivotOffset.copy(this.spacecraftContainer.position).sub(_xrHeadPos);
        _snapQuat.setFromAxisAngle(_up, angle);
        _pivotOffset.applyQuaternion(_snapQuat);
        this.spacecraftContainer.position.copy(_xrHeadPos).add(_pivotOffset);
        this.spacecraftContainer.quaternion.premultiply(_snapQuat);
        this.vrSnapTurnLatch = true;
        this.vrSnapTurnCooldown = 0.28;
        snappedThisFrame = true;
      }
    } else {
      this.vrSnapTurnLatch = false;
    }

    // Drive peripheral comfort vignette strength smoothly
    const targetVignette = snappedThisFrame
      ? 0.56
      : THREE.MathUtils.clamp(moveSpeedMag * 0.52, 0, 0.62);
    const vignetteLambda = targetVignette > this.vrVignetteStrength ? 14 : 7;
    this.vrVignetteStrength = THREE.MathUtils.damp(
      this.vrVignetteStrength,
      targetVignette,
      vignetteLambda,
      dt
    );
  }

  private updateVRComfortVignette(activeCamera: THREE.Camera, _dt: number): void {
    const mesh = this.vrVignetteMesh;
    const mat = this.vrVignetteMat;
    if (!mesh || !mat) return;

    if (this.vrVignetteStrength < 0.01) {
      mesh.visible = false;
      return;
    }

    mesh.visible = true;
    mat.uniforms.uStrength.value = this.vrVignetteStrength;
    activeCamera.getWorldPosition(_gazeOrigin);
    activeCamera.getWorldDirection(_gazeDir);
    _gazePos.copy(_gazeOrigin).addScaledVector(_gazeDir, 0.36);
    mesh.position.copy(_gazePos);
    mesh.lookAt(_gazeOrigin);
  }

  private updateHeadGaze(activeCamera: THREE.Camera, dt: number): void {
    const reticle = this.headReticleMesh;
    const mat = this.headReticleMat;
    if (!reticle || !mat) return;

    const active =
      (this.headGazeEnabled || this.isInVR || this.splitVRMode) &&
      this.annotationsVisible;
    if (!active) {
      reticle.visible = false;
      this.gazeHitId = null;
      this.gazeDwellTime = 0;
      return;
    }

    activeCamera.getWorldPosition(_gazeOrigin);
    activeCamera.getWorldDirection(_gazeDir);

    let hitId: string | null = null;
    let hitDist = 1.45;

    const targets = this.annotationSystem?.getHitMeshes() ?? [];
    if (targets.length > 0) {
      _raycaster.set(_gazeOrigin, _gazeDir);
      const hits = _raycaster.intersectObjects(targets, false);
      if (hits.length > 0) {
        hitId = (hits[0].object.userData.annotationId as string) ?? null;
        hitDist = THREE.MathUtils.clamp(hits[0].distance - 0.04, 0.62, 3.5);
      }
    }

    reticle.visible = true;
    _gazePos.copy(_gazeOrigin).addScaledVector(_gazeDir, hitDist);
    reticle.position.copy(_gazePos);
    reticle.lookAt(_gazeOrigin);
    reticle.scale.setScalar(hitDist * 0.78);

    if (hitId) {
      if (hitId !== this.gazeHitId) {
        this.gazeHitId = hitId;
        this.gazeDwellTime = 0;
        this.setHoveredAnnotation(hitId);
      }
      if (hitId !== this.gazeTriggeredId) {
        this.gazeDwellTime += dt;
        const progress = Math.min(this.gazeDwellTime / DWELL_TRIGGER_SECONDS, 1);
        mat.uniforms.uHover.value = 1;
        mat.uniforms.uProgress.value = progress;
        if (this.gazeDwellTime >= DWELL_TRIGGER_SECONDS) {
          this.gazeTriggeredId = hitId;
          this.selectAnnotation(hitId);
        }
      } else {
        mat.uniforms.uHover.value = 1;
        mat.uniforms.uProgress.value = 1;
      }
    } else {
      if (this.gazeHitId !== null) {
        this.gazeHitId = null;
        this.setHoveredAnnotation(null);
      }
      this.gazeDwellTime = 0;
      this.gazeTriggeredId = null;
      mat.uniforms.uHover.value = 0;
      mat.uniforms.uProgress.value = 0;
    }
  }

  private updateCameraNavigation(dt: number): void {
    const mission = this.getCurrentMission();
    const speed = 1.45;

    // Gather keyboard WASD + Arrow + Q/E inputs
    let moveForward = 0;
    let moveRight = 0;
    let moveUp = 0;

    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) moveForward += 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) moveForward -= 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) moveRight += 1;
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) moveRight -= 1;
    if (this.keysDown.has('KeyE') || this.keysDown.has('Space')) moveUp += 1;
    if (this.keysDown.has('KeyQ') || this.keysDown.has('ShiftLeft')) moveUp -= 1;

    moveRight += this.mobileMoveVec.x;
    moveForward += this.mobileMoveVec.z;
    moveUp += this.mobileMoveVec.y;

    if (
      Math.abs(moveForward) > 0.01 ||
      Math.abs(moveRight) > 0.01 ||
      Math.abs(moveUp) > 0.01
    ) {
      this.cameraGliding = false;
      _forward.set(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw)).normalize();
      _right.set(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw)).normalize();

      _moveDelta
        .set(0, 0, 0)
        .addScaledVector(_forward, moveForward * speed * dt)
        .addScaledVector(_right, moveRight * speed * dt);
      _moveDelta.y += moveUp * speed * 0.8 * dt;

      this.camTargetPos.add(_moveDelta);
      this.camTargetPos.x = THREE.MathUtils.clamp(
        this.camTargetPos.x,
        mission.boundsMin[0],
        mission.boundsMax[0]
      );
      this.camTargetPos.y = THREE.MathUtils.clamp(
        this.camTargetPos.y,
        mission.boundsMin[1],
        mission.boundsMax[1]
      );
      this.camTargetPos.z = THREE.MathUtils.clamp(
        this.camTargetPos.z,
        mission.boundsMin[2],
        mission.boundsMax[2]
      );
    }

    // Poll optical webcam head tracker if active
    if (this.headTrackingMode === 'webcam') {
      const sample = this.webcamTracker.update(this.lastFrameMs);
      if (sample && sample.confidence > 0.05) {
        this.cameraGliding = false;
        this.targetYaw = this.webcamBaseYaw + sample.yawDelta;
        this.targetPitch = THREE.MathUtils.clamp(
          this.webcamBasePitch + sample.pitchDelta,
          -1.2,
          1.2
        );
      }
    }

    // Exponential damping for position and look angles
    const posLambda = this.cameraGliding ? 5.5 : 14;
    const rotLambda = this.cameraGliding ? 6.0 : 18;

    this.camPos.x = THREE.MathUtils.damp(this.camPos.x, this.camTargetPos.x, posLambda, dt);
    this.camPos.y = THREE.MathUtils.damp(this.camPos.y, this.camTargetPos.y, posLambda, dt);
    this.camPos.z = THREE.MathUtils.damp(this.camPos.z, this.camTargetPos.z, posLambda, dt);

    if (this.headTrackingMode === 'imu' && this.imuHasLiveReading) {
      // Smooth horizon-locked 3DoF quaternion slerp (yaw + pitch + natural head roll)
      const slerpAlpha = 1 - Math.exp(-22 * dt);
      this.camQuat.slerp(this.imuTargetQuat, slerpAlpha);
      _euler.setFromQuaternion(this.camQuat, 'YXZ');
      this.camYaw = _euler.y;
      this.camPitch = _euler.x;
    } else {
      let yawDiff = this.targetYaw - this.camYaw;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      this.camYaw += yawDiff * (1 - Math.exp(-rotLambda * dt));
      this.camPitch = THREE.MathUtils.damp(this.camPitch, this.targetPitch, rotLambda, dt);
      _euler.set(this.camPitch, this.camYaw, 0, 'YXZ');
      this.camQuat.setFromEuler(_euler);

      if (
        this.cameraGliding &&
        this.camPos.distanceToSquared(this.camTargetPos) < 0.0002 &&
        Math.abs(yawDiff) < 0.01
      ) {
        this.cameraGliding = false;
      }
    }

    this.applyCameraTransform();
  }

  private applyCameraTransform(): void {
    const camera = xb.core.camera;
    camera.position.copy(this.camPos);
    camera.quaternion.copy(this.camQuat);
  }

  onSqueezeStart(): void {
    if (this.isInVR) {
      this.toggleVRPanel();
    }
  }

  public setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    if (suspended) {
      this.keysDown.clear();
      this.activePointers.clear();
      this.isPointerDown = false;
      this.lastPinchDist = null;
      this.timelinePlaying = false;
      this.setSplitVRMode(false);
      void this.exitVRSession();
      void this.setHeadTrackingMode('off');
    } else {
      this.lastFrameMs = performance.now();
      this.handleResize();
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.suspended) return;
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }
    this.keysDown.add(e.code);
    if (e.code === 'KeyR') {
      this.recenterHeadTracking();
    } else if (e.code === 'KeyM') {
      this.toggleAnnotations();
    } else if (e.code === 'KeyG') {
      this.toggleHeadGaze();
    } else if (e.code === 'KeyV' && !this.isInVR) {
      this.toggleSplitVRMode();
    } else if (e.code === 'KeyH' && this.isInVR) {
      this.toggleVRPanel();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (this.suspended) return;
    this.keysDown.delete(e.code);
  }

  private getPinchDistance(): number | null {
    if (this.activePointers.size < 2) return null;
    const pts = Array.from(this.activePointers.values());
    return Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
  }

  private handlePointerDown(e: PointerEvent): void {
    if (this.suspended || this.isInVR) return;
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.activePointers.size >= 2) {
      this.wasMultiTouch = true;
      this.pointerTravelPx = 999;
      this.lastPinchDist = this.getPinchDistance();
      return;
    }

    this.wasMultiTouch = false;
    this.lastPinchDist = null;
    this.isPointerDown = true;
    this.pointerDownX = e.clientX;
    this.pointerDownY = e.clientY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.pointerTravelPx = 0;
    if (this.domElement) {
      this.domElement.style.cursor = 'grabbing';
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (this.suspended || this.isInVR) return;

    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Two-finger pinch/spread walks smoothly forward/backward without on-screen arrows
    if (this.activePointers.size >= 2) {
      const dist = this.getPinchDistance();
      if (dist !== null && this.lastPinchDist !== null) {
        const deltaDist = dist - this.lastPinchDist;
        if (Math.abs(deltaDist) > 0.25) {
          this.cameraGliding = false;
          const mission = this.getCurrentMission();
          _forward
            .set(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw))
            .normalize();
          this.camTargetPos.addScaledVector(_forward, deltaDist * 0.0085);
          this.camTargetPos.x = THREE.MathUtils.clamp(
            this.camTargetPos.x,
            mission.boundsMin[0],
            mission.boundsMax[0]
          );
          this.camTargetPos.z = THREE.MathUtils.clamp(
            this.camTargetPos.z,
            mission.boundsMin[2],
            mission.boundsMax[2]
          );
        }
      }
      this.lastPinchDist = dist;
      return;
    }

    if (this.isPointerDown) {
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.pointerTravelPx += Math.hypot(dx, dy);
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;

      if (this.pointerTravelPx > 3) {
        this.cameraGliding = false;
        const sensitivity = 0.0042;
        if (this.headTrackingMode === 'imu') {
          this.imuYawOffset -= dx * sensitivity;
        } else if (this.headTrackingMode === 'webcam') {
          this.webcamBaseYaw -= dx * sensitivity;
        } else if (this.headTrackingMode === 'cursor') {
          this.cursorBaseYaw -= dx * sensitivity;
          this.cursorBasePitch = THREE.MathUtils.clamp(
            this.cursorBasePitch - dy * sensitivity,
            -1.2,
            1.2
          );
        } else {
          this.targetYaw -= dx * sensitivity;
          this.targetPitch = THREE.MathUtils.clamp(
            this.targetPitch - dy * sensitivity,
            -1.25,
            1.25
          );
        }
      }
      return;
    }

    if (this.headTrackingMode === 'cursor') {
      if (e.target !== this.domElement) {
        this.cursorRefX = null;
        this.cursorRefY = null;
      } else {
        const nx = e.clientX / Math.max(window.innerWidth, 1);
        const ny = e.clientY / Math.max(window.innerHeight, 1);
        if (this.cursorRefX === null || this.cursorRefY === null) {
          this.cursorRefX = nx;
          this.cursorRefY = ny;
        } else {
          this.cameraGliding = false;
          this.targetYaw = this.cursorBaseYaw - (nx - this.cursorRefX) * 2.6;
          this.targetPitch = THREE.MathUtils.clamp(
            this.cursorBasePitch - (ny - this.cursorRefY) * 1.75,
            -1.2,
            1.2
          );
        }
      }
    }

    // Throttled hover raycast (~20fps) on marker hit proxies
    const now = performance.now();
    if (now - this.lastHoverCheckMs < 50) return;
    this.lastHoverCheckMs = now;

    if (!this.headGazeEnabled) {
      const hitId = this.raycastMarkers(e.clientX, e.clientY);
      this.setHoveredAnnotation(hitId);
    }
  }

  private handlePointerUp(e: PointerEvent): void {
    this.activePointers.delete(e.pointerId);
    if (this.activePointers.size < 2) {
      this.lastPinchDist = null;
    }

    // Hand off seamlessly to remaining finger after lifting second pinch finger
    if (this.activePointers.size === 1) {
      const remaining = Array.from(this.activePointers.values())[0];
      this.lastPointerX = remaining.x;
      this.lastPointerY = remaining.y;
      return;
    }

    if (!this.isPointerDown) return;
    this.isPointerDown = false;
    if (this.domElement) {
      this.domElement.style.cursor = this.hoveredAnnotationId
        ? 'pointer'
        : 'grab';
    }

    // Treat short click/tap (< 10px travel, not a pinch gesture) as 3D marker selection
    const totalDist = Math.hypot(
      e.clientX - this.pointerDownX,
      e.clientY - this.pointerDownY
    );
    const shouldTapSelect = !this.wasMultiTouch && totalDist < 10 && this.pointerTravelPx < 12;
    this.wasMultiTouch = false;
    if (shouldTapSelect) {
      const hitId = this.raycastMarkers(e.clientX, e.clientY);
      if (hitId) {
        this.selectAnnotation(hitId);
      }
    }
  }

  private handleWheel(e: WheelEvent): void {
    if (this.suspended || this.isInVR) return;
    e.preventDefault();
    this.cameraGliding = false;
    const mission = this.getCurrentMission();
    _forward.set(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw)).normalize();
    const step = -Math.sign(e.deltaY) * 0.24;
    this.camTargetPos.addScaledVector(_forward, step);
    this.camTargetPos.x = THREE.MathUtils.clamp(
      this.camTargetPos.x,
      mission.boundsMin[0],
      mission.boundsMax[0]
    );
    this.camTargetPos.z = THREE.MathUtils.clamp(
      this.camTargetPos.z,
      mission.boundsMin[2],
      mission.boundsMax[2]
    );
  }

  private handleDeviceOrientation(
    e: DeviceOrientationEvent,
    isAbsolute: boolean
  ): void {
    if (
      this.suspended ||
      this.headTrackingMode !== 'imu' ||
      e.alpha === null ||
      e.beta === null ||
      e.gamma === null
    ) {
      return;
    }

    // Prefer primary deviceorientation once live so duplicate absolute events don't fight
    if (isAbsolute && this.imuHasLiveReading) {
      return;
    }

    if (!this.imuHasLiveReading) {
      this.imuHasLiveReading = true;
      this.clearImuTimeout();
      this.emitState();
    }

    // Standard WebXR/Three.js DeviceOrientation world-frame quaternion (gimbal-free, horizon-locked)
    const alpha = THREE.MathUtils.degToRad(e.alpha);
    const beta = THREE.MathUtils.degToRad(e.beta);
    const gamma = THREE.MathUtils.degToRad(e.gamma);
    const screenAngleDeg =
      window.screen?.orientation?.angle ??
      (typeof window.orientation === 'number' ? window.orientation : 0);
    const orient = THREE.MathUtils.degToRad(screenAngleDeg);

    _imuEuler.set(beta, alpha, -gamma, 'YXZ');
    _imuQuat.setFromEuler(_imuEuler);
    _imuQuat.multiply(_imuScreenAdjust);
    _imuOrientQuat.setFromAxisAngle(_imuZAxis, -orient);
    _imuQuat.multiply(_imuOrientQuat);

    if (!this.imuCalibrated) {
      _imuFwd.set(0, 0, -1).applyQuaternion(_imuQuat);
      const curHeading = Math.atan2(-_imuFwd.x, -_imuFwd.z);
      this.imuYawOffset = this.camYaw - curHeading;
      this.imuCalibrated = true;
    }

    _imuYawOffsetQuat.setFromAxisAngle(_up, this.imuYawOffset);
    this.imuTargetQuat.copy(_imuYawOffsetQuat).multiply(_imuQuat);
  }

  private handleResize(): void {
    if (this.suspended) return;
    const camera = xb.core.camera;
    const renderer = xb.core.renderer as THREE.WebGLRenderer;
    if (!camera || !renderer || this.isInVR) return;
    camera.aspect =
      window.innerHeight > 0 ? window.innerWidth / window.innerHeight : 1.77;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private raycastMarkers(clientX: number, clientY: number): string | null {
    if (!this.annotationSystem || !this.domElement) return null;
    const targets = this.annotationSystem.getHitMeshes();
    if (targets.length === 0) return null;

    const rect = this.domElement.getBoundingClientRect();
    _pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    _raycaster.setFromCamera(_pointerNdc, xb.core.camera);
    const hits = _raycaster.intersectObjects(targets, false);
    if (hits.length > 0) {
      return (hits[0].object.userData.annotationId as string) ?? null;
    }
    return null;
  }

  dispose(): void {
    this.clearImuTimeout();
    this.clearVrFactTimer();
    this.clearFactsTimers();
    xb.core.webXRSessionManager?.removeEventListener(
      xb.WebXRSessionEventType.SESSION_ERROR,
      this.boundSessionError
    );
    xb.core.renderSceneOverride = undefined;
    this.webcamTracker.dispose();
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    window.removeEventListener('pointercancel', this.boundPointerCancel);
    window.removeEventListener('deviceorientation', this.boundDeviceOrientation);
    window.removeEventListener(
      'deviceorientationabsolute',
      this.boundDeviceOrientationAbs
    );

    if (this.domElement) {
      this.domElement.removeEventListener('pointerdown', this.boundPointerDown);
      this.domElement.removeEventListener('wheel', this.boundWheel);
      this.domElement.removeEventListener(
        'webglcontextlost',
        this.boundContextLost
      );
      this.domElement.removeEventListener(
        'webglcontextrestored',
        this.boundContextRestored
      );
    }

    if (this.headReticleMesh) {
      this.headReticleMesh.geometry.dispose();
    }
    this.headReticleMat?.dispose();
    if (this.vrVignetteMesh) {
      this.vrVignetteMesh.geometry.dispose();
    }
    this.vrVignetteMat?.dispose();
    this.annotationSystem?.dispose();
    this.currentScene?.dispose();
    this.textures?.dispose();
    this.envRT?.dispose();
  }
}
