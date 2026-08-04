import { describe, it, expect } from "./test-framework";
import { calculateScore } from "../scoring";
import { getSchemaVersion, migrateStoredData } from "../../store/storage";
import { exportCSV, parseCSVImport, parseJSONImport } from "../../utils/import-export";
import { DEMO_ASSESSMENTS, generateTrendData } from "../../constants/demo-data";
import { MEMBRANE_OPTIONS, MEMBRANE_POOLS } from "../../constants/membrane-options";

describe("storage migration - legacy data", () => {
  it("maps legacy blocked fiber counts to a qualitative blockage level", () => {
    const migrated = migrateStoredData({
      schemaVersion: 6,
      assessments: [{ blockedFiberCount: 80, totalFiberCount: 10000 }],
    });
    expect(migrated.assessments[0].fiberBlockageLevel).toBe("moderate");
  });

  it("converts legacy running hours to days once and derives total production", () => {
    const legacy = migrateStoredData({
      schemaVersion: 5,
      assessments: [{ runningHours: 240, currentWaterProduction: 100, membraneModel: "PVDF-40" }],
    });
    expect(legacy.assessments[0].runningHours).toBe(10);
    expect(legacy.assessments[0].totalWaterProduction).toBe(1000);
    expect(legacy.assessments[0].membraneModel).toBe("PVDF");

    const current = migrateStoredData(legacy);
    expect(current.assessments[0].runningHours).toBe(10);
    expect(current.assessments[0].totalWaterProduction).toBe(1000);
  });

  it("adds schemaVersion and all assessment defaults", () => {
    const migrated = migrateStoredData({
      version: "0.8.0",
      assessments: [{
        id: "legacy-1",
        date: "2024-01-02",
        projectName: "旧项目",
        membraneId: "M-01",
        currentTMP: "18",
      }],
      membranes: "broken",
      settings: null,
    });

    expect(migrated.schemaVersion).toBe(getSchemaVersion());
    expect(migrated.membranes).toHaveLength(0);
    expect(migrated.assessments[0].mechanicalStatus.fiberWear).toBe("normal");
    expect(migrated.assessments[0].currentTMP).toBe(18);
    expect(calculateScore(migrated.assessments[0]).totalScore).toBeGreaterThanOrEqual(0);
  });

  it("drops corrupt array entries instead of exposing them to pages", () => {
    const migrated = migrateStoredData({
      assessments: [null, "bad", 1, { membraneId: "M-02" }],
      rules: [null, { id: "old-rule", enabled: "false" }],
    });
    expect(migrated.assessments).toHaveLength(1);
    expect(migrated.rules).toHaveLength(1);
    expect(migrated.rules[0].enabled).toBe(false);
  });

  it("upgrades known MBR demo names to phase membrane names", () => {
    const migrated = migrateStoredData({
      assessments: [
        { membraneId: "MBR-A-01", poolId: "MBR-A" },
        { membraneId: "MBR-B-06", poolId: "MBR-B" },
        { membraneId: "MBR-1-A-03", poolId: "MBR-1" },
      ],
    });
    expect(migrated.assessments[0].membraneId).toBe("一期1号膜池-1号膜箱");
    expect(migrated.assessments[0].poolId).toBe("一期1号膜池");
    expect(migrated.assessments[1].membraneId).toBe("二期6号膜池-1号膜箱");
    expect(migrated.assessments[1].poolId).toBe("二期6号膜池");
    expect(migrated.assessments[2].membraneId).toBe("一期3号膜池-1号膜箱");
  });
});

describe("assessment import/export", () => {
  it("normalizes legacy JSON records without requiring id/date", () => {
    const result = parseJSONImport(JSON.stringify([
      { projectName: "导入项目", membraneId: "M-03", currentTMP: 20 },
    ]));
    if ("error" in result) throw new Error(result.error);
    expect(result.assessments).toHaveLength(1);
    expect(result.assessments[0].id).toBeDefined();
    expect(result.assessments[0].date).toBeDefined();
  });

  it("round-trips quoted commas, line breaks and mechanical state in CSV", () => {
    const source = migrateStoredData({
      assessments: [{
        projectName: "项目,一",
        membraneId: "M-04",
        riskDescription: "第一行\n第二行",
        mechanicalStatus: { fiberWear: "warning" },
      }],
    }).assessments[0];
    const result = parseCSVImport(exportCSV([source]));
    if ("error" in result) throw new Error(result.error);
    expect(result.assessments[0].projectName).toBe("项目,一");
    expect(result.assessments[0].riskDescription).toBe("第一行\n第二行");
    expect(result.assessments[0].mechanicalStatus.fiberWear).toBe("warning");
  });
});

describe("demo trend history", () => {
  it("contains 12 pools with 10 boxes each", () => {
    expect(MEMBRANE_POOLS).toHaveLength(12);
    expect(MEMBRANE_OPTIONS).toHaveLength(120);
    expect(DEMO_ASSESSMENTS).toHaveLength(120);
    for (const pool of MEMBRANE_POOLS) {
      expect(MEMBRANE_OPTIONS.filter((item) => item.poolId === pool.id)).toHaveLength(10);
      expect(DEMO_ASSESSMENTS.filter((item) => item.poolId === pool.id)).toHaveLength(10);
    }
  });

  it("is stable and varies TMP, flux and turbidity around each anchor", () => {
    const anchor = DEMO_ASSESSMENTS[4];
    const first = generateTrendData(anchor);
    const second = generateTrendData(anchor);
    expect(first[0].id).toBe(second[0].id);
    expect(first[0].currentTMP).toBe(second[0].currentTMP);
    expect(first[0].currentFlux).toBe(second[0].currentFlux);
    expect(first[0].turbidity).toBe(second[0].turbidity);
    expect(first[0].currentTMP).not.toBe(first[first.length - 1].currentTMP);
    expect(first[0].currentFlux).not.toBe(first[first.length - 1].currentFlux);
  });
});
