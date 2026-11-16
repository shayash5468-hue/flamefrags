import * as THREE from 'three';

export type SpacecraftId = 'apollo1' | 'apollo13' | 'mir';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export type XRModeStatus =
  | 'webxr-supported'
  | 'mobile-gyro-ready'
  | 'mobile-touch-3d'
  | 'desktop-3d';

export type ExplorerMode = 'explore' | 'investigate';

export type ExplanationDepth = 'simple' | 'advanced';

export type HeadTrackingMode = 'off' | 'imu' | 'webcam' | 'cursor' | 'webxr';

export interface ScientificExplanationTier {
  whatIsIt: string;
  whenDidItHappen: string;
  whatHappened: string;
  howDidItHappen: string;
  whyDidItHappen: string;
  consequences: string;
  howFixedOrAddressed: string;
  howPrevented: string;
  scientificLesson: string;
}

export interface ScientificAnnotation {
  id: string;
  number: number;
  componentName: string;
  subsystem: string;
  /** World/local position inside the spacecraft assembly where the pointer tip anchors */
  anchorPosition: [number, number, number];
  /** Offset from anchorPosition to the numbered marker badge */
  markerOffset: [number, number, number];
  /** Camera viewpoint for inspecting this component */
  focusCameraPosition: [number, number, number];
  focusLookAt: [number, number, number];
  /** Explicit accuracy disclosure per NASA records */
  historicalAccuracyNote: string;
  sourceLabel: string;
  sourceUrl: string;
  simple: ScientificExplanationTier;
  advanced: ScientificExplanationTier;
}

export type InvestigationVisualState =
  | 'nominal'
  | 'precondition'
  | 'ignition'
  | 'escalation'
  | 'response'
  | 'outcome'
  | 'upgraded';

export interface InvestigationStep {
  id: string;
  stepNumber: number;
  phaseLabel:
    | 'Before the Incident'
    | 'Initial Event'
    | 'Problem Development'
    | 'Crew & Ground Response'
    | 'Final Outcome'
    | 'Engineering Improvements';
  title: string;
  timestamp: string;
  summary: string;
  scientificMechanism: string;
  distinctionLabel: 'Historical Reconstruction' | 'Simplified Educational Animation';
  distinctionNote: string;
  focusAnnotationId: string;
  visualState: InvestigationVisualState;
  cameraPosition: [number, number, number];
  cameraLookAt: [number, number, number];
}

export interface BeforeAfterComparison {
  id: string;
  system: string;
  beforeTitle: string;
  beforeSummary: string;
  afterTitle: string;
  afterSummary: string;
  engineeringImpact: string;
}

export interface SpacecraftMissionData {
  id: SpacecraftId;
  name: string;
  shortName: string;
  year: number;
  missionDesignation: string;
  dateLabel: string;
  agency: string;
  crew: string[];
  overview: string;
  historicalReferenceTitle: string;
  historicalReferenceUrl: string;
  spawnPosition: [number, number, number];
  spawnLookAt: [number, number, number];
  boundsMin: [number, number, number];
  boundsMax: [number, number, number];
  annotations: ScientificAnnotation[];
  timeline: InvestigationStep[];
  comparisons: BeforeAfterComparison[];
}

export interface BuiltSpacecraftScene {
  root: THREE.Group;
  /** Map from annotationId -> primary THREE.Object3D component for highlighting & anchoring */
  componentAnchors: Map<string, THREE.Object3D>;
  /** Updates procedural animations & visual demonstration state every frame */
  updateVisualState: (
    state: InvestigationVisualState,
    elapsed: number,
    delta: number,
    showUpgradeComparison: boolean
  ) => void;
  dispose: () => void;
}
