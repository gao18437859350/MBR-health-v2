import type { RedlineResult, Assessment } from "../types/index.js";

export interface RedlineRuleDef {
  id: string;
  name: string;
  evaluate: (a: Assessment) => { triggered: boolean; value: number | string | null };
  threshold: number | string;
  recommendation: string;
}

export const REDLINE_RULES: RedlineRuleDef[] = [
  {
    id: "R1",
    name: "TMP绝对值超限",
    evaluate: (a) => ({ triggered: Math.abs(a.currentTMP) >= 50, value: Math.abs(a.currentTMP) }),
    threshold: "≥ 50 kPa",
    recommendation: "立即停机，检查膜污染状态和堵塞原因，安排化学清洗或离线清洗。",
  },
  {
    id: "R2",
    name: "反洗压力超限",
    evaluate: (a) => {
      if (a.backwashPressurePeak === null) return { triggered: false, value: null };
      return { triggered: a.backwashPressurePeak > 0.15, value: a.backwashPressurePeak };
    },
    threshold: "> 0.15 MPa",
    recommendation: "立即降低反洗压力至0.15 MPa以下，检查膜完整性，排查是否有膜丝破损导致低压短路。",
  },
  {
    id: "R3",
    name: "气密试验不合格",
    evaluate: (a) => {
      if (a.airTightTestPassed === null) return { triggered: false, value: null };
      return { triggered: !a.airTightTestPassed, value: a.airTightTestPassed ? "合格" : "不合格" };
    },
    threshold: "0.02 MPa 无泄漏",
    recommendation: "立即定位泄漏点，逐廊/逐组进行气密试验，封堵或更换泄漏膜丝/组件。",
  },
  {
    id: "R4",
    name: "持续性断丝",
    evaluate: (a) => ({
      triggered: a.fiberBreakDetected && a.fiberBlockageLevel !== "none",
      value: ({ none: "未发现", mild: "轻微", moderate: "中度", severe: "严重" })[a.fiberBlockageLevel],
    }),
    threshold: "断丝检测阳性且存在膜丝封堵",
    recommendation: "停止运行，进行完整性测试，系统性排查并封堵所有断丝点。若封堵情况严重，评估是否需要更换膜组件。",
  },
  {
    id: "R5",
    name: "膜根部泄漏",
    evaluate: (a) => ({ triggered: a.rootLeakDetected, value: a.rootLeakDetected ? "是" : "否" }),
    threshold: "检测阳性",
    recommendation: "检查浇注层完整性，评估脱粘范围。若大面积脱粘，需返厂维修或更换膜组件。",
  },
  {
    id: "R6",
    name: "集水连接短路",
    evaluate: (a) => ({ triggered: a.sealShortCircuit, value: a.sealShortCircuit ? "是" : "否" }),
    threshold: "检测阳性",
    recommendation: "检查所有密封件、O形圈和接头，更换失效密封件，重新进行气密试验确认。",
  },
  {
    id: "R7",
    name: "产水出现污泥颗粒",
    evaluate: (a) => ({ triggered: a.sludgeParticles, value: a.sludgeParticles ? "是" : "否" }),
    threshold: "目视确认",
    recommendation: "立即停机，进行完整性测试（气密试验+浊度监测），定位破损膜丝并封堵。",
  },
  {
    id: "R8",
    name: "膜发生干燥",
    evaluate: (a) => ({ triggered: a.driedOut, value: a.driedOut ? "是" : "否" }),
    threshold: "是/否",
    recommendation: "检查膜丝是否已发生不可逆的孔径变化，进行完整性测试和通量测试，评估是否需要更换。",
  },
  {
    id: "R9",
    name: "膜发生冻结",
    evaluate: (a) => ({ triggered: a.frozen, value: a.frozen ? "是" : "否" }),
    threshold: "是/否",
    recommendation: "全面检查膜丝和膜壳是否因冻胀破裂，进行完整性测试，大概率需更换受损膜组件。",
  },
  {
    id: "R10",
    name: "严重机械撞击",
    evaluate: (a) => ({ triggered: a.mechanicalImpact, value: a.mechanicalImpact ? "是" : "否" }),
    threshold: "是/否",
    recommendation: "检查膜架结构完整性、膜丝是否有挤压损伤、集水管是否有裂纹，进行完整性测试。",
  },
  {
    id: "R11",
    name: "停曝产水",
    evaluate: (a) => ({
      triggered: a.stoppedAerationProducing,
      value: a.stoppedAerationProducing ? "是" : "否",
    }),
    threshold: "是/否",
    recommendation: "立即停止产水泵，恢复曝气系统运行。检查曝气风机/管路状态，确认正常运行后方可恢复产水。",
  },
  {
    id: "R12",
    name: "水温超限",
    evaluate: (a) => ({
      triggered: a.waterTemperature < 5 || a.waterTemperature > 40,
      value: a.waterTemperature,
    }),
    threshold: "5–40 °C",
    recommendation: "若水温<5°C，调整工艺或停机防冻；若水温>40°C，检查前段工艺，评估膜材料耐温上限，必要时停机。",
  },
  {
    id: "R13",
    name: "膜架或集水管严重破裂",
    evaluate: (a) => {
      const ms = a.mechanicalStatus;
      const frameBroken = ms.frameBolts === "damaged";
      const pipeBroken = ms.connectorPipe === "damaged" || ms.pipeLeakage === "damaged";
      return { triggered: frameBroken || pipeBroken, value: frameBroken ? "膜架" : pipeBroken ? "集水管" : "否" };
    },
    threshold: "机械状态=damaged",
    recommendation: "停机维修或更换破损的膜架/集水管部件，维修后重新进行气密试验和水力测试。",
  },
];

/** 执行全部红线判断 */
export function evaluateRedlines(assessment: Assessment): RedlineResult[] {
  return REDLINE_RULES.map((rule) => {
    const { triggered, value } = rule.evaluate(assessment);
    return {
      ruleId: rule.id,
      name: rule.name,
      triggered,
      value,
      threshold: rule.threshold,
      recommendation: rule.recommendation,
    };
  });
}

/** 获取触发的红线列表 */
export function getTriggeredRedlines(assessment: Assessment): RedlineResult[] {
  return evaluateRedlines(assessment).filter((r) => r.triggered);
}
