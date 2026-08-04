import type { Assessment, Diagnosis } from "../types/index.js";

export interface DiagnosisRuleDef {
  id: string;
  name: string;
  evaluate: (a: Assessment) => { matched: boolean; confidence: "high" | "medium" | "low" };
  supportingEvidence: string[];
  differentialDiagnosis: string[];
  checkOrder: string[];
  recommendedChecks: string[];
  recommendedActions: string[];
  disclaimer: string;
}

// 免责声明模板
const DISCLAIMER = "本诊断为基于已有数据的概率推断，置信度受数据完整性和准确性影响。不可替代人工检查和实验室检测。实际操作前请结合现场条件和专业经验综合判断。";

export const DIAGNOSIS_RULES: DiagnosisRuleDef[] = [
  {
    id: "D1", name: "可逆滤饼污染",
    evaluate: (a) => {
      const cake = a.cakeLayer;
      if (!cake || cake === "none") return { matched: false, confidence: "low" };
      const conf = cake === "severe" ? "high" : cake === "moderate" ? "medium" : "low";
      return { matched: true, confidence: conf };
    },
    supportingEvidence: ["目视发现膜表面有明显滤饼层", "进水SS或浊度偏高"],
    differentialDiagnosis: ["无机结垢", "有机污染", "生物黏泥"],
    checkOrder: ["目视检查膜表面", "检查进水SS浓度", "评估预处理效果"],
    recommendedChecks: ["目视检查膜表面滤饼层厚度", "检查进水SS浓度是否超标", "检查预处理效果"],
    recommendedActions: ["增加曝气强度进行物理擦洗", "缩短在线清洗周期", "优化预处理工艺降低进水SS"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D2", name: "膜孔深层堵塞",
    evaluate: (a) => {
      const postCip = a.postCipPermeability;
      if (postCip === null || a.baselinePermeability === 0) return { matched: false, confidence: "low" };
      const recovery = postCip / a.baselinePermeability;
      if (recovery < 0.4) return { matched: true, confidence: "high" };
      if (recovery < 0.6) return { matched: true, confidence: "medium" };
      return { matched: false, confidence: "low" };
    },
    supportingEvidence: ["在线清洗恢复率<60%", "TMP持续上升且清洗效果递减"],
    differentialDiagnosis: ["不可逆污染", "膜材料老化", "无机结垢深部堵塞"],
    checkOrder: ["评估离线清洗效果", "进行SEM/EDS分析膜断面", "化学清洗药剂浸泡试验"],
    recommendedChecks: ["离线清洗效果评估", "SEM/EDS分析膜断面", "化学清洗药剂浸泡试验"],
    recommendedActions: ["安排离线强化化学清洗", "使用专用清洗药剂浸泡", "评估是否需更换膜组件"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D3", name: "有机污染",
    evaluate: (a) => {
      const org = a.organicFouling;
      if (!org || org === "none") return { matched: false, confidence: "low" };
      const conf = org === "severe" ? "high" : org === "moderate" ? "medium" : "low";
      return { matched: true, confidence: conf };
    },
    supportingEvidence: ["膜表面有深色有机沉积", "进水COD/BOD偏高"],
    differentialDiagnosis: ["油脂污染", "生物黏泥"],
    checkOrder: ["检测进水COD/BOD浓度", "有机物组分分析", "膜表面接触角测试"],
    recommendedChecks: ["进水COD/BOD浓度检测", "有机物组分分析", "膜表面接触角测试"],
    recommendedActions: ["采用碱性清洗剂（NaClO+NaOH）清洗", "优化生化段处理效果", "控制进水有机负荷"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D4", name: "油脂污染",
    evaluate: (a) => ({ matched: a.oilContamination, confidence: "high" }),
    supportingEvidence: ["油类冲击事件已确认"],
    differentialDiagnosis: ["有机污染"],
    checkOrder: ["检测进水油含量", "检查预处理除油设施"],
    recommendedChecks: ["进水油含量检测", "预处理除油设施运行状态"],
    recommendedActions: ["使用表面活性剂清洗", "加强预处理除油措施", "排查油类来源"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D5", name: "无机结垢",
    evaluate: (a) => {
      const scale = a.inorganicScaling;
      if (!scale || scale === "none") return { matched: false, confidence: "low" };
      const conf = scale === "severe" ? "high" : scale === "moderate" ? "medium" : "low";
      return { matched: true, confidence: conf };
    },
    supportingEvidence: ["膜表面有白色/灰白色结晶", "进水硬度或碱度偏高"],
    differentialDiagnosis: ["有机污染", "生物黏泥"],
    checkOrder: ["检测进水硬度/碱度", "EDS元素分析膜表面", "分析清洗排出液成分"],
    recommendedChecks: ["进水硬度/碱度检测", "膜表面EDS元素分析", "清洗排出液成分分析"],
    recommendedActions: ["采用酸性清洗剂（柠檬酸/盐酸）清洗", "评估是否需要软化预处理"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D6", name: "生物黏泥",
    evaluate: (a) => {
      const bio = a.biofouling;
      if (!bio || bio === "none") return { matched: false, confidence: "low" };
      const conf = bio === "severe" ? "high" : bio === "moderate" ? "medium" : "low";
      return { matched: true, confidence: conf };
    },
    supportingEvidence: ["膜表面有黄褐色黏滑物质", "进水营养盐比例失衡"],
    differentialDiagnosis: ["有机污染", "无机结垢"],
    checkOrder: ["膜表面微生物检测", "进水营养盐比例分析", "曝气均匀性评估"],
    recommendedChecks: ["膜表面微生物检测", "进水营养盐比例分析", "曝气均匀性评估"],
    recommendedActions: ["增加NaClO清洗频率和浓度", "优化生化段营养盐比例", "改善曝气擦洗效果"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D7", name: "毛发纤维缠绕",
    evaluate: (a) => {
      const ent = a.fiberEntanglement;
      if (!ent || ent === "none") return { matched: false, confidence: "low" };
      const conf = ent === "severe" || ent === "moderate" ? "high" : "medium";
      return { matched: true, confidence: conf };
    },
    supportingEvidence: ["目视发现膜丝间有明显纤维/毛发缠绕"],
    differentialDiagnosis: ["滤饼污染"],
    checkOrder: ["检查预处理格栅/细格栅状态", "膜组件表面目视检查"],
    recommendedChecks: ["预处理格栅/细格栅运行状态", "膜组件表面目视检查"],
    recommendedActions: ["人工清理膜丝间缠绕物", "检查并修复预处理格栅", "考虑增设细格栅"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D8", name: "曝气不足",
    evaluate: (a) => ({ matched: !a.aerationNormal, confidence: "high" }),
    supportingEvidence: ["曝气系统异常"],
    differentialDiagnosis: ["曝气分布不均", "曝气管堵塞"],
    checkOrder: ["检查曝气风机出口压力/流量", "检查曝气管路阀门状态", "检测膜池溶解氧"],
    recommendedChecks: ["曝气风机出口压力/流量", "曝气管路阀门状态", "膜池溶解氧浓度"],
    recommendedActions: ["检查曝气风机运行参数", "清理曝气管路", "调整曝气量至设计值"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D9", name: "曝气分布不均",
    evaluate: (a) => {
      const uni = a.mechanicalStatus.aerationUniformity;
      if (uni === "damaged") return { matched: true, confidence: "high" };
      if (uni === "warning") return { matched: true, confidence: "medium" };
      return { matched: false, confidence: "low" };
    },
    supportingEvidence: ["目视观察气泡分布明显不均匀", "部分区域无曝气或曝气过弱"],
    differentialDiagnosis: ["曝气不足", "曝气管堵塞或破裂"],
    checkOrder: ["目视观察膜池曝气气泡分布", "逐根检查曝气管出气量"],
    recommendedChecks: ["膜池曝气气泡分布目视检查", "逐根曝气管出气量检查"],
    recommendedActions: ["清理或更换堵塞/破裂的曝气管", "调整曝气支管阀门平衡", "检查曝气主管是否变形"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D10", name: "MLSS过高",
    evaluate: (a) => {
      if (a.mlss === null) return { matched: false, confidence: "low" };
      if (a.mlss > 10000) return { matched: true, confidence: "high" };
      if (a.mlss > 8000) return { matched: true, confidence: "medium" };
      return { matched: false, confidence: "low" };
    },
    supportingEvidence: [`MLSS: ${""} mg/L（超过推荐上限）`],
    differentialDiagnosis: ["排泥不足", "进水负荷过高"],
    checkOrder: ["检查排泥量和频率", "检查进水BOD/COD负荷", "检查污泥沉降性能"],
    recommendedChecks: ["排泥量和排泥频率记录", "进水BOD/COD负荷变化", "污泥沉降性能"],
    recommendedActions: ["增加剩余污泥排放量", "调整污泥回流比", "控制进水负荷"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D11", name: "污泥回流或排泥异常",
    evaluate: (a) => {
      const highMLSS = a.mlss !== null && a.mlss > 8000;
      const fluxLow = a.actualFlux < 10;
      return { matched: highMLSS || fluxLow, confidence: highMLSS && fluxLow ? "high" : "medium" };
    },
    supportingEvidence: ["MLSS偏高或通量偏低"],
    differentialDiagnosis: ["MLSS过高", "进水波动", "膜污染加剧"],
    checkOrder: ["检查污泥回流泵运行状态", "检查剩余污泥排放量", "检测SV30"],
    recommendedChecks: ["污泥回流泵运行状态", "剩余污泥排放量", "活性污泥沉降比SV30"],
    recommendedActions: ["检查污泥回流系统", "调整排泥策略", "监测污泥浓度变化趋势"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D12", name: "通量设置过高",
    evaluate: (a) => {
      if (a.actualFlux > 25) return { matched: true, confidence: "high" };
      if (a.actualFlux > 20) return { matched: true, confidence: "low" };
      return { matched: false, confidence: "low" };
    },
    supportingEvidence: [`实际运行通量: ${""} LMH（超过推荐范围 10-25 LMH）`],
    differentialDiagnosis: ["产水量需求增大", "膜面积不足"],
    checkOrder: ["对比实际通量与设计通量", "分析产水需求"],
    recommendedChecks: ["实际运行通量与设计通量对比", "产水需求分析"],
    recommendedActions: ["降低产水泵频率", "评估是否需要增加膜组件数量"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D13", name: "TMP过高",
    evaluate: (a) => {
      const tmp = Math.abs(a.currentTMP);
      if (tmp >= 40) return { matched: true, confidence: "high" };
      if (tmp >= 30) return { matched: true, confidence: "medium" };
      return { matched: false, confidence: "low" };
    },
    supportingEvidence: [`TMP: ${""} kPa（超过推荐工作范围）`],
    differentialDiagnosis: ["膜污染加剧", "产水量过高", "清洗不充分"],
    checkOrder: ["分析TMP历史趋势", "与上次清洗后TMP对比", "检查进水条件变化"],
    recommendedChecks: ["TMP历史趋势分析", "与上次清洗后的TMP对比", "进水条件变化"],
    recommendedActions: ["安排化学清洗", "降低运行通量", "检查进水水质变化"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D14", name: "反洗压力过高",
    evaluate: (a) => {
      if (a.backwashPressurePeak === null) return { matched: false, confidence: "low" };
      if (a.backwashPressurePeak > 0.15) return { matched: true, confidence: "high" };
      if (a.backwashPressurePeak > 0.12) return { matched: true, confidence: "medium" };
      return { matched: false, confidence: "low" };
    },
    supportingEvidence: [`反洗压力峰值: ${""} MPa（超过 0.15 MPa 红线）`],
    differentialDiagnosis: ["膜孔堵塞", "反洗水泵参数异常"],
    checkOrder: ["检查反洗水泵出口压力设定", "检查反洗管路阀门状态"],
    recommendedChecks: ["反洗水泵出口压力设定", "反洗管路阀门状态"],
    recommendedActions: ["降低反洗压力至安全范围", "检查膜污染程度", "调整反洗频率和时长"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D15", name: "中空纤维断丝",
    evaluate: (a) => ({ matched: a.fiberBreakDetected, confidence: a.fiberBreakDetected ? "high" : "low" }),
    supportingEvidence: ["断丝检测阳性", "存在膜丝封堵"],
    differentialDiagnosis: ["膜丝磨损", "膜丝针孔"],
    checkOrder: ["气密试验逐廊定位", "浊度在线监测波动", "目视查找断丝位置"],
    recommendedChecks: ["气密试验逐廊定位", "浊度在线监测波动", "目视查找断丝位置"],
    recommendedActions: ["定位并封堵断丝", "根据膜丝封堵程度评估是否需更换组件", "排查导致断丝的机械因素"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D16", name: "膜丝针孔或磨损",
    evaluate: (a) => ({ matched: a.pinholeDetected, confidence: a.pinholeDetected ? "high" : "low" }),
    supportingEvidence: ["针孔检测阳性"],
    differentialDiagnosis: ["膜丝断丝", "膜材料老化"],
    checkOrder: ["0.02 MPa气密试验", "产水浊度在线监测", "膜丝显微镜检查"],
    recommendedChecks: ["0.02 MPa气密试验", "产水浊度在线监测", "膜丝显微镜检查"],
    recommendedActions: ["封堵针孔区域膜丝", "评估磨损原因", "优化曝气擦洗强度"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D17", name: "膜丝根部脱粘",
    evaluate: (a) => ({ matched: a.rootLeakDetected, confidence: a.rootLeakDetected ? "high" : "low" }),
    supportingEvidence: ["膜根部泄漏检测阳性"],
    differentialDiagnosis: ["浇注层老化", "机械应力损伤"],
    checkOrder: ["浇注层剖面检查", "膜丝根部拉拔强度测试"],
    recommendedChecks: ["浇注层剖面检查", "膜丝根部拉拔强度测试"],
    recommendedActions: ["返厂重新浇注或更换膜组件", "评估运行中是否发生水锤或压力冲击"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D18", name: "O形圈或密封失效",
    evaluate: (a) => {
      const o = a.mechanicalStatus.oring;
      if (o === "damaged") return { matched: true, confidence: "high" };
      if (o === "warning") return { matched: true, confidence: "medium" };
      return { matched: false, confidence: "low" };
    },
    supportingEvidence: ["O形圈状态异常或损坏"],
    differentialDiagnosis: ["硅胶垫片失效", "接头松动"],
    checkOrder: ["密封面检查", "O形圈老化裂纹检查", "确认安装到位"],
    recommendedChecks: ["密封面检查", "O形圈老化裂纹检查"],
    recommendedActions: ["更换老化O形圈", "清洁密封面并重新安装", "使用食品级硅脂润滑"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D19", name: "集水管或接头泄漏",
    evaluate: (a) => {
      const cp = a.mechanicalStatus.connectorPipe;
      const pl = a.mechanicalStatus.pipeLeakage;
      if (cp === "damaged" || pl === "damaged") return { matched: true, confidence: "high" };
      if (cp === "warning" || pl === "warning") return { matched: true, confidence: "medium" };
      return { matched: false, confidence: "low" };
    },
    supportingEvidence: ["接头或集水管状态异常"],
    differentialDiagnosis: ["O形圈失效", "密封连接短路"],
    checkOrder: ["管路压力试验", "连接处目视检查", "听音检漏"],
    recommendedChecks: ["管路压力试验", "连接处目视检查", "听音检漏"],
    recommendedActions: ["紧固或更换泄漏接头", "更换破损集水管段", "重新进行气密试验"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D20", name: "膜架或紧固件松动",
    evaluate: (a) => {
      const fb = a.mechanicalStatus.frameBolts;
      if (fb === "damaged") return { matched: true, confidence: "high" };
      if (fb === "warning") return { matched: true, confidence: "medium" };
      return { matched: false, confidence: "low" };
    },
    supportingEvidence: ["膜架或螺栓状态异常"],
    differentialDiagnosis: ["膜架腐蚀", "曝气振动导致松动"],
    checkOrder: ["螺栓紧固力矩检查", "膜架腐蚀情况检查", "曝气振动幅度评估"],
    recommendedChecks: ["螺栓紧固力矩检查", "膜架腐蚀情况检查", "曝气振动幅度评估"],
    recommendedActions: ["紧固松动螺栓至设计扭矩", "更换锈蚀紧固件", "增加减振措施"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D21", name: "曝气管堵塞或破裂",
    evaluate: (a) => {
      const ab = a.mechanicalStatus.aerationBox;
      if (ab === "damaged") return { matched: true, confidence: "high" };
      if (ab === "warning") return { matched: true, confidence: "medium" };
      return { matched: false, confidence: "low" };
    },
    supportingEvidence: ["曝气盒状态异常"],
    differentialDiagnosis: ["曝气风机故障", "曝气分布不均"],
    checkOrder: ["逐根曝气管检查出气量", "曝气主管压力检测"],
    recommendedChecks: ["逐根曝气管检查出气量", "曝气主管压力检测"],
    recommendedActions: ["清洗或更换堵塞的曝气管", "更换破裂曝气管", "定期维护曝气系统"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D22", name: "化学清洗不足",
    evaluate: (a) => {
      if (a.lastCleaningDate === null) return { matched: true, confidence: "high" };
      if (a.currentCleaningCycle === null || a.historicalCleaningCycle === 0) return { matched: false, confidence: "low" };
      const dev = (a.currentCleaningCycle - a.historicalCleaningCycle) / a.historicalCleaningCycle;
      if (dev > 0.5) return { matched: true, confidence: "high" };
      if (dev > 0.3) return { matched: true, confidence: "medium" };
      return { matched: false, confidence: "low" };
    },
    supportingEvidence: ["清洗周期明显超过历史正常周期"],
    differentialDiagnosis: ["污染类型变化", "进水水质变化", "清洗药剂选择不当"],
    checkOrder: ["分析TMP和比通量趋势", "对比清洗前后效果", "确认清洗药剂浓度和接触时间"],
    recommendedChecks: ["TMP和比通量趋势分析", "清洗前后效果对比"],
    recommendedActions: ["立即安排在线化学清洗", "缩短清洗周期", "优化清洗方案"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D23", name: "化学清洗过度",
    evaluate: (a) => {
      if (a.currentCleaningCycle === null || a.historicalCleaningCycle === 0) return { matched: false, confidence: "low" };
      const dev = (a.historicalCleaningCycle - a.currentCleaningCycle) / a.historicalCleaningCycle;
      if (dev > 0.5) return { matched: true, confidence: "high" };
      if (dev > 0.3) return { matched: true, confidence: "medium" };
      return { matched: false, confidence: "low" };
    },
    supportingEvidence: ["清洗周期明显短于历史正常周期"],
    differentialDiagnosis: ["膜材料老化", "水质异常", "清洗方案不合适"],
    checkOrder: ["膜材料力学性能衰减测试", "评估清洗药剂对膜材料的影响"],
    recommendedChecks: ["膜材料力学性能衰减测试", "清洗药剂对膜材料的影响评估"],
    recommendedActions: ["延长清洗周期", "降低清洗药剂浓度", "评估是否需要更换膜组件"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D24", name: "膜材料老化",
    evaluate: (a) => {
      const installDate = new Date(a.installDate);
      const now = new Date(a.date);
      const years = (now.getTime() - installDate.getTime()) / (365.25 * 24 * 3600 * 1000);
      const irrev = a.preCipPermeability && a.baselinePermeability > 0
        ? 1 - (a.postCipPermeability ?? a.preCipPermeability) / a.baselinePermeability
        : 0;
      if (years > 7 && irrev > 0.4) return { matched: true, confidence: "high" };
      if (years > 5 && irrev > 0.3) return { matched: true, confidence: "medium" };
      if (years > 8) return { matched: true, confidence: "medium" };
      return { matched: false, confidence: "low" };
    },
    supportingEvidence: ["运行年限较长", "不可逆污染指数偏高"],
    differentialDiagnosis: ["不可逆污染", "化学清洗损伤"],
    checkOrder: ["膜丝拉伸强度和断裂伸长率测试", "膜表面亲水性测试", "运行年限评估"],
    recommendedChecks: ["膜丝拉伸强度和断裂伸长率测试", "膜表面亲水性测试", "运行年限评估"],
    recommendedActions: ["制定膜组件更换计划", "降低运行通量延长剩余寿命", "采购备件"],
    disclaimer: DISCLAIMER,
  },
  {
    id: "D25", name: "仪表故障或测量误差",
    evaluate: (a) => {
      if (a.actualFlux <= 0 || Math.abs(a.currentTMP) <= 0 || Math.abs(a.currentTMP) > 80 ||
          a.waterTemperature < 0 || a.waterTemperature > 60 || a.turbidity < 0) {
        return { matched: true, confidence: "high" };
      }
      return { matched: false, confidence: "low" };
    },
    supportingEvidence: ["测量值超出物理合理范围"],
    differentialDiagnosis: ["实际工艺异常"],
    checkOrder: ["仪表零点校准", "仪表量程检查", "传感器清洁和更换"],
    recommendedChecks: ["仪表零点校准", "仪表量程检查", "传感器清洁和更换"],
    recommendedActions: ["校准或更换故障仪表", "使用便携式仪表交叉验证", "建立仪表定期校准制度"],
    disclaimer: DISCLAIMER,
  },

  // ================================================================
  // D26-D31: 组合判断规则
  // ================================================================
  {
    id: "D26", name: "可逆污染（组合判断）",
    evaluate: (a) => {
      const tmpHigh = Math.abs(a.currentTMP) > 30;
      const turbOk = a.turbidity <= 0.3;
      const hasCip = a.postCipPermeability !== null && a.baselinePermeability > 0;
      const recoveryGood = hasCip && (a.postCipPermeability! / a.baselinePermeability) >= 0.8;
      if (tmpHigh && turbOk && recoveryGood) return { matched: true, confidence: "high" };
      if (tmpHigh && turbOk) return { matched: true, confidence: "medium" };
      return { matched: false, confidence: "low" };
    },
    supportingEvidence: ["TMP升高但浊度正常→膜完整性完好", "化学清洗后比通量恢复≥80%→附着物可逆"],
    differentialDiagnosis: ["无机结垢（需酸洗验证）", "有机污染（需碱洗验证）"],
    checkOrder: ["1.确认浊度读数（仪表校准+人工取样）", "2.确认清洗记录（日期/药剂/浓度/接触时间）", "3.安排在线化学清洗并记录前后变化", "4.若CIP恢复率<80%需进一步排查"],
    recommendedChecks: ["在线清洗前后TMP/通量对比", "进水水质趋势分析", "膜表面目视检查"],
    recommendedActions: ["执行标准在线化学清洗", "清洗后持续监测TMP变化", "若频繁需要清洗则缩短清洗周期"],
    disclaimer: "清洗恢复率受药剂浓度、温度、接触时间等多因素影响。请结合现场实际情况综合判断。",
  },
  {
    id: "D27", name: "不可逆堵塞或膜材料老化（组合判断）",
    evaluate: (a) => {
      const tmpHigh = Math.abs(a.currentTMP) > 30;
      const hasOffline = a.postOfflineCleanPermeability !== null && a.baselinePermeability > 0;
      const offlineRecoveryBad = hasOffline && (a.postOfflineCleanPermeability! / a.baselinePermeability) < 0.6;
      const hasCip = a.postCipPermeability !== null && a.baselinePermeability > 0;
      const cipRecoveryBad = hasCip && (a.postCipPermeability! / a.baselinePermeability) < 0.6;
      if (tmpHigh && offlineRecoveryBad) return { matched: true, confidence: "high" };
      if (tmpHigh && cipRecoveryBad) return { matched: true, confidence: "medium" };
      return { matched: false, confidence: "low" };
    },
    supportingEvidence: ["离线清洗后比通量恢复<60%→膜孔内不可逆堵塞或材料老化", "TMP持续升高且清洗效果递减"],
    differentialDiagnosis: ["膜孔深层化学堵塞", "膜材料热致或化学致老化", "无机结垢深度嵌入"],
    checkOrder: ["1.确认离线清洗方案是否匹配污染类型", "2.分析清洗排出液成分", "3.膜丝力学性能测试", "4.评估运行年限vs厂家预期寿命", "5.SEM/EDS断面分析"],
    recommendedChecks: ["离线清洗效果评估", "膜丝力学性能测试", "膜表面SEM/EDS分析", "运行年限评估"],
    recommendedActions: ["更换清洗方案（酸洗/碱洗交替尝试）", "降低运行通量延长剩余寿命", "制定膜组件更换计划并采购备件"],
    disclaimer: "离线清洗恢复率受清洗方案专业性影响较大。建议由专业团队执行离线清洗后再次评估，再决定是否更换。",
  },
  {
    id: "D28", name: "膜完整性缺陷（组合判断）",
    evaluate: (a) => {
      const turbHigh = a.turbidity > 0.3;
      const tmpNormal = Math.abs(a.currentTMP) <= 30;
      if (turbHigh && tmpNormal) return { matched: true, confidence: "high" };
      if (turbHigh) return { matched: true, confidence: "medium" };
      return { matched: false, confidence: "low" };
    },
    supportingEvidence: ["浊度升高而TMP正常→水流绕过膜孔（短路）而非膜孔堵塞", "断丝/根部脱粘/O形圈失效/密封面泄漏任一项均可导致"],
    differentialDiagnosis: ["仪表故障（浊度计零点漂移）", "取样污染", "进水浊度异常（需核对预处理段）"],
    checkOrder: ["1.排除仪表故障→浊度计校准+人工取样对比", "2.0.02MPa气密试验→逐廊逐组定位泄漏点", "3.目视检查→断丝/根部脱粘/密封面", "4.检查O形圈和硅胶垫片→老化裂纹/安装", "5.检查集水管接头→松动/腐蚀/裂纹", "6.确认后封堵或更换失效部件"],
    recommendedChecks: ["气密试验（0.02 MPa）", "膜组件逐廊完整性测试", "目视检查膜丝和密封件"],
    recommendedActions: ["定位并封堵破损膜丝", "更换老化O形圈和密封件", "维修后重新气密试验确认"],
    disclaimer: "浊度升高也可能源于取样或预处理问题。必须先排除仪表和操作因素。膜完整性缺陷需通过气密试验确认，不可仅凭数据直接封堵。",
  },
  {
    id: "D29", name: "曝气不均衡问题（组合判断）",
    evaluate: (a) => {
      const tmpHigh = Math.abs(a.currentTMP) > 30;
      const aerationBad = a.mechanicalStatus.aerationUniformity !== "normal";
      if (tmpHigh && aerationBad) return { matched: true, confidence: "high" };
      if (a.mechanicalStatus.aerationUniformity === "damaged") return { matched: true, confidence: "medium" };
      return { matched: false, confidence: "low" };
    },
    supportingEvidence: ["TMP升高+曝气均匀性异常→膜面冲刷不均匀导致局部污染加剧"],
    differentialDiagnosis: ["膜箱间进水分布不均", "局部膜组件污染严重"],
    checkOrder: ["1.目视观察膜池曝气气泡分布", "2.逐根检查曝气管出气量", "3.检查曝气主管和支管压力", "4.检查曝气头/曝气盒是否堵塞/脱落/破裂", "5.检查曝气风机运行参数", "6.维修或更换故障组件"],
    recommendedChecks: ["膜池曝气气泡分布目视检查", "曝气管逐根出气量检查", "曝气主管压力检测", "曝气风机参数检查"],
    recommendedActions: ["清理或更换堵塞/破裂的曝气管", "调整曝气支管阀门平衡气量", "修复或更换损坏的曝气盒"],
    disclaimer: "曝气均匀性评估受观察角度和水位影响。建议稳定运行下多人多点观察。曝气管出气量差异在±15%以内属于正常。",
  },
  {
    id: "D30", name: "无机结垢（酸洗验证）",
    evaluate: (a) => {
      const hasPostCip = a.postCipPermeability !== null && a.baselinePermeability > 0;
      const cipRecovery = hasPostCip ? (a.postCipPermeability! / a.baselinePermeability) : 0;
      const scalePresent = a.inorganicScaling === "moderate" || a.inorganicScaling === "severe";
      if (scalePresent && cipRecovery >= 0.7) return { matched: true, confidence: "high" };
      if (scalePresent) return { matched: true, confidence: "medium" };
      if (cipRecovery >= 0.6 && a.preCipPermeability !== null && a.baselinePermeability > 0) {
        const improv = (a.postCipPermeability! - a.preCipPermeability!) / a.baselinePermeability;
        if (improv > 0.15) return { matched: true, confidence: "medium" };
      }
      return { matched: false, confidence: "low" };
    },
    supportingEvidence: ["化学清洗后比通量恢复明显→污染物以无机盐为主", "目视发现白色/灰白色结晶沉积"],
    differentialDiagnosis: ["有机污染（需碱洗验证）", "混合污染"],
    checkOrder: ["1.检测进水硬度/碱度/pH", "2.清洗排出液成分分析（Ca²⁺/Mg²⁺/Fe³⁺）", "3.膜表面EDS元素分析", "4.确认后评估是否需要软化预处理", "5.优化酸洗方案（浓度/时间/温度）"],
    recommendedChecks: ["进水硬度/碱度检测", "清洗排出液成分分析", "膜表面EDS元素分析"],
    recommendedActions: ["酸性清洗剂清洗（柠檬酸2%或盐酸0.5%）", "评估进水软化预处理必要性", "定期维护性酸洗"],
    disclaimer: "酸洗恢复率受药剂种类、浓度、温度和接触时间影响。建议先烧杯试验确定最佳方案。过度酸洗可能损伤膜材料。",
  },
  {
    id: "D31", name: "有机/生物污染（碱洗验证）",
    evaluate: (a) => {
      const hasPostCip = a.postCipPermeability !== null && a.baselinePermeability > 0;
      const cipRecovery = hasPostCip ? (a.postCipPermeability! / a.baselinePermeability) : 0;
      const organicPresent = a.organicFouling === "moderate" || a.organicFouling === "severe";
      const bioPresent = a.biofouling === "moderate" || a.biofouling === "severe";
      if ((organicPresent || bioPresent) && cipRecovery >= 0.7) return { matched: true, confidence: "high" };
      if (organicPresent || bioPresent) return { matched: true, confidence: "medium" };
      if (cipRecovery >= 0.6 && a.preCipPermeability !== null && a.baselinePermeability > 0) {
        const improv = (a.postCipPermeability! - a.preCipPermeability!) / a.baselinePermeability;
        if (improv > 0.15) return { matched: true, confidence: "medium" };
      }
      return { matched: false, confidence: "low" };
    },
    supportingEvidence: ["NaClO/NaOH清洗后比通量恢复明显→污染物以有机物/微生物为主", "目视发现黄褐色黏滑物质或深色有机沉积", "进水COD/BOD偏高可佐证"],
    differentialDiagnosis: ["无机结垢（需酸洗验证）", "油脂污染（需表面活性剂清洗）"],
    checkOrder: ["1.检测进水COD/BOD/TOC", "2.膜表面ATP或微生物培养检测", "3.检查生化段处理效果（MLSS/DO/SV30）", "4.检查进水营养盐比例（C:N:P）", "5.优化NaClO清洗方案（200-500 mg/L/2-4h）"],
    recommendedChecks: ["进水COD/BOD检测", "膜表面微生物ATP检测", "生化段运行参数检查", "营养盐比例分析"],
    recommendedActions: ["NaClO（200-500 mg/L）+ NaOH清洗", "优化生化段运行参数", "控制进水有机负荷", "增加维护性清洗频率"],
    disclaimer: "NaClO浓度过高或浸泡过长会加速膜材料老化。游离氯浓度≤500 mg/L，年累计接触时间≤200小时。有机和生物污染常共存，单一方案可能无法完全恢复。",
  },
];

/** 执行全部诊断 */
export function runDiagnosis(assessment: Assessment): Diagnosis[] {
  return DIAGNOSIS_RULES
    .filter((rule) => {
      const { matched } = rule.evaluate(assessment);
      return matched;
    })
    .map((rule) => {
      const { confidence } = rule.evaluate(assessment);
      return {
        id: rule.id,
        name: rule.name,
        confidence,
        supportingData: buildSupportingData(assessment, rule.id),
        supportingEvidence: rule.supportingEvidence,
        differentialDiagnosis: rule.differentialDiagnosis,
        checkOrder: rule.checkOrder,
        recommendedChecks: rule.recommendedChecks,
        recommendedActions: rule.recommendedActions,
        disclaimer: rule.disclaimer,
      };
    });
}

function buildSupportingData(a: Assessment, ruleId: string): string[] {
  switch (ruleId) {
    case "D1": return a.cakeLayer ? [`滤饼状态: ${a.cakeLayer}`] : [];
    case "D2": {
      if (a.postCipPermeability !== null && a.baselinePermeability > 0)
        return [`CIP恢复率: ${((a.postCipPermeability / a.baselinePermeability) * 100).toFixed(1)}%`];
      return [];
    }
    case "D12": return [`实际通量: ${a.actualFlux} LMH`];
    case "D13": return [`TMP: ${Math.abs(a.currentTMP)} kPa`];
    case "D14": return a.backwashPressurePeak !== null ? [`反洗峰值: ${a.backwashPressurePeak} MPa`] : [];
    case "D15": return ["断丝检测: 阳性"];
    case "D16": return ["针孔检测: 阳性"];
    case "D17": return ["根部泄漏: 是"];
    case "D22":
    case "D23": {
      if (a.currentCleaningCycle !== null && a.historicalCleaningCycle > 0) {
        const dev = ((a.currentCleaningCycle - a.historicalCleaningCycle) / a.historicalCleaningCycle * 100).toFixed(0);
        return [`清洗周期: 当前${a.currentCleaningCycle}d vs 历史${a.historicalCleaningCycle}d (偏差${dev}%)`];
      }
      return [];
    }
    case "D24": {
      if (a.baselinePermeability > 0 && a.postCipPermeability !== null)
        return [`不可逆指数: ${(1 - a.postCipPermeability / a.baselinePermeability).toFixed(2)}`];
      return [];
    }
    case "D26": {
      const d: string[] = [];
      d.push(`TMP: ${Math.abs(a.currentTMP)} kPa, 浊度: ${a.turbidity} NTU`);
      if (a.postCipPermeability && a.baselinePermeability > 0)
        d.push(`CIP恢复率: ${((a.postCipPermeability / a.baselinePermeability) * 100).toFixed(1)}%`);
      return d;
    }
    case "D27": {
      const d: string[] = [];
      d.push(`TMP: ${Math.abs(a.currentTMP)} kPa`);
      if (a.postOfflineCleanPermeability && a.baselinePermeability > 0)
        d.push(`离线恢复率: ${((a.postOfflineCleanPermeability / a.baselinePermeability) * 100).toFixed(1)}%`);
      return d;
    }
    case "D28": return [`浊度: ${a.turbidity} NTU, TMP: ${Math.abs(a.currentTMP)} kPa`];
    case "D29": return [`TMP: ${Math.abs(a.currentTMP)} kPa, 曝气均匀性: ${a.mechanicalStatus.aerationUniformity}`];
    case "D30": {
      if (a.postCipPermeability && a.baselinePermeability > 0)
        return [`CIP恢复率: ${((a.postCipPermeability / a.baselinePermeability) * 100).toFixed(1)}%`];
      return [];
    }
    case "D31": {
      if (a.postCipPermeability && a.baselinePermeability > 0)
        return [`CIP恢复率: ${((a.postCipPermeability / a.baselinePermeability) * 100).toFixed(1)}%`];
      return [];
    }
    default: return [];
  }
}
