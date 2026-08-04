import type { Assessment, ScoringResult, ScoreDetail, DimensionScore, HealthGrade, OverallStatus } from "../types/index.js";
import { getTriggeredRedlines } from "../constants/redline-rules.js";
import {
  calcFluxRatio,
  calcPermeabilityRetention,
  calcCipRecoveryRate,
  calcIrreversibleFoulingIndex,
  calcCleaningCycleDeviation,
  calcRiskEventCount,
  calcFoulingComposite,
  calcDataCompleteness,
  calcTmpScore,
  calcFluxRatioScore,
  calcPermeabilityRetentionScore,
  calcTmpDailyIncreaseScore,
  calcFlowDeviationScore,
  calcTurbidityScore,
  calcSsScore,
  calcAirtightScore,
  calcFiberBlockageScore,
  calcRecoveryRateScore,
  calcIrreversibleIndexScore,
  calcTmpReboundScore,
  calcCleaningCycleDeviationScore,
  calcMlssScore,
  calcRiskEventsScore,
  calcFluxOverLimitScore,
  calcBackwashPressureScore,
  mechanicalStatusToScore,
} from "./calculations";

// ================================================================
// 六维度权重配置
// ================================================================
const DIMENSION_WEIGHTS = {
  hydraulic: { maxScore: 25 },
  integrity: { maxScore: 25 },
  fouling: { maxScore: 20 },
  mechanical: { maxScore: 15 },
  risk: { maxScore: 10 },
  maintenance: { maxScore: 5 },
};

const TOTAL_MAX_SCORE = 100;

// ================================================================
// 等级判定
// ================================================================
function scoreToGrade(score: number): HealthGrade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "E";
}

function gradeToStatus(grade: HealthGrade): OverallStatus {
  switch (grade) {
    case "A": return "healthy";
    case "B": return "watch";
    case "C": return "warning";
    case "D": return "warning";
    case "E": return "critical";
  }
}

function scoreToBand(ratio: number): ScoreDetail["band"] {
  if (ratio >= 0.9) return "excellent";
  if (ratio >= 0.7) return "good";
  if (ratio >= 0.4) return "fair";
  return "poor";
}

// ================================================================
// 辅助函数
// ================================================================
function clampScore(score: number, max: number): number {
  return Math.max(0, Math.min(score, max));
}

function safeRatio(value: number | null, maxScore: number): { score: number; band: ScoreDetail["band"] } {
  if (value === null) return { score: 0, band: "poor" };
  const ratio = Math.max(0, Math.min(1, value));
  return { score: Math.round(ratio * maxScore * 10) / 10, band: scoreToBand(ratio) };
}

// ================================================================
// 各维度评分计算
// ================================================================

/** 水力性能 — 25分 */
function scoreHydraulic(a: Assessment): DimensionScore {
  const maxScore = DIMENSION_WEIGHTS.hydraulic.maxScore;

  // 1. TMP评分（占6分）
  const tmpRaw = calcTmpScore(a);
  const tmpDetail: ScoreDetail = {
    metric: "TMP绝对值",
    value: Math.abs(a.currentTMP),
    score: clampScore(tmpRaw * 6, 6),
    maxScore: 6,
    band: scoreToBand(tmpRaw),
    reason: tmpRaw >= 0.7 ? "TMP在推荐范围内" : tmpRaw >= 0.4 ? "TMP偏高，需关注" : "TMP严重偏高",
  };

  // 2. 通量达标率（占5分）
  const fluxRatio = calcFluxRatio(a);
  const fluxRaw = calcFluxRatioScore(fluxRatio);
  const fluxDetail: ScoreDetail = {
    metric: "通量达标率",
    value: Math.round(fluxRatio),
    score: clampScore(fluxRaw * 5, 5),
    maxScore: 5,
    band: scoreToBand(fluxRaw),
    reason: fluxRaw >= 0.7 ? "通量在合理范围" : "通量偏低，影响产水效率",
  };

  // 3. 比通量保持率（占5分）
  const retention = calcPermeabilityRetention(a);
  let retentionDetail: ScoreDetail;
  if (retention === null) {
    retentionDetail = { metric: "比通量保持率", value: null, score: 0, maxScore: 5, band: "poor", reason: "数据不足：缺少标准化比通量或基准比通量" };
  } else {
    const rScore = calcPermeabilityRetentionScore(retention);
    retentionDetail = {
      metric: "比通量保持率",
      value: Math.round(retention * 10) / 10,
      score: clampScore(rScore * 5, 5),
      maxScore: 5,
      band: scoreToBand(rScore),
      reason: rScore >= 0.7 ? "比通量保持良好" : "比通量下降明显，膜污染可能加剧",
    };
  }

  // 4. TMP日增长率（占5分）
  const tmpIncScore = calcTmpDailyIncreaseScore(a.tmpDailyIncrease);
  let tmpIncDetail: ScoreDetail;
  if (tmpIncScore === null) {
    tmpIncDetail = { metric: "TMP日增长率", value: null, score: 0, maxScore: 5, band: "poor", reason: "数据不足" };
  } else {
    tmpIncDetail = {
      metric: "TMP日增长率",
      value: a.tmpDailyIncrease,
      score: clampScore(tmpIncScore * 5, 5),
      maxScore: 5,
      band: scoreToBand(tmpIncScore),
      reason: tmpIncScore >= 0.7 ? "TMP增长稳定" : "TMP增长过快，需关注",
    };
  }

  // 5. 膜箱间流量偏差（占4分）
  const flowDevScore = calcFlowDeviationScore(a.flowDeviation);
  let flowDevDetail: ScoreDetail;
  if (flowDevScore === null) {
    flowDevDetail = { metric: "膜箱间流量偏差", value: null, score: 0, maxScore: 4, band: "poor", reason: "数据不足" };
  } else {
    flowDevDetail = {
      metric: "膜箱间流量偏差",
      value: a.flowDeviation,
      score: clampScore(flowDevScore * 4, 4),
      maxScore: 4,
      band: scoreToBand(flowDevScore),
      reason: flowDevScore >= 0.7 ? "流量分布均匀" : "流量偏差较大，存在不均匀污染",
    };
  }

  const total = tmpDetail.score + fluxDetail.score + retentionDetail.score + tmpIncDetail.score + flowDevDetail.score;
  return {
    score: Math.round(total * 10) / 10,
    maxScore,
    details: [tmpDetail, fluxDetail, retentionDetail, tmpIncDetail, flowDevDetail],
  };
}

/** 膜完整性及出水 — 25分 */
function scoreIntegrity(a: Assessment): DimensionScore {
  const maxScore = DIMENSION_WEIGHTS.integrity.maxScore;

  // 1. 浊度（占8分）
  const turbRaw = calcTurbidityScore(a.turbidity);
  const turbDetail: ScoreDetail = {
    metric: "产水浊度",
    value: a.turbidity,
    score: clampScore(turbRaw * 8, 8),
    maxScore: 8,
    band: scoreToBand(turbRaw),
    reason: turbRaw >= 0.7 ? "浊度正常" : "浊度偏高，需排查膜完整性",
  };

  // 2. SS（占4分）
  const ssRaw = calcSsScore(a.ss);
  let ssDetail: ScoreDetail;
  if (ssRaw === null) {
    ssDetail = { metric: "产水SS", value: null, score: 0, maxScore: 4, band: "poor", reason: "数据不足" };
  } else {
    ssDetail = {
      metric: "产水SS",
      value: a.ss,
      score: clampScore(ssRaw * 4, 4),
      maxScore: 4,
      band: scoreToBand(ssRaw),
      reason: ssRaw >= 0.7 ? "SS在正常范围" : "SS偏高",
    };
  }

  // 3. 气密试验（占5分）
  const airtightRaw = calcAirtightScore(a);
  let airtightDetail: ScoreDetail;
  if (airtightRaw === null) {
    airtightDetail = { metric: "气密试验", value: null, score: 0, maxScore: 5, band: "poor", reason: "数据不足：未进行气密试验" };
  } else {
    airtightDetail = {
      metric: "气密试验（0.02 MPa）",
      value: a.airTightTestPassed ? "合格" : "不合格",
      score: airtightRaw > 0 ? 5 : 0,
      maxScore: 5,
      band: airtightRaw > 0 ? "excellent" : "poor",
      reason: airtightRaw > 0 ? "气密试验合格" : "气密试验不合格！存在泄漏风险",
    };
  }

  // 4. 膜丝封堵情况（占5分）
  const blockageScore = calcFiberBlockageScore(a.fiberBlockageLevel);
  const blockageLabels = { none: "未发现", mild: "轻微", moderate: "中度", severe: "严重" };
  const brokenDetail: ScoreDetail = {
    metric: "膜丝封堵情况",
    value: blockageLabels[a.fiberBlockageLevel],
    score: clampScore(blockageScore * 5, 5),
    maxScore: 5,
    band: scoreToBand(blockageScore),
    reason: a.fiberBlockageLevel === "none"
      ? "未发现膜丝封堵"
      : a.fiberBlockageLevel === "mild"
        ? "存在轻微封堵，建议持续观察"
        : a.fiberBlockageLevel === "moderate"
          ? "存在中度封堵，建议安排检查处理"
          : "膜丝封堵严重，建议尽快停机排查",
  };

  // 5. 泄漏/短路综合扣分（占3分，污泥颗粒+根部泄漏+密封短路 各1分）
  const leakScore = 3 - (a.sludgeParticles ? 1 : 0) - (a.rootLeakDetected ? 1 : 0) - (a.sealShortCircuit ? 1 : 0);
  const leakDetail: ScoreDetail = {
    metric: "泄漏/短路检测",
    value: [a.sludgeParticles ? "污泥颗粒" : "", a.rootLeakDetected ? "根部泄漏" : "", a.sealShortCircuit ? "密封短路" : ""].filter(Boolean).join("、") || "无",
    score: clampScore(leakScore, 3),
    maxScore: 3,
    band: leakScore === 3 ? "excellent" : leakScore >= 2 ? "good" : leakScore >= 1 ? "fair" : "poor",
    reason: leakScore === 3 ? "无泄漏/短路问题" : `检测到${3 - leakScore}项泄漏/短路问题`,
  };

  const total = turbDetail.score + ssDetail.score + airtightDetail.score + brokenDetail.score + leakDetail.score;
  return {
    score: Math.round(total * 10) / 10,
    maxScore,
    details: [turbDetail, ssDetail, airtightDetail, brokenDetail, leakDetail],
  };
}

/** 污染与清洗恢复 — 20分 */
function scoreFouling(a: Assessment): DimensionScore {
  const maxScore = DIMENSION_WEIGHTS.fouling.maxScore;

  // 1. 在线清洗恢复率（占5分）
  const cipRecovery = calcCipRecoveryRate(a);
  let cipDetail: ScoreDetail;
  if (cipRecovery === null) {
    cipDetail = { metric: "在线清洗恢复率", value: null, score: 0, maxScore: 5, band: "poor", reason: "数据不足：缺少清洗后比通量或基准比通量" };
  } else {
    const crScore = calcRecoveryRateScore(cipRecovery);
    cipDetail = {
      metric: "在线清洗恢复率",
      value: Math.round(cipRecovery * 10) / 10,
      score: clampScore(crScore * 5, 5),
      maxScore: 5,
      band: scoreToBand(crScore),
      reason: crScore >= 0.7 ? "清洗恢复良好" : "清洗恢复率低，不可逆污染比例高",
    };
  }

  // 2. 不可逆污染指数（占5分）
  const irrevIndex = calcIrreversibleFoulingIndex(a);
  let irrevDetail: ScoreDetail;
  if (irrevIndex === null) {
    irrevDetail = { metric: "不可逆污染指数", value: null, score: 0, maxScore: 5, band: "poor", reason: "数据不足" };
  } else {
    const iiScore = calcIrreversibleIndexScore(irrevIndex);
    irrevDetail = {
      metric: "不可逆污染指数",
      value: Math.round(irrevIndex * 1000) / 1000,
      score: clampScore(iiScore * 5, 5),
      maxScore: 5,
      band: scoreToBand(iiScore),
      reason: iiScore >= 0.7 ? "不可逆污染比例低" : iiScore >= 0.4 ? "不可逆污染比例较高" : "不可逆污染严重",
    };
  }

  // 3. 清洗周期偏离（占4分）
  const cycleDev = calcCleaningCycleDeviation(a);
  let cycleDetail: ScoreDetail;
  if (cycleDev === null) {
    cycleDetail = { metric: "清洗周期偏离", value: null, score: 0, maxScore: 4, band: "poor", reason: "数据不足" };
  } else {
    const cdScore = calcCleaningCycleDeviationScore(cycleDev);
    cycleDetail = {
      metric: "清洗周期偏离",
      value: Math.round(cycleDev),
      score: clampScore(cdScore * 4, 4),
      maxScore: 4,
      band: scoreToBand(cdScore),
      reason: cdScore >= 0.7 ? "清洗周期正常" : cdScore >= 0.4 ? "清洗周期明显缩短" : "清洗周期严重缩短",
    };
  }

  // 4. TMP反弹速度（占3分）
  const reboundScore = calcTmpReboundScore(a);
  const reboundDetail: ScoreDetail = {
    metric: "TMP反弹速度",
    value: a.tmpReboundSpeed || "未评估",
    score: clampScore(reboundScore * 3, 3),
    maxScore: 3,
    band: scoreToBand(reboundScore),
    reason: reboundScore >= 0.7 ? "反弹慢，污染可控" : reboundScore >= 0.4 ? "反弹较快，需缩短清洗周期" : "反弹快，污染严重",
  };

  // 5. 污染综合程度（占3分）
  const foulingComp = calcFoulingComposite(a);
  let foulingDetail: ScoreDetail;
  if (foulingComp === null) {
    foulingDetail = { metric: "污染综合程度", value: null, score: 0, maxScore: 3, band: "poor", reason: "数据不足" };
  } else {
    foulingDetail = {
      metric: "污染综合程度",
      value: Math.round(foulingComp * 100) / 100,
      score: clampScore(foulingComp * 3, 3),
      maxScore: 3,
      band: scoreToBand(foulingComp),
      reason: foulingComp >= 0.7 ? "污染程度低" : foulingComp >= 0.4 ? "中度污染" : "严重污染",
    };
  }

  const total = cipDetail.score + irrevDetail.score + cycleDetail.score + reboundDetail.score + foulingDetail.score;
  return {
    score: Math.round(total * 10) / 10,
    maxScore,
    details: [cipDetail, irrevDetail, cycleDetail, reboundDetail, foulingDetail],
  };
}

/** 机械及组件状态 — 15分（12项平均） */
function scoreMechanical(a: Assessment): DimensionScore {
  const maxScore = DIMENSION_WEIGHTS.mechanical.maxScore;
  const ms = a.mechanicalStatus;
  const items = [
    { key: "fiberWear", label: "膜丝磨损", status: ms.fiberWear },
    { key: "fiberAdhesion", label: "膜丝粘连", status: ms.fiberAdhesion },
    { key: "fiberBreakage", label: "膜丝断裂", status: ms.fiberBreakage },
    { key: "fiberRoot", label: "膜根部状态", status: ms.fiberRoot },
    { key: "pottingLayer", label: "浇注层状态", status: ms.pottingLayer },
    { key: "oring", label: "O形圈状态", status: ms.oring },
    { key: "siliconeGasket", label: "硅胶垫片状态", status: ms.siliconeGasket },
    { key: "connectorPipe", label: "接头及集水管", status: ms.connectorPipe },
    { key: "frameBolts", label: "膜架及螺栓", status: ms.frameBolts },
    { key: "aerationBox", label: "曝气盒状态", status: ms.aerationBox },
    { key: "aerationUniformity", label: "曝气均匀性", status: ms.aerationUniformity },
    { key: "pipeLeakage", label: "管路泄漏", status: ms.pipeLeakage },
  ];

  const perItemMax = maxScore / items.length; // 1.25
  const details: ScoreDetail[] = items.map((item) => {
    const raw = mechanicalStatusToScore(item.status);
    return {
      metric: item.label,
      value: item.status === "normal" ? "正常" : item.status === "warning" ? "异常" : "损坏",
      score: clampScore(raw * perItemMax, perItemMax),
      maxScore: perItemMax,
      band: scoreToBand(raw),
      reason: item.status === "normal" ? "正常" : item.status === "warning" ? "存在异常，建议检修" : "严重损坏，需立即维修",
    };
  });

  const total = details.reduce((sum, d) => sum + d.score, 0);
  return { score: Math.round(total * 10) / 10, maxScore, details };
}

/** 运行风险暴露 — 10分 */
function scoreRisk(a: Assessment): DimensionScore {
  const maxScore = DIMENSION_WEIGHTS.risk.maxScore;

  // 1. 通量超限（占3分）
  const fluxOverScore = calcFluxOverLimitScore(a.actualFlux);
  const fluxOverDetail: ScoreDetail = {
    metric: "运行通量",
    value: a.actualFlux,
    score: clampScore(fluxOverScore * 3, 3),
    maxScore: 3,
    band: scoreToBand(fluxOverScore),
    reason: fluxOverScore >= 0.7 ? "通量在推荐范围内" : fluxOverScore >= 0.4 ? "通量偏高" : "通量严重超限",
  };

  // 2. 反洗压力（占2分）
  const bwScore = calcBackwashPressureScore(a.backwashPressurePeak);
  let bwDetail: ScoreDetail;
  if (bwScore === null) {
    bwDetail = { metric: "反洗压力峰值", value: null, score: 0, maxScore: 2, band: "poor", reason: "数据不足" };
  } else {
    bwDetail = {
      metric: "反洗压力峰值",
      value: a.backwashPressurePeak,
      score: clampScore(bwScore * 2, 2),
      maxScore: 2,
      band: scoreToBand(bwScore),
      reason: bwScore >= 0.7 ? "反洗压力正常" : "反洗压力偏高",
    };
  }

  // 3. MLSS（占2分）
  const mlssScore = calcMlssScore(a.mlss);
  let mlssDetail: ScoreDetail;
  if (mlssScore === null) {
    mlssDetail = { metric: "MLSS", value: null, score: 0, maxScore: 2, band: "poor", reason: "数据不足" };
  } else {
    mlssDetail = {
      metric: "MLSS",
      value: a.mlss,
      score: clampScore(mlssScore * 2, 2),
      maxScore: 2,
      band: scoreToBand(mlssScore),
      reason: mlssScore >= 0.7 ? "MLSS在推荐范围" : "MLSS偏离推荐范围",
    };
  }

  // 4. 风险事件（占3分）
  const riskCount = calcRiskEventCount(a);
  const riskRawScore = calcRiskEventsScore(riskCount);
  const riskDetail: ScoreDetail = {
    metric: "风险事件",
    value: riskCount,
    score: clampScore(riskRawScore * 3, 3),
    maxScore: 3,
    band: scoreToBand(riskRawScore),
    reason: riskCount === 0 ? "无风险事件" : riskCount <= 1 ? "存在1项风险事件" : `存在${riskCount}项风险事件`,
  };

  const total = fluxOverDetail.score + bwDetail.score + mlssDetail.score + riskDetail.score;
  return {
    score: Math.round(total * 10) / 10,
    maxScore,
    details: [fluxOverDetail, bwDetail, mlssDetail, riskDetail],
  };
}

/** 维护与数据可靠性 — 5分 */
function scoreMaintenance(a: Assessment): DimensionScore {
  const maxScore = DIMENSION_WEIGHTS.maintenance.maxScore;

  // 1. 数据完整度（占3分）
  const completeness = calcDataCompleteness(a);
  let completeScore: number;
  let completeReason: string;
  if (completeness >= 95) { completeScore = 1.0; completeReason = "数据完整"; }
  else if (completeness >= 85) { completeScore = 0.8; completeReason = "数据基本完整"; }
  else if (completeness >= 70) { completeScore = 0.5; completeReason = "存在较多缺失数据"; }
  else { completeScore = 0.1; completeReason = "数据严重不完整"; }

  const completeDetail: ScoreDetail = {
    metric: "数据完整度",
    value: Math.round(completeness * 10) / 10,
    score: clampScore(completeScore * 3, 3),
    maxScore: 3,
    band: scoreToBand(completeScore),
    reason: completeReason,
  };

  // 2. 最近评估时效（占2分）
  const assessmentDate = new Date(a.date);
  const now = new Date();
  const daysSinceAssessment = (now.getTime() - assessmentDate.getTime()) / (24 * 3600 * 1000);
  let freshnessScore: number;
  let freshnessReason: string;
  if (daysSinceAssessment <= 7) { freshnessScore = 1.0; freshnessReason = "评估及时（7天内）"; }
  else if (daysSinceAssessment <= 30) { freshnessScore = 0.7; freshnessReason = "评估在一个月内"; }
  else if (daysSinceAssessment <= 90) { freshnessScore = 0.4; freshnessReason = "评估已超过1个月"; }
  else { freshnessScore = 0.1; freshnessReason = "评估严重滞后"; }

  const freshnessDetail: ScoreDetail = {
    metric: "评估时效",
    value: Math.round(daysSinceAssessment),
    score: clampScore(freshnessScore * 2, 2),
    maxScore: 2,
    band: scoreToBand(freshnessScore),
    reason: freshnessReason,
  };

  return {
    score: Math.round((completeDetail.score + freshnessDetail.score) * 10) / 10,
    maxScore,
    details: [completeDetail, freshnessDetail],
  };
}

// ================================================================
// 主入口：综合评分
// ================================================================
export function calculateScore(assessment: Assessment): ScoringResult {
  // 计算六维度
  const hydraulic = scoreHydraulic(assessment);
  const integrity = scoreIntegrity(assessment);
  const fouling = scoreFouling(assessment);
  const mechanical = scoreMechanical(assessment);
  const risk = scoreRisk(assessment);
  const maintenance = scoreMaintenance(assessment);

  let totalScore = Math.round(
    (hydraulic.score + integrity.score + fouling.score + mechanical.score + risk.score + maintenance.score) * 10
  ) / 10;

  // 红线判断
  const redlines = getTriggeredRedlines(assessment);
  const redlineCount = redlines.length;

  let grade = scoreToGrade(totalScore);
  let overallStatus = gradeToStatus(grade);

  // 红线覆盖逻辑：触发任一红线，状态强制 critical，等级最高 D
  if (redlineCount > 0) {
    overallStatus = "critical";
    if (grade === "A" || grade === "B" || grade === "C") {
      grade = "D";
    }
  }

  return {
    totalScore,
    grade,
    overallStatus,
    dimensions: { hydraulic, integrity, fouling, mechanical, risk, maintenance },
    redlineCount,
  };
}

export { DIMENSION_WEIGHTS, TOTAL_MAX_SCORE, scoreToGrade, gradeToStatus };
