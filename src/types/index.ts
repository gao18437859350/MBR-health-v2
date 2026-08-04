// ============================================================
// PVDF中空纤维MBR膜健康度评估系统 — TypeScript 类型定义
// ============================================================

// ---- 基础枚举 ----

export type StatusLevel = 'normal' | 'warning' | 'damaged';

export type FoulingLevel = 'none' | 'mild' | 'moderate' | 'severe' | null;

export type TmpReboundSpeed = 'slow' | 'moderate' | 'fast' | null;

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export type OverallStatus = 'healthy' | 'watch' | 'warning' | 'critical';

export type ScoreBandLabel = 'excellent' | 'good' | 'fair' | 'poor';

export type RuleSourceType = 'manual' | 'engineering' | 'site-calibrated' | 'pending';

export type MembraneStatus = 'active' | 'decommissioned';

export type FiberBlockageLevel = 'none' | 'mild' | 'moderate' | 'severe';

// ---- 膜组件 ----

export interface MembraneUnit {
  id: string;
  name: string;
  poolId: string;
  model: string;
  installDate: string;
  membraneArea: number;
  totalFiberCount: number;
  status: MembraneStatus;
}

// ---- 评估记录（完整表单数据） ----

export interface Assessment {
  id: string;
  date: string;

  // 基础信息
  projectName: string;
  poolId: string;
  membraneId: string;
  membraneModel: string;
  installDate: string;
  membraneArea: number;
  runningHours: number;
  totalWaterProduction: number;

  // 水力性能
  currentWaterProduction: number;
  currentFlux: number | null;
  currentTMP: number;
  waterTemperature: number;
  normalizedPermeability: number | null;
  baselinePermeability: number;
  tmpDailyIncrease: number | null;
  flowDeviation: number | null;

  // 膜完整性及出水
  turbidity: number;
  ss: number | null;
  sludgeParticles: boolean;
  airTightTestPassed: boolean | null;
  fiberBreakDetected: boolean;
  pinholeDetected: boolean;
  rootLeakDetected: boolean;
  sealShortCircuit: boolean;
  fiberBlockageLevel: FiberBlockageLevel;
  /** Legacy import/export field. New assessments use fiberBlockageLevel. */
  blockedFiberCount: number;
  totalFiberCount: number;

  // 污染与清洗恢复
  preCipPermeability: number | null;
  postCipPermeability: number | null;
  preOfflineCleanPermeability: number | null;
  postOfflineCleanPermeability: number | null;
  lastCleaningDate: string | null;
  currentCleaningCycle: number | null;
  historicalCleaningCycle: number;
  tmpReboundSpeed: TmpReboundSpeed;
  cakeLayer: FoulingLevel;
  organicFouling: FoulingLevel;
  inorganicScaling: FoulingLevel;
  biofouling: FoulingLevel;
  fiberEntanglement: FoulingLevel;

  // 机械及组件状态
  mechanicalStatus: MechanicalStatus;

  // 运行环境与风险事件
  actualFlux: number;
  tmpPeak: number | null;
  backwashPressurePeak: number | null;
  mlss: number | null;
  aerationNormal: boolean;
  stoppedAerationProducing: boolean;
  fiberExposedToAir: boolean;
  driedOut: boolean;
  frozen: boolean;
  mechanicalImpact: boolean;
  oilContamination: boolean;
  toxicInflow: boolean;
  chemicalAbnormality: boolean;
  riskDuration: number | null;
  riskDescription: string;
}

export interface MechanicalStatus {
  fiberWear: StatusLevel;
  fiberAdhesion: StatusLevel;
  fiberBreakage: StatusLevel;
  fiberRoot: StatusLevel;
  pottingLayer: StatusLevel;
  oring: StatusLevel;
  siliconeGasket: StatusLevel;
  connectorPipe: StatusLevel;
  frameBolts: StatusLevel;
  aerationBox: StatusLevel;
  aerationUniformity: StatusLevel;
  pipeLeakage: StatusLevel;
}

// ---- 评分结果 ----

export interface ScoreDetail {
  metric: string;
  value: number | string | null;
  score: number;
  maxScore: number;
  band: ScoreBandLabel;
  reason: string;
}

export interface DimensionScore {
  score: number;
  maxScore: number;
  details: ScoreDetail[];
}

export interface ScoringResult {
  totalScore: number;
  grade: HealthGrade;
  overallStatus: OverallStatus;
  dimensions: {
    hydraulic: DimensionScore;
    integrity: DimensionScore;
    fouling: DimensionScore;
    mechanical: DimensionScore;
    risk: DimensionScore;
    maintenance: DimensionScore;
  };
  redlineCount: number;
}

// ---- 红线结果 ----

export interface RedlineResult {
  ruleId: string;
  name: string;
  triggered: boolean;
  value: number | string | null;
  threshold: number | string;
  recommendation: string;
}

// ---- 诊断结果 ----

export interface Diagnosis {
  id: string;
  name: string;
  confidence: 'high' | 'medium' | 'low';
  supportingData: string[];
  supportingEvidence: string[];
  differentialDiagnosis: string[];
  checkOrder: string[];
  recommendedChecks: string[];
  recommendedActions: string[];
  disclaimer: string;
}

// ---- 规则配置（规则设置页） ----

export interface ScoreBand {
  min: number;
  max: number;
  scoreRatio: number;
  label: string;
}

export interface Rule {
  id: string;
  name: string;
  category: string;
  metric: string;
  unit: string;
  sourceType: RuleSourceType;
  sourceDescription: string;
  warningThreshold: number | null;
  alarmThreshold: number | null;
  redlineThreshold: number | null;
  scoreBands: ScoreBand[];
  enabled: boolean;
  recommendation: string;
}

// ---- 应用全局数据 ----

export interface AppData {
  schemaVersion: number;
  version: string;
  membranes: MembraneUnit[];
  assessments: Assessment[];
  rules: Rule[];
  settings: AppSettings;
}

export interface AppSettings {
  lastBackup: string;
  demoDataLoaded: boolean;
}

// ---- 表单校验 ----

export interface ValidationError {
  field: string;
  message: string;
}
