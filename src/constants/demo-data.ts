import type { Assessment, MechanicalStatus } from "@/types";
import { MEMBRANE_OPTIONS } from "@/constants/membrane-options";

export const DEMO_PROJECT_NAME = "北京肖家河污水处理厂";

function mechanicalStatus(): MechanicalStatus {
  return {
    fiberWear: "normal", fiberAdhesion: "normal", fiberBreakage: "normal",
    fiberRoot: "normal", pottingLayer: "normal", oring: "normal",
    siliconeGasket: "normal", connectorPipe: "normal", frameBolts: "normal",
    aerationBox: "normal", aerationUniformity: "normal", pipeLeakage: "normal",
  };
}

function baseAssessment(membraneId: string, poolId: string): Assessment {
  return {
    id: `demo-current-${membraneId}`,
    date: "2026-08-03",
    projectName: DEMO_PROJECT_NAME,
    poolId,
    membraneId,
    membraneModel: "PVDF",
    installDate: "2025-01-01",
    membraneArea: 1000,
    runningHours: 542,
    totalWaterProduction: 10840000,
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
    mechanicalStatus: mechanicalStatus(),
    actualFlux: 20,
    tmpPeak: 22,
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
  };
}

function createDemoAssessment(option: typeof MEMBRANE_OPTIONS[number]): Assessment {
  const assessment = baseAssessment(option.id, option.poolId);
  const offset = (option.poolNumber - 1) * 0.3 + (option.phase === "二期" ? 0.4 : 0);
  const setHydraulic = (tmp: number, flux: number, turbidity: number) => {
    assessment.currentTMP = Math.round((tmp + offset) * 10) / 10;
    assessment.currentFlux = flux;
    assessment.actualFlux = flux;
    assessment.currentWaterProduction = flux * assessment.membraneArea;
    assessment.turbidity = turbidity;
    assessment.normalizedPermeability = Math.round((flux / assessment.currentTMP) * 100) / 100;
  };

  switch (option.boxNumber) {
    case 2:
    case 8:
      setHydraulic(27, 18, 0.14);
      assessment.cakeLayer = "mild";
      assessment.organicFouling = "mild";
      break;
    case 3:
      setHydraulic(35, 14, 0.28);
      assessment.flowDeviation = 22;
      assessment.cakeLayer = "moderate";
      break;
    case 5:
      setHydraulic(44, 11, 0.45);
      assessment.postCipPermeability = 0.65;
      assessment.cakeLayer = "severe";
      assessment.organicFouling = "severe";
      break;
    case 6:
      setHydraulic(22, 18, 1.2);
      assessment.ss = 6;
      assessment.sludgeParticles = true;
      assessment.airTightTestPassed = false;
      assessment.fiberBreakDetected = true;
      assessment.fiberBlockageLevel = "moderate";
      assessment.blockedFiberCount = 80;
      assessment.mechanicalStatus.fiberBreakage = "damaged";
      break;
    case 9:
      setHydraulic(54, 12, 0.18);
      assessment.tmpDailyIncrease = 1.2;
      assessment.backwashPressurePeak = 0.16;
      assessment.cakeLayer = "severe";
      break;
    case 10:
      setHydraulic(40, 11, 0.2);
      assessment.installDate = "2018-01-01";
      assessment.runningHours = 2917;
      assessment.postCipPermeability = 0.55;
      assessment.organicFouling = "severe";
      assessment.mechanicalStatus.pottingLayer = "warning";
      break;
    default:
      setHydraulic(13, 21 + option.boxNumber % 2, 0.04);
  }
  assessment.tmpPeak = assessment.currentTMP + 4;
  assessment.totalWaterProduction = assessment.runningHours * assessment.currentWaterProduction;
  return assessment;
}

/** 120 membrane boxes: 2 phases x 6 pools x 10 boxes. */
export const DEMO_ASSESSMENTS: Assessment[] = MEMBRANE_OPTIONS.map(createDemoAssessment);

function seededNoise(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) / 4294967295) * 2 - 1;
}

/** Generate the 29 previous days; together with the anchor this makes 30 records. */
export function generateTrendData(anchor: Assessment): Assessment[] {
  const data: Assessment[] = [];
  const anchorFlux = anchor.currentFlux
    ?? (anchor.membraneArea > 0 ? anchor.currentWaterProduction / anchor.membraneArea : anchor.actualFlux);
  for (let index = 1; index < 30; index++) {
    const day = new Date(anchor.date);
    day.setDate(day.getDate() - index);
    const date = day.toISOString().slice(0, 10);
    const noise = seededNoise(`${anchor.membraneId}-${date}`);
    const wave = Math.sin(index * 0.55 + anchor.membraneId.length) * 0.5 + noise * 0.5;
    const tmp = Math.max(1, Math.abs(anchor.currentTMP) * (1 - index * 0.0015) + wave * 2.2);
    const flux = Math.max(0.5, anchorFlux * (1 + index * 0.001) + wave * 0.9);
    const turbidity = Math.max(0.01, anchor.turbidity * (1 - index * 0.001) + wave * 0.035);
    data.push({
      ...anchor,
      id: `demo-history-${anchor.membraneId}-${date}`,
      date,
      currentTMP: Math.round(tmp * 10) / 10,
      currentFlux: Math.round(flux * 10) / 10,
      actualFlux: Math.round(flux * 10) / 10,
      currentWaterProduction: Math.round(flux * anchor.membraneArea),
      totalWaterProduction: anchor.runningHours * Math.round(flux * anchor.membraneArea),
      turbidity: Math.round(turbidity * 100) / 100,
      normalizedPermeability: Math.round((flux / tmp) * 100) / 100,
    });
  }
  return data;
}
