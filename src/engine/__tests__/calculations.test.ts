import { describe, it, expect } from "vitest";
import { createHealthyAssessment } from "./helpers";
import {
  calcFlux,
  calcPermeability,
  calcPermeabilityRetention,
  calcCipRecoveryRate,
  calcOfflineRecoveryRate,
  calcIrreversibleFoulingIndex,
  calcBrokenFiberRate,
  calcFluxRatio,
  calcCleaningCycleDeviation,
  calcRiskEventCount,
  calcFoulingComposite,
  calcDataCompleteness,
  calcTmpScore,
  calcFluxRatioScore,
  calcTurbidityScore,
  calcAirtightScore,
  calcMlssScore,
  calcRiskEventsScore,
  calcBackwashPressureScore,
} from "../calculations";

describe("calcFlux", () => {
  it("通量 = 产水量 / 膜面积", () => {
    const a = createHealthyAssessment({ currentWaterProduction: 20000, membraneArea: 1000 });
    expect(calcFlux(a)).toBe(20);
  });

  it("膜面积为 0 时返回 null（除零保护）", () => {
    const a = createHealthyAssessment({ membraneArea: 0 });
    expect(calcFlux(a)).toBeNull();
  });

  it("膜面积为负数时返回 null", () => {
    const a = createHealthyAssessment({ membraneArea: -100 });
    expect(calcFlux(a)).toBeNull();
  });
});

describe("calcPermeability", () => {
  it("比通量 = 通量 / |TMP|", () => {
    const a = createHealthyAssessment({ currentWaterProduction: 20000, membraneArea: 1000, currentTMP: 20 });
    expect(calcPermeability(a)).toBe(1.0);
  });

  it("TMP=0 时除零保护返回 null", () => {
    const a = createHealthyAssessment({ currentTMP: 0 });
    expect(calcPermeability(a)).toBeNull();
  });

  it("TMP 为负数时以绝对值计算", () => {
    const a = createHealthyAssessment({ currentWaterProduction: 15000, membraneArea: 1000, currentTMP: -15 });
    expect(calcPermeability(a)).toBe(1.0);
  });
});

describe("calcPermeabilityRetention", () => {
  it("保持率 = 标准化比通量 / 基准 × 100", () => {
    const a = createHealthyAssessment({ normalizedPermeability: 1.0, baselinePermeability: 1.33 });
    const retention = calcPermeabilityRetention(a);
    expect(retention).toBeCloseTo(75.19, 1);
  });

  it("标准化比通量为 null 时返回 null", () => {
    const a = createHealthyAssessment({ normalizedPermeability: null });
    expect(calcPermeabilityRetention(a)).toBeNull();
  });

  it("基准比通量为 0 时返回 null（除零保护）", () => {
    const a = createHealthyAssessment({ baselinePermeability: 0 });
    expect(calcPermeabilityRetention(a)).toBeNull();
  });
});

describe("calcCipRecoveryRate", () => {
  it("清洗恢复率 = 清洗后比通量 / 基准 × 100", () => {
    const a = createHealthyAssessment({ postCipPermeability: 1.2, baselinePermeability: 1.33 });
    expect(calcCipRecoveryRate(a)).toBeCloseTo(90.23, 1);
  });

  it("清洗后比通量为 null 时返回 null", () => {
    const a = createHealthyAssessment({ postCipPermeability: null });
    expect(calcCipRecoveryRate(a)).toBeNull();
  });

  it("基准为 0 时返回 null（除零保护）", () => {
    const a = createHealthyAssessment({ baselinePermeability: 0 });
    expect(calcCipRecoveryRate(a)).toBeNull();
  });
});

describe("calcIrreversibleFoulingIndex", () => {
  it("不可逆污染指数 = 1 - 清洗后/基准", () => {
    const a = createHealthyAssessment({ postCipPermeability: 0.8, baselinePermeability: 1.33 });
    expect(calcIrreversibleFoulingIndex(a)).toBeCloseTo(0.398, 2);
  });

  it("完全恢复时不可逆指数为 0", () => {
    const a = createHealthyAssessment({ postCipPermeability: 1.33, baselinePermeability: 1.33 });
    expect(calcIrreversibleFoulingIndex(a)).toBe(0);
  });

  it("数据不足时返回 null", () => {
    const a = createHealthyAssessment({ postCipPermeability: null, preOfflineCleanPermeability: null });
    expect(calcIrreversibleFoulingIndex(a)).toBeNull();
  });

  it("使用离线清洗数据作为 fallback", () => {
    const a = createHealthyAssessment({
      postCipPermeability: null,
      postOfflineCleanPermeability: 1.0,
      baselinePermeability: 1.33,
    });
    expect(calcIrreversibleFoulingIndex(a)).toBeCloseTo(0.248, 2);
  });
});

describe("calcBrokenFiberRate", () => {
  it("断丝率 = 已封堵 / 总膜丝数 × 100%", () => {
    const a = createHealthyAssessment({ blockedFiberCount: 50, totalFiberCount: 10000 });
    expect(calcBrokenFiberRate(a)).toBe(0.5);
  });

  it("无断丝时断丝率为 0", () => {
    const a = createHealthyAssessment({ blockedFiberCount: 0, totalFiberCount: 10000 });
    expect(calcBrokenFiberRate(a)).toBe(0);
  });

  it("总膜丝数为 0 时返回 null", () => {
    const a = createHealthyAssessment({ totalFiberCount: 0 });
    expect(calcBrokenFiberRate(a)).toBeNull();
  });
});

describe("calcRiskEventCount", () => {
  it("无风险事件时返回 0", () => {
    const a = createHealthyAssessment();
    expect(calcRiskEventCount(a)).toBe(0);
  });

  it("正确统计 8 项风险事件", () => {
    const a = createHealthyAssessment({
      stoppedAerationProducing: true,
      driedOut: true,
      frozen: true,
    });
    expect(calcRiskEventCount(a)).toBe(3);
  });

  it("全部触发时返回 8", () => {
    const a = createHealthyAssessment({
      stoppedAerationProducing: true,
      fiberExposedToAir: true,
      driedOut: true,
      frozen: true,
      mechanicalImpact: true,
      oilContamination: true,
      toxicInflow: true,
      chemicalAbnormality: true,
    });
    expect(calcRiskEventCount(a)).toBe(8);
  });
});

describe("calcDataCompleteness", () => {
  it("完整数据返回 100%", () => {
    const a = createHealthyAssessment();
    const completeness = calcDataCompleteness(a);
    expect(completeness).toBeGreaterThan(90);
  });
});

describe("calcTmpScore", () => {
  it("TMP 在 0-30 kPa 满分", () => {
    expect(calcTmpScore(createHealthyAssessment({ currentTMP: 15 }))).toBe(1.0);
  });

  it("TMP 为 0 返回 0.5", () => {
    expect(calcTmpScore(createHealthyAssessment({ currentTMP: 0 }))).toBe(0.5);
  });

  it("TMP 30-40 返回 0.7", () => {
    expect(calcTmpScore(createHealthyAssessment({ currentTMP: 35 }))).toBe(0.7);
  });

  it("TMP 40-50 返回 0.4", () => {
    expect(calcTmpScore(createHealthyAssessment({ currentTMP: 45 }))).toBe(0.4);
  });

  it("TMP >= 50 返回 0.0", () => {
    expect(calcTmpScore(createHealthyAssessment({ currentTMP: 55 }))).toBe(0.0);
  });

  it("TMP 为负值时取绝对值", () => {
    expect(calcTmpScore(createHealthyAssessment({ currentTMP: -25 }))).toBe(1.0);
  });
});

describe("calcFluxRatioScore", () => {
  it("通量达标率 >= 90% 满分", () => expect(calcFluxRatioScore(95)).toBe(1.0));
  it("通量达标率 70-90% 返回 0.7", () => expect(calcFluxRatioScore(80)).toBe(0.7));
  it("通量达标率 50-70% 返回 0.5", () => expect(calcFluxRatioScore(60)).toBe(0.5));
  it("通量达标率 < 50% 返回 0.1", () => expect(calcFluxRatioScore(30)).toBe(0.1));
});

describe("calcTurbidityScore", () => {
  it("浊度 <= 0.1 NTU 满分", () => expect(calcTurbidityScore(0.05)).toBe(1.0));
  it("浊度 0.1-0.3 返回 0.8", () => expect(calcTurbidityScore(0.2)).toBe(0.8));
  it("浊度 0.3-0.5 返回 0.5", () => expect(calcTurbidityScore(0.4)).toBe(0.5));
  it("浊度 > 0.5 返回 0.1", () => expect(calcTurbidityScore(0.8)).toBe(0.1));
  it("浊度边界值 0.1NTU 满分", () => expect(calcTurbidityScore(0.1)).toBe(1.0));
  it("浊度边界值 0.3NTU 返回 0.8", () => expect(calcTurbidityScore(0.3)).toBe(0.8));
  it("浊度边界值 0.5NTU 返回 0.5", () => expect(calcTurbidityScore(0.5)).toBe(0.5));
});

describe("calcAirtightScore", () => {
  it("气密试验合格返回 1.0", () => {
    expect(calcAirtightScore(createHealthyAssessment({ airTightTestPassed: true }))).toBe(1.0);
  });

  it("气密试验不合格返回 0.0", () => {
    expect(calcAirtightScore(createHealthyAssessment({ airTightTestPassed: false }))).toBe(0.0);
  });

  it("未做气密试验返回 null", () => {
    expect(calcAirtightScore(createHealthyAssessment({ airTightTestPassed: null }))).toBeNull();
  });
});

describe("calcMlssScore", () => {
  it("MLSS 3000-8000 满分", () => expect(calcMlssScore(5000)).toBe(1.0));
  it("MLSS 2000-3000 返回 0.7", () => expect(calcMlssScore(2500)).toBe(0.7));
  it("MLSS 8000-10000 返回 0.7", () => expect(calcMlssScore(9000)).toBe(0.7));
  it("MLSS < 2000 返回 0.3", () => expect(calcMlssScore(1500)).toBe(0.3));
  it("MLSS > 10000 返回 0.1", () => expect(calcMlssScore(12000)).toBe(0.1));
  it("MLSS null 返回 null", () => expect(calcMlssScore(null)).toBeNull());
  it("MLSS 边界3000 满分", () => expect(calcMlssScore(3000)).toBe(1.0));
  it("MLSS 边界8000 满分", () => expect(calcMlssScore(8000)).toBe(1.0));
});

describe("calcRiskEventsScore", () => {
  it("0个风险事件满分", () => expect(calcRiskEventsScore(0)).toBe(1.0));
  it("1个风险事件返回 0.6", () => expect(calcRiskEventsScore(1)).toBe(0.6));
  it("2-3个风险事件返回 0.3", () => expect(calcRiskEventsScore(2)).toBe(0.3));
  it("4个以上返回 0", () => expect(calcRiskEventsScore(5)).toBe(0.0));
});

describe("calcBackwashPressureScore", () => {
  it("<= 0.1 MPa 满分", () => expect(calcBackwashPressureScore(0.08)).toBe(1.0));
  it("0.1-0.12 返回 0.7", () => expect(calcBackwashPressureScore(0.11)).toBe(0.7));
  it("0.12-0.15 返回 0.4", () => expect(calcBackwashPressureScore(0.13)).toBe(0.4));
  it("> 0.15 返回 0.0", () => expect(calcBackwashPressureScore(0.16)).toBe(0.0));
  it("null 时返回 null", () => expect(calcBackwashPressureScore(null)).toBeNull());
});

describe("calcCleaningCycleDeviation", () => {
  it("current=30, historical=30 -> 偏差 0", () => {
    const a = createHealthyAssessment({ currentCleaningCycle: 30, historicalCleaningCycle: 30 });
    expect(calcCleaningCycleDeviation(a)).toBe(0);
  });

  it("current=15, historical=30 -> 偏差 50%", () => {
    const a = createHealthyAssessment({ currentCleaningCycle: 15, historicalCleaningCycle: 30 });
    expect(calcCleaningCycleDeviation(a)).toBe(50);
  });

  it("current 为 null 时返回 null", () => {
    const a = createHealthyAssessment({ currentCleaningCycle: null });
    expect(calcCleaningCycleDeviation(a)).toBeNull();
  });

  it("historical 为 0 时返回 null", () => {
    const a = createHealthyAssessment({ historicalCleaningCycle: 0 });
    expect(calcCleaningCycleDeviation(a)).toBeNull();
  });
});
