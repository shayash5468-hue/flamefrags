export type DashboardSection =
  | 'intro'
  | 'overview'
  | 'frags-ai'
  | 'data-upload'
  | 'flame-visual'
  | 'minigame'
  | 'iss-fire-drill';

export type ActiveTab =
  | 'home'
  | 'drill'
  | 'simulator'
  | 'informatics'
  | 'protocols'
  | 'station-map'
  | 'earth-impact';

export type EpistemicTag =
  | 'NASA-Reported'
  | 'Measured Data'
  | 'Derived Calculation'
  | 'AI Interpretation'
  | 'Unverified';

export interface StationTelemetry {
  altitude: number;
  speed: number;
  cabinPressure: number;
  oxygenPercent: number;
  gravityG: number;
  sootPpm: number;
  alarmActive: boolean;
}

export interface DrillMap {
  id: 'iss-node3' | 'gateway-hab' | 'mars-hab';
  name: string;
  location: string;
  gravityLabel: string;
  gravityValue: number;
  description: string;
  icon: string;
  unlocked: boolean;
  levels: {
    levelNumber: 1 | 2;
    title: string;
    description: string;
    fireCount: number;
    timeLimitSeconds: number;
    hazardType: string;
    unlocked: boolean;
    highScore?: number;
  }[];
}

export interface PsiMission {
  id: string;
  acronym: string;
  name: string;
  facility: string;
  fuelType: string;
  summary: string;
  keyFindings: string[];
  relevanceToExploration: string;
  imageHint: string;
  dnaSimilarityScore: number;
}

export type ExplanationLevel = 'beginner' | 'student' | 'advanced';

export interface DatasetColumnMeta {
  name: string;
  type: 'numeric' | 'categorical' | 'boolean';
  unit: string | 'unknown';
  nonNullCount: number;
  missingCount: number;
}

export interface PsiFileRecord {
  id: string;
  filename: string;
  format: 'csv' | 'xlsx' | 'txt';
  mission: string;
  investigationId?: string;
  investigationName: string;
  piName: string;
  fuelType: string;
  gravityCondition: string;
  oxygenRange: string;
  flowRange: string;
  pressureRange?: string;
  hardware?: string;
  sensors?: string[];
  nasaLink?: string;
  fileSizeBytes: number;
  uploadedAt: string;
  description: string;
  columns: string[];
  sampleRows: Record<string, string | number>[];
  allRows?: Record<string, string | number>[];
  qualityReport: {
    totalRows: number;
    missingValues: number;
    duplicateRows: number;
    inconsistentUnits: number;
    status: 'validated' | 'warning' | 'clean';
  };
}

export type GravityRegime =
  | 'Microgravity (0G / 10⁻⁶ g)'
  | 'Normal Gravity (1G)'
  | 'E-FIELD Microgravity'
  | 'Simulated 0G / 1G'
  | 'Partial Gravity (Moon/Mars)'
  | 'unknown';

export type FuelCategory =
  | 'Gaseous Hydrocarbon'
  | 'Liquid Droplet'
  | 'Solid Polymer (PMMA)'
  | 'Cellulosic / Composite Fabric'
  | 'Electrical Wire Insulation'
  | 'Mixed / Multi-Fuel'
  | 'unknown';

export interface PsiInvestigationRecord {
  id: string;
  acronym: string;
  title: string;
  pi: string;
  fuel: string;
  fuelCategory: FuelCategory;
  fuelGeometryDimensions: string; // e.g., "0.4 m × 1.0 m sheet" or "unknown"
  gravityCondition: string;
  gravityRegime: GravityRegime;
  oxygenConcentration: string; // e.g. "14% – 30%" or "unknown"
  pressure: string; // e.g. "56.5 kPa (8.2 psia)" or "unknown"
  airflow: string; // e.g. "0.01 – 0.35 m/s" or "unknown"
  temperatureDocumented: string; // e.g. "250°C cool flame regime" or "unknown"
  platform: string; // Hardware
  sensors: string[]; // empty or ['unknown'] if unverified
  measurementTypes: string[];
  experimentalObjective: string;
  keyFinding: string;
  link: string;
  linkedDatasetIds: string[];
  metadataVerificationStatus: 'PSI-Indexed Summary' | 'Dataset-Backed' | 'Needs PSI Portal Verification';
}

export interface CombustionDnaAttribute {
  key: string;
  label: string;
  value: string;
  kind: 'measured' | 'metadata' | 'unknown';
  tag: EpistemicTag;
  sourceDetail?: string;
}

export interface CombustionDnaProfile {
  entityId: string;
  entityType: 'investigation' | 'dataset';
  identifier: string;
  name: string;
  nasaLink?: string;
  sourceFiles: string[];
  assessedFieldCount: number;
  totalFieldCount: number;
  attributes: CombustionDnaAttribute[];
  measuredSummary: {
    oxygenRange?: string;
    airflowRange?: string;
    temperatureRange?: string;
    pressureRange?: string;
    rowCount?: number;
  };
  radarAxes: {
    label: string;
    normalizedValue: number | null; // null if unknown — never fake 0
    displayValue: string;
    isMeasured: boolean;
  }[];
  categoricalTags: {
    fuelCategory: FuelCategory;
    gravityRegime: GravityRegime;
    hardwareFamily: string;
    objectiveDomain: string;
  };
}

export interface CombustionDnaComparison {
  profileA: CombustionDnaProfile;
  profileB: CombustionDnaProfile;
  sharedAttributes: { label: string; valueA: string; valueB: string; reason: string }[];
  differingAttributes: { label: string; valueA: string; valueB: string }[];
  uncomparableAttributes: { label: string; valueA: string; valueB: string }[];
  documentedOverlapRatio: number; // shared / comparable (only comparable documented dimensions)
  comparableCount: number;
  sharedCount: number;
  methodNote: string;
}

export interface FlameFingerprint {
  id: string;
  experimentName: string;
  fuel: string;
  gravityG: number;
  oxygenPct: number;
  flowVelocity: number;
  peakTemperatureC: number;
  flameShape: 'spherical' | 'teardrop' | 'planar-crawl' | 'cool-envelope';
  sootShellRadiusMm: number;
  damkohlerNumber: number;
  radiativeLossFraction: number;
  quenchSpeedMs: number;
  dnaScore: number;
}

export interface EvidenceChainItem {
  label: string;
  value: string;
  tag: EpistemicTag;
  sourceRef?: string;
  datasetId?: string;
  investigationId?: string;
}

export interface EvidenceChainRecord {
  originalQuestion: string;
  matchedInvestigations: { id: string; title: string; link?: string }[];
  sourceDatasets: { id: string; filename: string; format: string }[];
  documentedConditions: EvidenceChainItem[];
  supportingFindings: EvidenceChainItem[];
  calculationsPerformed: EvidenceChainItem[];
  aiInterpretation: string;
  limitationsAndUncertainty: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  explanationLevel?: ExplanationLevel;
  sourceModel?: string;
  evidenceChain?: EvidenceChainRecord;
  citations?: {
    experiment: string;
    dataset: string;
    measurement: string;
    referenceUrl?: string;
  }[];
  suggestedQuestions?: string[];
}

export interface ResearchNote {
  id: string;
  title: string;
  summary: string;
  experimentRef: string;
  timestamp: string;
  tags: string[];
}

export type DetectiveTaskType =
  | 'highest-temperature'
  | 'airflow-trend'
  | 'oxygen-comparison'
  | 'outlier-detection'
  | 'missing-inconsistent'
  | 'compare-datasets'
  | 'variable-relationship'
  | 'custom-query';

export interface DetectiveChartSeries {
  type: 'line' | 'scatter' | 'bar';
  title: string;
  xLabel: string;
  yLabel: string;
  points: { x: number | string; y: number; label?: string; highlight?: boolean }[];
  regression?: { slope: number; intercept: number; r: number };
}

export interface ExperimentDetectiveResult {
  taskType: DetectiveTaskType;
  taskTitle: string;
  feasible: boolean;
  datasetAnalyzed: {
    id: string;
    filename: string;
    rowsInspected: number;
    totalDeclaredRows: number;
  };
  secondaryDataset?: {
    id: string;
    filename: string;
    rowsInspected: number;
  };
  columnsInspected: DatasetColumnMeta[];
  summaryHeadline: string;
  calculations: { label: string; value: string; detail?: string; tag: EpistemicTag }[];
  findings: string[];
  chart?: DetectiveChartSeries;
  limitations: string[];
  evidenceChain: EvidenceChainRecord;
}

export type HabitatEnvironmentId =
  | 'iss'
  | 'lunar-habitat'
  | 'lunar-rover'
  | 'mars-habitat'
  | 'mars-rover';

export interface HabitatAssumptions {
  environmentId: HabitatEnvironmentId;
  label: string;
  oxygenPct: number;
  pressureKpa: number;
  airflowMs: number;
  gravityG: number;
  fuelClass: FuelCategory;
  assumptionNotes: string;
}
