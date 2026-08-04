import type { AppData, Assessment, MembraneUnit, Rule, StatusLevel } from "@/types";
import { createEmptyAssessment, emptyMechanicalStatus } from "@/utils/assessment";
import { generateId } from "@/utils/uuid";
import { canonicalizeMembraneIdentity } from "@/constants/membrane-options";

const STORAGE_KEY = "mbr_app_data";
const SCHEMA_VERSION = 7;

interface StoredData {
  schemaVersion?: unknown;
  version?: unknown;
  membranes?: unknown;
  assessments?: unknown;
  rules?: unknown;
  settings?: unknown;
}

const numericFields: (keyof Assessment)[] = [
  "membraneArea", "runningHours", "totalWaterProduction", "currentWaterProduction",
  "currentTMP", "waterTemperature", "baselinePermeability", "turbidity",
  "blockedFiberCount", "totalFiberCount", "historicalCleaningCycle", "actualFlux",
];
const nullableNumericFields: (keyof Assessment)[] = [
  "currentFlux", "normalizedPermeability", "tmpDailyIncrease", "flowDeviation", "ss",
  "preCipPermeability", "postCipPermeability", "preOfflineCleanPermeability",
  "postOfflineCleanPermeability", "currentCleaningCycle", "tmpPeak",
  "backwashPressurePeak", "mlss", "riskDuration",
];
const booleanFields: (keyof Assessment)[] = [
  "sludgeParticles", "fiberBreakDetected", "pinholeDetected", "rootLeakDetected",
  "sealShortCircuit", "aerationNormal", "stoppedAerationProducing", "fiberExposedToAir",
  "driedOut", "frozen", "mechanicalImpact", "oilContamination", "toxicInflow",
  "chemicalAbnormality",
];
const stringFields: (keyof Assessment)[] = [
  "date", "projectName", "poolId", "membraneId", "membraneModel", "installDate",
  "riskDescription",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number): number {
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return fallback;
}

/** Convert a stored/imported assessment into the current complete shape. */
export function normalizeAssessment(value: unknown, sourceSchemaVersion = SCHEMA_VERSION): Assessment {
  const source = isRecord(value) ? value : {};
  const defaults = createEmptyAssessment();
  const result = { ...defaults, ...source } as Assessment;
  result.id = typeof source.id === "string" && source.id.trim() ? source.id : generateId();

  for (const key of stringFields) {
    result[key] = (typeof source[key] === "string" ? source[key] : defaults[key]) as never;
  }
  const identity = canonicalizeMembraneIdentity(result.membraneId, result.poolId);
  result.membraneId = identity.membraneId;
  result.poolId = identity.poolId;
  for (const key of numericFields) {
    result[key] = finiteNumber(source[key], defaults[key] as number) as never;
  }
  if (sourceSchemaVersion < 6) {
    result.runningHours = result.runningHours / 24;
  }
  result.membraneModel = /^PVDF(?:-|$)/i.test(result.membraneModel) ? "PVDF"
    : /^GE(?:-|$)/i.test(result.membraneModel) ? "GE"
      : result.membraneModel;
  result.totalWaterProduction = result.runningHours * result.currentWaterProduction;
  for (const key of nullableNumericFields) {
    const raw = source[key];
    result[key] = (raw === null || raw === undefined || raw === "" ? null : finiteNumber(raw, 0)) as never;
  }
  for (const key of booleanFields) {
    result[key] = booleanValue(source[key], defaults[key] as boolean) as never;
  }

  const storedBlockageLevel = String(source.fiberBlockageLevel ?? "");
  if (["none", "mild", "moderate", "severe"].includes(storedBlockageLevel)) {
    result.fiberBlockageLevel = storedBlockageLevel as Assessment["fiberBlockageLevel"];
  } else if (result.blockedFiberCount > 0) {
    const blockedRate = result.totalFiberCount > 0
      ? (result.blockedFiberCount / result.totalFiberCount) * 100
      : 0;
    result.fiberBlockageLevel = blockedRate > 1 ? "severe" : blockedRate > 0.5 ? "moderate" : "mild";
  } else {
    result.fiberBlockageLevel = "none";
  }

  result.airTightTestPassed = source.airTightTestPassed == null || source.airTightTestPassed === ""
    ? null
    : booleanValue(source.airTightTestPassed, false);
  result.lastCleaningDate = typeof source.lastCleaningDate === "string" ? source.lastCleaningDate : null;
  result.tmpReboundSpeed = ["slow", "moderate", "fast"].includes(String(source.tmpReboundSpeed))
    ? source.tmpReboundSpeed as Assessment["tmpReboundSpeed"] : null;
  for (const key of ["cakeLayer", "organicFouling", "inorganicScaling", "biofouling", "fiberEntanglement"] as const) {
    result[key] = ["none", "mild", "moderate", "severe"].includes(String(source[key]))
      ? source[key] as Assessment[typeof key] : null;
  }

  const mechanical = isRecord(source.mechanicalStatus) ? source.mechanicalStatus : {};
  const normalizedMechanical = emptyMechanicalStatus();
  for (const key of Object.keys(normalizedMechanical) as (keyof typeof normalizedMechanical)[]) {
    const status = mechanical[key];
    normalizedMechanical[key] = (["normal", "warning", "damaged"] as StatusLevel[]).includes(status as StatusLevel)
      ? status as StatusLevel : "normal";
  }
  result.mechanicalStatus = normalizedMechanical;
  return result;
}

function normalizeMembrane(value: unknown): MembraneUnit | null {
  if (!isRecord(value)) return null;
  const identity = canonicalizeMembraneIdentity(
    typeof value.name === "string" ? value.name : "",
    typeof value.poolId === "string" ? value.poolId : ""
  );
  return {
    id: typeof value.id === "string" && value.id ? value.id : generateId(),
    name: identity.membraneId,
    poolId: identity.poolId,
    model: typeof value.model === "string" ? value.model : "",
    installDate: typeof value.installDate === "string" ? value.installDate : "",
    membraneArea: finiteNumber(value.membraneArea, 0),
    totalFiberCount: finiteNumber(value.totalFiberCount, 0),
    status: value.status === "decommissioned" ? "decommissioned" : "active",
  };
}

function normalizeRule(value: unknown): Rule | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  const threshold = (v: unknown) => v == null || v === "" ? null : finiteNumber(v, 0);
  return {
    id: value.id,
    name: typeof value.name === "string" ? value.name : value.id,
    category: typeof value.category === "string" ? value.category : "未分类",
    metric: typeof value.metric === "string" ? value.metric : "",
    unit: typeof value.unit === "string" ? value.unit : "",
    sourceType: ["manual", "engineering", "site-calibrated", "pending"].includes(String(value.sourceType))
      ? value.sourceType as Rule["sourceType"] : "pending",
    sourceDescription: typeof value.sourceDescription === "string" ? value.sourceDescription : "",
    warningThreshold: threshold(value.warningThreshold),
    alarmThreshold: threshold(value.alarmThreshold),
    redlineThreshold: threshold(value.redlineThreshold),
    scoreBands: Array.isArray(value.scoreBands) ? value.scoreBands.filter(isRecord).map((band) => ({
      min: finiteNumber(band.min, 0),
      max: finiteNumber(band.max, 0),
      scoreRatio: finiteNumber(band.scoreRatio, 0),
      label: typeof band.label === "string" ? band.label : "",
    })) : [],
    enabled: booleanValue(value.enabled, true),
    recommendation: typeof value.recommendation === "string" ? value.recommendation : "",
  };
}

/** Upgrade unknown/legacy data without trusting its runtime shape. */
export function migrateStoredData(value: unknown): AppData {
  const data: StoredData = isRecord(value) ? value : {};
  const settings = isRecord(data.settings) ? data.settings : {};
  const membranes = Array.isArray(data.membranes) ? data.membranes : [];
  const assessments = Array.isArray(data.assessments) ? data.assessments : [];
  const rules = Array.isArray(data.rules) ? data.rules : [];
  const sourceSchemaVersion = finiteNumber(data.schemaVersion, 0);

  return {
    schemaVersion: SCHEMA_VERSION,
    version: typeof data.version === "string" ? data.version : "1.0.0",
    membranes: membranes.map(normalizeMembrane).filter((item): item is MembraneUnit => item !== null),
    assessments: assessments.filter(isRecord).map((assessment) => normalizeAssessment(assessment, sourceSchemaVersion)),
    rules: rules.map(normalizeRule).filter((item): item is Rule => item !== null),
    settings: {
      lastBackup: typeof settings.lastBackup === "string" ? settings.lastBackup : "",
      demoDataLoaded: booleanValue(settings.demoDataLoaded, false),
    },
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrateStoredData(JSON.parse(raw));
  } catch {
    console.warn("localStorage 数据损坏，已使用安全的空数据");
  }
  return createEmptyData();
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, schemaVersion: SCHEMA_VERSION }));
}

export function createEmptyData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    version: "1.0.0",
    membranes: [],
    assessments: [],
    rules: [],
    settings: { lastBackup: "", demoDataLoaded: false },
  };
}

export function getSchemaVersion(): number {
  return SCHEMA_VERSION;
}
