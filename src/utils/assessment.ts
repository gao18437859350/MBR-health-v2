import type { Assessment, MechanicalStatus, ValidationError } from "@/types";
import { generateId } from "./uuid";

/** 空机械状态 */
export function emptyMechanicalStatus(): MechanicalStatus {
  return {
    fiberWear: "normal", fiberAdhesion: "normal", fiberBreakage: "normal",
    fiberRoot: "normal", pottingLayer: "normal", oring: "normal",
    siliconeGasket: "normal", connectorPipe: "normal", frameBolts: "normal",
    aerationBox: "normal", aerationUniformity: "normal", pipeLeakage: "normal",
  };
}

/** 创建空白评估 */
export function createEmptyAssessment(): Assessment {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: generateId(),
    date: today,
    projectName: "",
    poolId: "",
    membraneId: "",
    membraneModel: "",
    installDate: "",
    membraneArea: 0,
    runningHours: 0,
    totalWaterProduction: 0,
    currentWaterProduction: 0,
    currentFlux: null,
    currentTMP: 0,
    waterTemperature: 25,
    normalizedPermeability: null,
    baselinePermeability: 0,
    tmpDailyIncrease: null,
    flowDeviation: null,
    turbidity: 0,
    ss: null,
    sludgeParticles: false,
    airTightTestPassed: null,
    fiberBreakDetected: false,
    pinholeDetected: false,
    rootLeakDetected: false,
    sealShortCircuit: false,
    fiberBlockageLevel: "none",
    blockedFiberCount: 0,
    totalFiberCount: 0,
    preCipPermeability: null,
    postCipPermeability: null,
    preOfflineCleanPermeability: null,
    postOfflineCleanPermeability: null,
    lastCleaningDate: null,
    currentCleaningCycle: null,
    historicalCleaningCycle: 0,
    tmpReboundSpeed: null,
    cakeLayer: null,
    organicFouling: null,
    inorganicScaling: null,
    biofouling: null,
    fiberEntanglement: null,
    mechanicalStatus: emptyMechanicalStatus(),
    actualFlux: 0,
    tmpPeak: null,
    backwashPressurePeak: null,
    mlss: null,
    aerationNormal: true,
    stoppedAerationProducing: false,
    fiberExposedToAir: false,
    driedOut: false,
    frozen: false,
    mechanicalImpact: false,
    oilContamination: false,
    toxicInflow: false,
    chemicalAbnormality: false,
    riskDuration: null,
    riskDescription: "",
  };
}

// ---- 校验 ----


export function validateAssessment(a: Assessment): ValidationError[] {
  const errors: ValidationError[] = [];

  // 基础信息必填
  if (!a.projectName.trim()) errors.push({ field: "projectName", message: "请输入项目名称" });
  if (!a.membraneId.trim()) errors.push({ field: "membraneId", message: "请选择膜箱编号" });
  if (!a.date) errors.push({ field: "date", message: "请选择评估日期" });

  // 水力性能校验
  if (a.currentWaterProduction <= 0 && a.currentFlux === null)
    errors.push({ field: "currentWaterProduction", message: "请输入产水量或膜通量" });
  if (a.currentTMP === 0) errors.push({ field: "currentTMP", message: "请输入当前TMP" });
  if (a.waterTemperature < 0 || a.waterTemperature > 60)
    errors.push({ field: "waterTemperature", message: "水温应在 0-60°C 之间" });
  if (a.membraneArea <= 0)
    errors.push({ field: "membraneArea", message: "请输入膜面积" });
  if (a.actualFlux <= 0 && a.currentFlux === null)
    errors.push({ field: "actualFlux", message: "请输入实际运行通量" });

  // 数值合理性
  if (a.turbidity < 0) errors.push({ field: "turbidity", message: "浊度不能为负值" });
  return errors;
}

/** 获取第一条错误信息 */
export function firstError(errors: ValidationError[]): string | null {
  return errors.length > 0 ? errors[0].message : null;
}
