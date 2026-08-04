/**
 * PVDF-MBR 评分引擎 — 全量单元测试
 * 独立运行: npx tsx src/engine/__tests__/run-all.ts
 */

import { describe, it, expect, printSummary } from "./test-framework";
import "./storage-import.test";
import { createHealthyAssessment } from "./helpers";
import {
  calcFlux,
  calcPermeability,
  calcPermeabilityRetention,
  calcCipRecoveryRate,
  calcIrreversibleFoulingIndex,
  calcBrokenFiberRate,
  calcFluxRatio,
  calcRiskEventCount,
  calcDataCompleteness,
  calcTmpScore,
  calcFluxRatioScore,
  calcTurbidityScore,
  calcAirtightScore,
  calcMlssScore,
  calcRiskEventsScore,
  calcBackwashPressureScore,
  calcCleaningCycleDeviation,
  calcOfflineRecoveryRate,
} from "../calculations";
import { calculateScore, scoreToGrade, gradeToStatus } from "../scoring";
import { evaluateRedlines, getTriggeredRedlines } from "../../constants/redline-rules";
import type { MechanicalStatus } from "../../types";

function damagedMech(): MechanicalStatus {
  return {
    fiberWear: "damaged", fiberAdhesion: "warning", fiberBreakage: "damaged",
    fiberRoot: "warning", pottingLayer: "warning", oring: "damaged",
    siliconeGasket: "warning", connectorPipe: "damaged", frameBolts: "warning",
    aerationBox: "damaged", aerationUniformity: "damaged", pipeLeakage: "damaged",
  };
}

// ================================================================
// 计算引擎测试
// ================================================================
describe("calcFlux — 膜通量", () => {
  it("通量 = 产水量 / 膜面积", () => {
    expect(calcFlux(createHealthyAssessment({ currentWaterProduction: 20000, membraneArea: 1000 }))).toBe(20);
  });
  it("膜面积为 0 返回 null（除零保护）", () => {
    expect(calcFlux(createHealthyAssessment({ membraneArea: 0 }))).toBeNull();
  });
  it("膜面积为负数返回 null", () => {
    expect(calcFlux(createHealthyAssessment({ membraneArea: -100 }))).toBeNull();
  });
});

describe("calcPermeability — 比通量", () => {
  it("K = J / |TMP|", () => {
    expect(calcPermeability(createHealthyAssessment({ currentWaterProduction: 20000, membraneArea: 1000, currentTMP: 20 }))).toBe(1.0);
  });
  it("TMP=0 时除零保护返回 null", () => {
    expect(calcPermeability(createHealthyAssessment({ currentTMP: 0 }))).toBeNull();
  });
  it("TMP 负数以绝对值计算", () => {
    expect(calcPermeability(createHealthyAssessment({ currentWaterProduction: 15000, membraneArea: 1000, currentTMP: -15 }))).toBe(1.0);
  });
});

describe("calcPermeabilityRetention — 比通量保持率", () => {
  it("Rk = 标准化/基准 × 100", () => {
    const r = calcPermeabilityRetention(createHealthyAssessment({ normalizedPermeability: 1.0, baselinePermeability: 1.33 }));
    expect(r).toBeCloseTo(75.19, 1);
  });
  it("标准化比通量为 null 返回 null", () => {
    expect(calcPermeabilityRetention(createHealthyAssessment({ normalizedPermeability: null }))).toBeNull();
  });
  it("基准为 0 返回 null", () => {
    expect(calcPermeabilityRetention(createHealthyAssessment({ baselinePermeability: 0 }))).toBeNull();
  });
});

describe("calcCipRecoveryRate — 在线清洗恢复率", () => {
  it("Rc = 清洗后/基准 × 100", () => {
    expect(calcCipRecoveryRate(createHealthyAssessment({ postCipPermeability: 1.2, baselinePermeability: 1.33 }))).toBeCloseTo(90.23, 1);
  });
  it("清洗后比通量为 null 返回 null", () => {
    expect(calcCipRecoveryRate(createHealthyAssessment({ postCipPermeability: null }))).toBeNull();
  });
  it("基准为 0 返回 null", () => {
    expect(calcCipRecoveryRate(createHealthyAssessment({ baselinePermeability: 0 }))).toBeNull();
  });
});

describe("calcIrreversibleFoulingIndex — 不可逆污染指数", () => {
  it("Firr = 1 - 清洗后/基准", () => {
    expect(calcIrreversibleFoulingIndex(createHealthyAssessment({ postCipPermeability: 0.8, baselinePermeability: 1.33 }))).toBeCloseTo(0.398, 2);
  });
  it("完全恢复时指数为 0", () => {
    expect(calcIrreversibleFoulingIndex(createHealthyAssessment({ postCipPermeability: 1.33, baselinePermeability: 1.33 }))).toBe(0);
  });
  it("数据均缺失返回 null", () => {
    expect(calcIrreversibleFoulingIndex(createHealthyAssessment({ postCipPermeability: null, preOfflineCleanPermeability: null }))).toBeNull();
  });
  it("离线清洗数据作为 fallback", () => {
    const idx = calcIrreversibleFoulingIndex(createHealthyAssessment({
      postCipPermeability: null,
      postOfflineCleanPermeability: 1.0,
      baselinePermeability: 1.33,
    }));
    expect(idx).toBeCloseTo(0.248, 2);
  });
});

describe("calcBrokenFiberRate — 断丝率", () => {
  it("= 已封堵/总数 × 100%", () => {
    expect(calcBrokenFiberRate(createHealthyAssessment({ blockedFiberCount: 50, totalFiberCount: 10000 }))).toBe(0.5);
  });
  it("无断丝时为零", () => {
    expect(calcBrokenFiberRate(createHealthyAssessment({ blockedFiberCount: 0, totalFiberCount: 10000 }))).toBe(0);
  });
  it("总数为 0 返回 null", () => {
    expect(calcBrokenFiberRate(createHealthyAssessment({ totalFiberCount: 0 }))).toBeNull();
  });
});

describe("calcRiskEventCount — 风险事件计数", () => {
  it("无事件返回 0", () => expect(calcRiskEventCount(createHealthyAssessment())).toBe(0));
  it("触发 3 项返回 3", () => {
    expect(calcRiskEventCount(createHealthyAssessment({
      stoppedAerationProducing: true, driedOut: true, frozen: true,
    }))).toBe(3);
  });
  it("全部 8 项触发返回 8", () => {
    expect(calcRiskEventCount(createHealthyAssessment({
      stoppedAerationProducing: true, fiberExposedToAir: true, driedOut: true, frozen: true,
      mechanicalImpact: true, oilContamination: true, toxicInflow: true, chemicalAbnormality: true,
    }))).toBe(8);
  });
});

describe("calcTmpScore — TMP评分", () => {
  it("0-30 kPa 满分", () => expect(calcTmpScore(createHealthyAssessment({ currentTMP: 15 }))).toBe(1.0));
  it("TMP=0 返回 0.5", () => expect(calcTmpScore(createHealthyAssessment({ currentTMP: 0 }))).toBe(0.5));
  it("30-40 返回 0.7", () => expect(calcTmpScore(createHealthyAssessment({ currentTMP: 35 }))).toBe(0.7));
  it("40-50 返回 0.4", () => expect(calcTmpScore(createHealthyAssessment({ currentTMP: 45 }))).toBe(0.4));
  it(">= 50 返回 0.0", () => expect(calcTmpScore(createHealthyAssessment({ currentTMP: 55 }))).toBe(0.0));
  it("负值取绝对值", () => expect(calcTmpScore(createHealthyAssessment({ currentTMP: -25 }))).toBe(1.0));
});

describe("calcTurbidityScore — 浊度评分", () => {
  it("<= 0.1 NTU 满分", () => expect(calcTurbidityScore(0.05)).toBe(1.0));
  it("0.1-0.3 返回 0.8", () => expect(calcTurbidityScore(0.2)).toBe(0.8));
  it("0.3-0.5 返回 0.5", () => expect(calcTurbidityScore(0.4)).toBe(0.5));
  it("> 0.5 返回 0.1", () => expect(calcTurbidityScore(0.8)).toBe(0.1));
  it("边界 0.1 NTU 满分", () => expect(calcTurbidityScore(0.1)).toBe(1.0));
  it("边界 0.3 NTU 返回 0.8", () => expect(calcTurbidityScore(0.3)).toBe(0.8));
  it("边界 0.5 NTU 返回 0.5", () => expect(calcTurbidityScore(0.5)).toBe(0.5));
});

describe("calcAirtightScore — 气密试验评分", () => {
  it("合格返回 1.0", () => expect(calcAirtightScore(createHealthyAssessment({ airTightTestPassed: true }))).toBe(1.0));
  it("不合格返回 0.0", () => expect(calcAirtightScore(createHealthyAssessment({ airTightTestPassed: false }))).toBe(0.0));
  it("未做返回 null", () => expect(calcAirtightScore(createHealthyAssessment({ airTightTestPassed: null }))).toBeNull());
});

describe("calcMlssScore — MLSS评分", () => {
  it("3000-8000 满分", () => expect(calcMlssScore(5000)).toBe(1.0));
  it("2000-3000 返回 0.7", () => expect(calcMlssScore(2500)).toBe(0.7));
  it("8000-10000 返回 0.7", () => expect(calcMlssScore(9000)).toBe(0.7));
  it("< 2000 返回 0.3", () => expect(calcMlssScore(1500)).toBe(0.3));
  it("> 10000 返回 0.1", () => expect(calcMlssScore(12000)).toBe(0.1));
  it("null 返回 null", () => expect(calcMlssScore(null)).toBeNull());
  it("边界 3000 满分", () => expect(calcMlssScore(3000)).toBe(1.0));
  it("边界 8000 满分", () => expect(calcMlssScore(8000)).toBe(1.0));
});

describe("calcRiskEventsScore — 风险事件评分", () => {
  it("0 个满分", () => expect(calcRiskEventsScore(0)).toBe(1.0));
  it("1 个返回 0.6", () => expect(calcRiskEventsScore(1)).toBe(0.6));
  it("2-3 个返回 0.3", () => expect(calcRiskEventsScore(2)).toBe(0.3));
  it("4+ 返回 0", () => expect(calcRiskEventsScore(5)).toBe(0.0));
});

describe("calcBackwashPressureScore — 反洗压力评分", () => {
  it("<= 0.1 满分", () => expect(calcBackwashPressureScore(0.08)).toBe(1.0));
  it("0.1-0.12 返回 0.7", () => expect(calcBackwashPressureScore(0.11)).toBe(0.7));
  it("0.12-0.15 返回 0.4", () => expect(calcBackwashPressureScore(0.13)).toBe(0.4));
  it("> 0.15 返回 0.0", () => expect(calcBackwashPressureScore(0.16)).toBe(0.0));
  it("null 返回 null", () => expect(calcBackwashPressureScore(null)).toBeNull());
});

describe("calcFluxRatioScore — 通量达标率评分", () => {
  it(">= 90% 满分", () => expect(calcFluxRatioScore(95)).toBe(1.0));
  it("70-90% 返回 0.7", () => expect(calcFluxRatioScore(80)).toBe(0.7));
  it("50-70% 返回 0.5", () => expect(calcFluxRatioScore(60)).toBe(0.5));
  it("< 50% 返回 0.1", () => expect(calcFluxRatioScore(30)).toBe(0.1));
});

describe("calcCleaningCycleDeviation — 清洗周期偏离", () => {
  it("current=30, historical=30 → 偏差 0", () => {
    expect(calcCleaningCycleDeviation(createHealthyAssessment({ currentCleaningCycle: 30, historicalCleaningCycle: 30 }))).toBe(0);
  });
  it("current=15, historical=30 → 偏差 50%", () => {
    expect(calcCleaningCycleDeviation(createHealthyAssessment({ currentCleaningCycle: 15, historicalCleaningCycle: 30 }))).toBe(50);
  });
  it("current 为 null 返回 null", () => {
    expect(calcCleaningCycleDeviation(createHealthyAssessment({ currentCleaningCycle: null }))).toBeNull();
  });
  it("historical 为 0 返回 null", () => {
    expect(calcCleaningCycleDeviation(createHealthyAssessment({ historicalCleaningCycle: 0 }))).toBeNull();
  });
});

// ================================================================
// 等级映射测试
// ================================================================
describe("scoreToGrade — 等级映射", () => {
  it("100 → A", () => expect(scoreToGrade(100)).toBe("A"));
  it("90 → A", () => expect(scoreToGrade(90)).toBe("A"));
  it("89 → B", () => expect(scoreToGrade(89)).toBe("B"));
  it("75 → B", () => expect(scoreToGrade(75)).toBe("B"));
  it("74 → C", () => expect(scoreToGrade(74)).toBe("C"));
  it("60 → C", () => expect(scoreToGrade(60)).toBe("C"));
  it("59 → D", () => expect(scoreToGrade(59)).toBe("D"));
  it("40 → D", () => expect(scoreToGrade(40)).toBe("D"));
  it("39 → E", () => expect(scoreToGrade(39)).toBe("E"));
  it("0 → E", () => expect(scoreToGrade(0)).toBe("E"));
});

describe("gradeToStatus — 状态映射", () => {
  it("A → healthy", () => expect(gradeToStatus("A")).toBe("healthy"));
  it("B → watch", () => expect(gradeToStatus("B")).toBe("watch"));
  it("C → warning", () => expect(gradeToStatus("C")).toBe("warning"));
  it("D → warning", () => expect(gradeToStatus("D")).toBe("warning"));
  it("E → critical", () => expect(gradeToStatus("E")).toBe("critical"));
});

// ================================================================
// 评分引擎测试
// ================================================================
describe("calculateScore — 健康膜组件", () => {
  it("健康组件得分 ≥ 90，等级 A", () => {
    const result = calculateScore(createHealthyAssessment());
    expect(result.totalScore).toBeGreaterThanOrEqual(90);
    expect(result.grade).toBe("A");
    expect(result.overallStatus).toBe("healthy");
    expect(result.redlineCount).toBe(0);
  });

  it("六维度分数在合法范围", () => {
    const result = calculateScore(createHealthyAssessment());
    expect(result.dimensions.hydraulic.score).toBeGreaterThan(0);
    expect(result.dimensions.hydraulic.score).toBeLessThanOrEqual(25);
    expect(result.dimensions.integrity.score).toBeGreaterThan(0);
    expect(result.dimensions.integrity.score).toBeLessThanOrEqual(25);
    expect(result.dimensions.fouling.score).toBeGreaterThan(0);
    expect(result.dimensions.fouling.score).toBeLessThanOrEqual(20);
    expect(result.dimensions.mechanical.score).toBeGreaterThan(0);
    expect(result.dimensions.mechanical.score).toBeLessThanOrEqual(15);
    expect(result.dimensions.risk.score).toBeGreaterThan(0);
    expect(result.dimensions.risk.score).toBeLessThanOrEqual(10);
    expect(result.dimensions.maintenance.score).toBeGreaterThan(0);
    expect(result.dimensions.maintenance.score).toBeLessThanOrEqual(5);
  });

  it("总分在 0-100 范围", () => {
    const result = calculateScore(createHealthyAssessment());
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });
});

describe("calculateScore — 严重衰减膜组件", () => {
  it("严重膜丝封堵降低完整性评分", () => {
    const healthy = calculateScore(createHealthyAssessment());
    const blocked = calculateScore(createHealthyAssessment({ fiberBlockageLevel: "severe" }));
    expect(blocked.dimensions.integrity.score).toBeLessThan(healthy.dimensions.integrity.score);
  });

  it("严重污染得分低", () => {
    const a = createHealthyAssessment({
      currentTMP: 45, turbidity: 0.8, actualFlux: 8,
      normalizedPermeability: 0.5, baselinePermeability: 1.33,
      postCipPermeability: 0.4,
      cakeLayer: "severe", organicFouling: "severe",
      mechanicalStatus: damagedMech(),
      stoppedAerationProducing: true, driedOut: true, mlss: 12000,
    });
    const result = calculateScore(a);
    expect(result.totalScore).toBeLessThan(60);
    expect(result.grade).toBe("D");
  });
});

describe("calculateScore — 红线覆盖逻辑", () => {
  it("红线触发后 overallStatus 强制 critical", () => {
    const result = calculateScore(createHealthyAssessment({ currentTMP: 55 }));
    expect(result.overallStatus).toBe("critical");
    expect(result.redlineCount).toBeGreaterThan(0);
  });

  it("红线触发后等级最高 D，即使评分很高", () => {
    const result = calculateScore(createHealthyAssessment({ currentTMP: 55, turbidity: 0.05, actualFlux: 20 }));
    expect(result.grade).toBe("D");
    expect(result.overallStatus).toBe("critical");
  });

  it("反洗压力红线 R2 触发", () => {
    const result = calculateScore(createHealthyAssessment({ backwashPressurePeak: 0.16 }));
    expect(result.overallStatus).toBe("critical");
    expect(result.redlineCount).toBeGreaterThan(0);
  });

  it("气密试验不合格红线 R3 触发", () => {
    const result = calculateScore(createHealthyAssessment({ airTightTestPassed: false }));
    expect(result.overallStatus).toBe("critical");
    expect(result.redlineCount).toBeGreaterThan(0);
  });

  it("多红线同时触发", () => {
    const result = calculateScore(createHealthyAssessment({
      currentTMP: 55, airTightTestPassed: false,
      sludgeParticles: true, driedOut: true,
    }));
    expect(result.redlineCount).toBeGreaterThanOrEqual(3);
    expect(result.overallStatus).toBe("critical");
  });
});

describe("calculateScore — 边界值", () => {
  it("TMP 恰好 50 kPa 触发红线", () => {
    expect(calculateScore(createHealthyAssessment({ currentTMP: 50 })).overallStatus).toBe("critical");
  });
  it("TMP 49 kPa 不触发红线", () => {
    expect(calculateScore(createHealthyAssessment({ currentTMP: 49 })).redlineCount).toBe(0);
  });
  it("反洗压力 0.15 MPa 不触发红线", () => {
    expect(calculateScore(createHealthyAssessment({ backwashPressurePeak: 0.15 })).redlineCount).toBe(0);
  });
  it("反洗压力 0.151 MPa 触发红线", () => {
    expect(calculateScore(createHealthyAssessment({ backwashPressurePeak: 0.151 })).overallStatus).toBe("critical");
  });
  it("水温 5°C 不触发红线", () => {
    expect(calculateScore(createHealthyAssessment({ waterTemperature: 5 })).redlineCount).toBe(0);
  });
  it("水温 4.9°C 触发红线", () => {
    expect(calculateScore(createHealthyAssessment({ waterTemperature: 4.9 })).overallStatus).toBe("critical");
  });
  it("水温 40°C 不触发红线", () => {
    expect(calculateScore(createHealthyAssessment({ waterTemperature: 40 })).redlineCount).toBe(0);
  });
  it("水温 40.1°C 触发红线", () => {
    expect(calculateScore(createHealthyAssessment({ waterTemperature: 40.1 })).overallStatus).toBe("critical");
  });
});

describe("calculateScore — 数据缺失", () => {
  it("大量数据缺失时评分降低但不崩溃", () => {
    const result = calculateScore(createHealthyAssessment({
      currentFlux: null, normalizedPermeability: null, tmpDailyIncrease: null,
      flowDeviation: null, ss: null, airTightTestPassed: null,
      preCipPermeability: null, postCipPermeability: null,
      preOfflineCleanPermeability: null, postOfflineCleanPermeability: null,
      lastCleaningDate: null, currentCleaningCycle: null,
      tmpReboundSpeed: null, cakeLayer: null, organicFouling: null,
      inorganicScaling: null, biofouling: null, fiberEntanglement: null,
      tmpPeak: null, backwashPressurePeak: null, mlss: null, riskDuration: null,
    }));
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
    expect(result.grade).toBeDefined();
  });
});

// ================================================================
// 红线引擎测试
// ================================================================
describe("redline — 逐条红线测试", () => {
  it("健康膜组件全部不触发", () => {
    expect(evaluateRedlines(createHealthyAssessment()).every((r) => !r.triggered)).toBe(true);
  });

  it("R1: TMP >= 50 触发", () => {
    const r1 = evaluateRedlines(createHealthyAssessment({ currentTMP: 55 })).find((r) => r.ruleId === "R1")!;
    expect(r1.triggered).toBe(true);
    expect(r1.value).toBe(55);
  });

  it("R1: TMP 恰好 50 触发", () => {
    expect(evaluateRedlines(createHealthyAssessment({ currentTMP: 50 })).find((r) => r.ruleId === "R1")!.triggered).toBe(true);
  });

  it("R1: TMP 49 不触发", () => {
    expect(evaluateRedlines(createHealthyAssessment({ currentTMP: 49 })).find((r) => r.ruleId === "R1")!.triggered).toBe(false);
  });

  it("R2: 反洗压力 > 0.15 触发, null 不触发", () => {
    expect(evaluateRedlines(createHealthyAssessment({ backwashPressurePeak: 0.16 })).find((r) => r.ruleId === "R2")!.triggered).toBe(true);
    expect(evaluateRedlines(createHealthyAssessment({ backwashPressurePeak: 0.15 })).find((r) => r.ruleId === "R2")!.triggered).toBe(false);
    expect(evaluateRedlines(createHealthyAssessment({ backwashPressurePeak: null })).find((r) => r.ruleId === "R2")!.triggered).toBe(false);
  });

  it("R3: 气密试验不合格触发，合格/null 不触发", () => {
    expect(evaluateRedlines(createHealthyAssessment({ airTightTestPassed: false })).find((r) => r.ruleId === "R3")!.triggered).toBe(true);
    expect(evaluateRedlines(createHealthyAssessment({ airTightTestPassed: true })).find((r) => r.ruleId === "R3")!.triggered).toBe(false);
    expect(evaluateRedlines(createHealthyAssessment({ airTightTestPassed: null })).find((r) => r.ruleId === "R3")!.triggered).toBe(false);
  });

  it("R4: 断丝且存在膜丝封堵时触发", () => {
    expect(evaluateRedlines(createHealthyAssessment({ fiberBreakDetected: true, fiberBlockageLevel: "mild" })).find((r) => r.ruleId === "R4")!.triggered).toBe(true);
    expect(evaluateRedlines(createHealthyAssessment({ fiberBreakDetected: true, fiberBlockageLevel: "none" })).find((r) => r.ruleId === "R4")!.triggered).toBe(false);
  });

  it("R5: 根部泄漏触发", () => {
    expect(evaluateRedlines(createHealthyAssessment({ rootLeakDetected: true })).find((r) => r.ruleId === "R5")!.triggered).toBe(true);
  });

  it("R6: 密封短路触发", () => {
    expect(evaluateRedlines(createHealthyAssessment({ sealShortCircuit: true })).find((r) => r.ruleId === "R6")!.triggered).toBe(true);
  });

  it("R7: 污泥颗粒触发", () => {
    expect(evaluateRedlines(createHealthyAssessment({ sludgeParticles: true })).find((r) => r.ruleId === "R7")!.triggered).toBe(true);
  });

  it("R8/R9/R10/R11: 干燥/冻结/撞击/停曝产水", () => {
    expect(evaluateRedlines(createHealthyAssessment({ driedOut: true })).find((r) => r.ruleId === "R8")!.triggered).toBe(true);
    expect(evaluateRedlines(createHealthyAssessment({ frozen: true })).find((r) => r.ruleId === "R9")!.triggered).toBe(true);
    expect(evaluateRedlines(createHealthyAssessment({ mechanicalImpact: true })).find((r) => r.ruleId === "R10")!.triggered).toBe(true);
    expect(evaluateRedlines(createHealthyAssessment({ stoppedAerationProducing: true })).find((r) => r.ruleId === "R11")!.triggered).toBe(true);
  });

  it("R12: 水温 < 5 或 > 40 触发", () => {
    expect(evaluateRedlines(createHealthyAssessment({ waterTemperature: 3 })).find((r) => r.ruleId === "R12")!.triggered).toBe(true);
    expect(evaluateRedlines(createHealthyAssessment({ waterTemperature: 42 })).find((r) => r.ruleId === "R12")!.triggered).toBe(true);
    expect(evaluateRedlines(createHealthyAssessment({ waterTemperature: 25 })).find((r) => r.ruleId === "R12")!.triggered).toBe(false);
  });

  it("R13: 膜架/集水管 damaged 触发", () => {
    const ms = createHealthyAssessment().mechanicalStatus;
    expect(evaluateRedlines(createHealthyAssessment({ mechanicalStatus: { ...ms, frameBolts: "damaged" } })).find((r) => r.ruleId === "R13")!.triggered).toBe(true);
    expect(evaluateRedlines(createHealthyAssessment({ mechanicalStatus: { ...ms, connectorPipe: "damaged" } })).find((r) => r.ruleId === "R13")!.triggered).toBe(true);
  });

  it("多红线同时触发（5条）", () => {
    const triggered = evaluateRedlines(createHealthyAssessment({
      currentTMP: 55, airTightTestPassed: false, sludgeParticles: true,
      driedOut: true, frozen: true,
    })).filter((r) => r.triggered);
    expect(triggered.length).toBeGreaterThanOrEqual(4);
  });
});

describe("redline — getTriggeredRedlines", () => {
  it("无红线返回空数组", () => {
    expect(getTriggeredRedlines(createHealthyAssessment())).toHaveLength(0);
  });

  it("只返回触发的红线", () => {
    const triggered = getTriggeredRedlines(createHealthyAssessment({ currentTMP: 55, airTightTestPassed: false }));
    expect(triggered.length).toBe(2);
    expect(triggered.every((r) => r.triggered)).toBe(true);
  });

  it("每条红线包含完整信息", () => {
    const t = getTriggeredRedlines(createHealthyAssessment({ currentTMP: 55 }))[0];
    expect(t.ruleId).toBeDefined();
    expect(t.name).toBeDefined();
    expect(t.threshold).toBeDefined();
    expect(t.recommendation).toBeDefined();
  });
});

// ================================================================
// 运行全部测试
// ================================================================
printSummary();
