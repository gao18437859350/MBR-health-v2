import type { Assessment, AppData } from "@/types";
import { getSchemaVersion, normalizeAssessment } from "@/store/storage";

type ImportResult = { assessments: Assessment[] } | { error: string };

const MECHANICAL_KEYS = [
  "fiberWear", "fiberAdhesion", "fiberBreakage", "fiberRoot", "pottingLayer", "oring",
  "siliconeGasket", "connectorPipe", "frameBolts", "aerationBox", "aerationUniformity",
  "pipeLeakage",
] as const;

const CSV_HEADERS = [
  "id", "date", "projectName", "poolId", "membraneId", "membraneModel",
  "installDate", "membraneArea", "runningHours", "totalWaterProduction",
  "currentWaterProduction", "currentFlux", "currentTMP", "waterTemperature",
  "normalizedPermeability", "baselinePermeability", "tmpDailyIncrease", "flowDeviation",
  "turbidity", "ss", "sludgeParticles", "airTightTestPassed",
  "fiberBreakDetected", "pinholeDetected", "rootLeakDetected", "sealShortCircuit",
  "fiberBlockageLevel", "blockedFiberCount", "totalFiberCount", "preCipPermeability", "postCipPermeability",
  "preOfflineCleanPermeability", "postOfflineCleanPermeability", "lastCleaningDate",
  "currentCleaningCycle", "historicalCleaningCycle", "tmpReboundSpeed", "cakeLayer",
  "organicFouling", "inorganicScaling", "biofouling", "fiberEntanglement",
  ...MECHANICAL_KEYS.map((key) => `mech_${key}`),
  "actualFlux", "tmpPeak", "backwashPressurePeak", "mlss", "aerationNormal",
  "stoppedAerationProducing", "fiberExposedToAir", "driedOut", "frozen",
  "mechanicalImpact", "oilContamination", "toxicInflow", "chemicalAbnormality",
  "riskDuration", "riskDescription",
];

export function exportJSON(data: AppData): string {
  return JSON.stringify(
    { ...data, schemaVersion: getSchemaVersion(), exportedAt: new Date().toISOString() },
    null,
    2
  );
}

function download(content: string, type: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadJSON(data: AppData, filename?: string): void {
  download(
    exportJSON(data),
    "application/json;charset=utf-8",
    filename ?? `mbr-backup-${new Date().toISOString().slice(0, 10)}.json`
  );
}

function looksLikeAssessment(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return ["id", "date", "projectName", "poolId", "membraneId", "currentTMP"]
    .some((key) => key in record);
}

export function parseJSONImport(raw: string): ImportResult {
  try {
    const parsed: unknown = JSON.parse(raw.replace(/^\uFEFF/, ""));
    const parsedRecord = parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
    const sourceSchemaVersion = parsedRecord && Number.isFinite(Number(parsedRecord.schemaVersion))
      ? Number(parsedRecord.schemaVersion)
      : getSchemaVersion();
    const source = Array.isArray(parsed)
      ? parsed
      : parsedRecord && Array.isArray(parsedRecord.assessments)
        ? parsedRecord.assessments as unknown[]
        : [];
    const assessments = source
      .filter(looksLikeAssessment)
      .map((assessment) => normalizeAssessment(assessment, sourceSchemaVersion));
    return assessments.length > 0
      ? { assessments }
      : { error: "未找到有效的评估数据" };
  } catch {
    return { error: "JSON 解析失败，请检查文件格式" };
  }
}

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportCSV(assessments: Assessment[]): string {
  const rows = assessments.map((assessment) => CSV_HEADERS.map((header) => {
    if (header.startsWith("mech_")) {
      const key = header.slice(5) as keyof Assessment["mechanicalStatus"];
      return escapeCSV(assessment.mechanicalStatus[key]);
    }
    return escapeCSV((assessment as unknown as Record<string, unknown>)[header]);
  }).join(","));
  return [CSV_HEADERS.join(","), ...rows].join("\r\n");
}

export function downloadCSV(assessments: Assessment[], filename?: string): void {
  download(
    "\uFEFF" + exportCSV(assessments),
    "text/csv;charset=utf-8",
    filename ?? `mbr-assessments-${new Date().toISOString().slice(0, 10)}.csv`
  );
}

/** RFC 4180-style reader, including commas, escaped quotes and line breaks in quoted cells. */
function parseCSVDocument(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = raw.replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        cell += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[index + 1] === "\n") index++;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function parseCell(raw: string): unknown {
  const value = raw.trim();
  if (value === "") return null;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : raw;
}

export function parseCSVImport(raw: string): ImportResult {
  try {
    const table = parseCSVDocument(raw);
    if (table.length < 2) return { error: "CSV 文件为空或只有表头" };
    const headers = table[0].map((header) => header.trim());
    if (!headers.some((header) => ["date", "membraneId", "projectName"].includes(header))) {
      return { error: "CSV 表头不正确，至少需要 date、membraneId 或 projectName 字段" };
    }

    const assessments = table.slice(1).map((columns) => {
      const record: Record<string, unknown> = {};
      const mechanical: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        if (!header) return;
        const value = parseCell(columns[index] ?? "");
        if (header.startsWith("mech_")) mechanical[header.slice(5)] = value;
        else record[header] = value;
      });
      if (Object.keys(mechanical).length > 0) record.mechanicalStatus = mechanical;
      return normalizeAssessment(record);
    });
    return assessments.length > 0 ? { assessments } : { error: "CSV 中没有可导入的数据行" };
  } catch {
    return { error: "CSV 解析失败，请检查文件格式" };
  }
}
