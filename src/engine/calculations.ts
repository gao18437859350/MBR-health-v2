import type { Assessment } from "../types/index.js";

// ================================================================
// 指标计算引擎
// 所有函数为纯函数，输入 Assessment，输出计算结果
// 数据不足时返回 null（调用方展示"数据不足"）
// ================================================================

/** 膜通量 J = Q / A */
export function calcFlux(assessment: Assessment): number | null {
  if (assessment.membraneArea <= 0) return null;
  return assessment.currentWaterProduction / assessment.membraneArea;
}

/** 比通量 K = J / |TMP|。TMP=0 时除零保护，返回 null */
export function calcPermeability(assessment: Assessment): number | null {
  const flux = calcFlux(assessment);
  const tmp = Math.abs(assessment.currentTMP);
  if (flux === null || tmp === 0) return null;
  return flux / tmp;
}

/** 标准化比通量保持率 Rk = K_current / K_baseline × 100% */
export function calcPermeabilityRetention(assessment: Assessment): number | null {
  if (assessment.normalizedPermeability === null || assessment.baselinePermeability <= 0) return null;
  return (assessment.normalizedPermeability / assessment.baselinePermeability) * 100;
}

/** 在线清洗恢复率 Rc = K_after_cleaning / K_baseline × 100% */
export function calcCipRecoveryRate(assessment: Assessment): number | null {
  if (assessment.postCipPermeability === null || assessment.baselinePermeability <= 0) return null;
  return (assessment.postCipPermeability / assessment.baselinePermeability) * 100;
}

/** 离线清洗恢复率 */
export function calcOfflineRecoveryRate(assessment: Assessment): number | null {
  if (assessment.postOfflineCleanPermeability === null || assessment.baselinePermeability <= 0) return null;
  return (assessment.postOfflineCleanPermeability / assessment.baselinePermeability) * 100;
}

/** 不可逆污染指数 Firr = 1 - K_after_cleaning / K_baseline */
export function calcIrreversibleFoulingIndex(assessment: Assessment): number | null {
  const postClean = assessment.postCipPermeability ?? assessment.postOfflineCleanPermeability;
  if (postClean === null || assessment.baselinePermeability <= 0) return null;
  return 1 - postClean / assessment.baselinePermeability;
}

/** 断丝率 = blockedFiberCount / totalFiberCount × 100% */
export function calcBrokenFiberRate(assessment: Assessment): number | null {
  if (assessment.totalFiberCount <= 0) return null;
  return (assessment.blockedFiberCount / assessment.totalFiberCount) * 100;
}

/** 通量达标率（实际通量 / 设计通量下限 10 LMH） */
export function calcFluxRatio(assessment: Assessment): number {
  const designFluxMin = 10; // LMH, 来自 manual 规则
  if (assessment.actualFlux <= 0) return 0;
  const ratio = (assessment.actualFlux / designFluxMin) * 100;
  return Math.min(ratio, 200); // 上限 200%
}

/** 清洗周期偏离率 = |当前 - 历史| / 历史 × 100% */
export function calcCleaningCycleDeviation(assessment: Assessment): number | null {
  if (assessment.currentCleaningCycle === null || assessment.historicalCleaningCycle <= 0) return null;
  return (
    (Math.abs(assessment.currentCleaningCycle - assessment.historicalCleaningCycle) /
      assessment.historicalCleaningCycle) *
    100
  );
}

/** 风险事件计数（8项boolean风险事件） */
export function calcRiskEventCount(assessment: Assessment): number {
  const events = [
    assessment.stoppedAerationProducing,
    assessment.fiberExposedToAir,
    assessment.driedOut,
    assessment.frozen,
    assessment.mechanicalImpact,
    assessment.oilContamination,
    assessment.toxicInflow,
    assessment.chemicalAbnormality,
  ];
  return events.filter(Boolean).length;
}

/** 污染综合评分（5种污染类型的平均值映射） */
export function calcFoulingComposite(assessment: Assessment): number | null {
  const levels: Record<string, number> = { none: 1, mild: 0.75, moderate: 0.45, severe: 0.1 };
  const foulingFields = [
    assessment.cakeLayer,
    assessment.organicFouling,
    assessment.inorganicScaling,
    assessment.biofouling,
    assessment.fiberEntanglement,
  ];
  if (foulingFields.every((f) => f === null)) return null;
  const sum = foulingFields.reduce((acc, f) => acc + (f ? levels[f] ?? 0.5 : 0.5), 0);
  return sum / foulingFields.length;
}

/** TMP反弹速度评分映射 */
export function calcTmpReboundScore(assessment: Assessment): number {
  switch (assessment.tmpReboundSpeed) {
    case "slow": return 1.0;
    case "moderate": return 0.6;
    case "fast": return 0.2;
    default: return 0.5;
  }
}

/** 气密试验评分 */
export function calcAirtightScore(assessment: Assessment): number | null {
  if (assessment.airTightTestPassed === null) return null;
  return assessment.airTightTestPassed ? 1.0 : 0.0;
}

/** TMP值评分（基于绝对值，按说明书 10-30 kPa 为最佳） */
export function calcTmpScore(assessment: Assessment): number {
  const tmp = Math.abs(assessment.currentTMP);
  if (tmp <= 0) return 0.5;
  if (tmp <= 30) return 1.0;
  if (tmp <= 40) return 0.7;
  if (tmp < 50) return 0.4;
  return 0.0;
}

/** 通量达标率评分 */
export function calcFluxRatioScore(fluxRatio: number): number {
  if (fluxRatio >= 90) return 1.0;
  if (fluxRatio >= 70) return 0.7;
  if (fluxRatio >= 50) return 0.5;
  return 0.1;
}

/** 比通量保持率评分 */
export function calcPermeabilityRetentionScore(retention: number): number {
  if (retention >= 85) return 1.0;
  if (retention >= 70) return 0.8;
  if (retention >= 50) return 0.5;
  return 0.1;
}

/** TMP日增长率评分 */
export function calcTmpDailyIncreaseScore(tmpInc: number | null): number | null {
  if (tmpInc === null || tmpInc === undefined) return null;
  if (tmpInc <= 0.3) return 1.0;
  if (tmpInc <= 0.5) return 0.8;
  if (tmpInc <= 1.0) return 0.5;
  return 0.1;
}

/** 流量偏差评分 */
export function calcFlowDeviationScore(dev: number | null): number | null {
  if (dev === null || dev === undefined) return null;
  if (dev <= 10) return 1.0;
  if (dev <= 20) return 0.7;
  if (dev <= 30) return 0.4;
  return 0.1;
}

/** 浊度评分 */
export function calcTurbidityScore(turbidity: number): number {
  if (turbidity <= 0.1) return 1.0;
  if (turbidity <= 0.3) return 0.8;
  if (turbidity <= 0.5) return 0.5;
  return 0.1;
}

/** SS评分 */
export function calcSsScore(ss: number | null): number | null {
  if (ss === null || ss === undefined) return null;
  if (ss <= 1) return 1.0;
  if (ss <= 3) return 0.7;
  if (ss <= 5) return 0.4;
  return 0.1;
}

/** 断丝率评分 */
export function calcBrokenFiberRateScore(rate: number): number {
  if (rate <= 0.1) return 1.0;
  if (rate <= 0.5) return 0.7;
  if (rate <= 1.0) return 0.4;
  return 0.1;
}

/** 膜丝封堵情况评分 */
export function calcFiberBlockageScore(level: Assessment["fiberBlockageLevel"]): number {
  return { none: 1.0, mild: 0.7, moderate: 0.4, severe: 0.1 }[level];
}

/** 清洗恢复率评分 */
export function calcRecoveryRateScore(recovery: number): number {
  if (recovery >= 90) return 1.0;
  if (recovery >= 75) return 0.7;
  if (recovery >= 55) return 0.4;
  return 0.1;
}

/** 不可逆污染指数评分 */
export function calcIrreversibleIndexScore(index: number): number {
  if (index <= 0.2) return 1.0;
  if (index <= 0.35) return 0.7;
  if (index <= 0.5) return 0.4;
  return 0.1;
}

/** 清洗周期偏离评分 */
export function calcCleaningCycleDeviationScore(deviation: number): number {
  if (deviation <= 30) return 1.0;
  if (deviation <= 50) return 0.7;
  if (deviation <= 70) return 0.4;
  return 0.1;
}

/** MLSS评分 */
export function calcMlssScore(mlss: number | null): number | null {
  if (mlss === null || mlss === undefined) return null;
  if (mlss >= 3000 && mlss <= 8000) return 1.0;
  if ((mlss >= 2000 && mlss < 3000) || (mlss > 8000 && mlss <= 10000)) return 0.7;
  if (mlss < 2000) return 0.3;
  return 0.1; // > 10000
}

/** 风险事件评分 */
export function calcRiskEventsScore(count: number): number {
  if (count === 0) return 1.0;
  if (count <= 1) return 0.6;
  if (count <= 3) return 0.3;
  return 0.0;
}

/** 通量超限评分（>25 LMH 为超限） */
export function calcFluxOverLimitScore(flux: number): number {
  if (flux <= 0) return 0.5;
  if (flux <= 25) return 1.0;
  if (flux <= 30) return 0.5;
  return 0.0;
}

/** 反洗压力超限评分 */
export function calcBackwashPressureScore(pressure: number | null): number | null {
  if (pressure === null || pressure === undefined) return null;
  if (pressure <= 0.1) return 1.0;
  if (pressure <= 0.12) return 0.7;
  if (pressure <= 0.15) return 0.4;
  return 0.0;
}

/** 机械状态项映射为分数 */
export function mechanicalStatusToScore(status: "normal" | "warning" | "damaged"): number {
  switch (status) {
    case "normal": return 1.0;
    case "warning": return 0.5;
    case "damaged": return 0.0;
  }
}

/**
 * 数据完整度计算
 * 统计所有非 null/undefined 的可选字段比例
 */
export function calcDataCompleteness(assessment: Assessment): number {
  const nullableFields: (number | string | boolean | null | undefined)[] = [
    assessment.currentFlux,
    assessment.normalizedPermeability,
    assessment.tmpDailyIncrease,
    assessment.flowDeviation,
    assessment.ss,
    assessment.airTightTestPassed,
    assessment.preCipPermeability,
    assessment.postCipPermeability,
    assessment.preOfflineCleanPermeability,
    assessment.postOfflineCleanPermeability,
    assessment.lastCleaningDate,
    assessment.currentCleaningCycle,
    assessment.tmpReboundSpeed,
    assessment.cakeLayer,
    assessment.organicFouling,
    assessment.inorganicScaling,
    assessment.biofouling,
    assessment.fiberEntanglement,
    assessment.tmpPeak,
    assessment.backwashPressurePeak,
    assessment.mlss,
    assessment.riskDuration,
  ];

  const filled = nullableFields.filter((v) => v !== null && v !== undefined && v !== "").length;
  return (filled / nullableFields.length) * 100;
}
