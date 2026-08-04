import type { Assessment, MechanicalStatus, MembraneUnit } from "../../types/index.js";

/** 创建默认正常状态的机械状态 */
export function defaultMechanicalStatus(): MechanicalStatus {
  return {
    fiberWear: "normal",
    fiberAdhesion: "normal",
    fiberBreakage: "normal",
    fiberRoot: "normal",
    pottingLayer: "normal",
    oring: "normal",
    siliconeGasket: "normal",
    connectorPipe: "normal",
    frameBolts: "normal",
    aerationBox: "normal",
    aerationUniformity: "normal",
    pipeLeakage: "normal",
  };
}

/** 创建健康的评估记录 */
export function createHealthyAssessment(overrides: Partial<Assessment> = {}): Assessment {
  return {
    id: "test-healthy-1",
    date: "2026-07-31",
    projectName: "测试水厂",
    poolId: "MBR-1",
    membraneId: "mem-1",
    membraneModel: "PVDF-40",
    installDate: "2025-01-01",
    membraneArea: 1000,
    runningHours: 13000,
    totalWaterProduction: 500000,
    currentWaterProduction: 20000,
    currentFlux: 20,
    currentTMP: 15,
    waterTemperature: 25,
    normalizedPermeability: 1.33,
    baselinePermeability: 1.33,
    tmpDailyIncrease: 0.1,
    flowDeviation: 5,
    turbidity: 0.05,
    ss: 0.5,
    sludgeParticles: false,
    airTightTestPassed: true,
    fiberBreakDetected: false,
    pinholeDetected: false,
    rootLeakDetected: false,
    sealShortCircuit: false,
    fiberBlockageLevel: "none",
    blockedFiberCount: 0,
    totalFiberCount: 10000,
    preCipPermeability: 1.3,
    postCipPermeability: 1.32,
    preOfflineCleanPermeability: null,
    postOfflineCleanPermeability: null,
    lastCleaningDate: "2026-07-15",
    currentCleaningCycle: 30,
    historicalCleaningCycle: 30,
    tmpReboundSpeed: "slow",
    cakeLayer: "none",
    organicFouling: "none",
    inorganicScaling: "none",
    biofouling: "none",
    fiberEntanglement: "none",
    mechanicalStatus: defaultMechanicalStatus(),
    actualFlux: 20,
    tmpPeak: 20,
    backwashPressurePeak: 0.08,
    mlss: 5000,
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
    ...overrides,
  };
}

/** 创建膜组件 */
export function createMembrane(overrides: Partial<MembraneUnit> = {}): MembraneUnit {
  return {
    id: "mem-1",
    name: "MBR-1-A-01",
    poolId: "MBR-1",
    model: "PVDF-40",
    installDate: "2025-01-01",
    membraneArea: 1000,
    totalFiberCount: 10000,
    status: "active",
    ...overrides,
  };
}

