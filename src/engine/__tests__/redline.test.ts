import { describe, it, expect } from "vitest";
import { createHealthyAssessment } from "./helpers";
import { evaluateRedlines, getTriggeredRedlines } from "../../constants/redline-rules";

describe("evaluateRedlines", () => {
  it("健康膜组件全部红线不触发", () => {
    const results = evaluateRedlines(createHealthyAssessment());
    expect(results.every((r) => !r.triggered)).toBe(true);
  });

  it("R1: TMP >= 50 kPa 触发", () => {
    const results = evaluateRedlines(createHealthyAssessment({ currentTMP: 55 }));
    const r1 = results.find((r) => r.ruleId === "R1")!;
    expect(r1.triggered).toBe(true);
    expect(r1.value).toBe(55);
  });

  it("R1: TMP 恰好 50 kPa 触发", () => {
    const results = evaluateRedlines(createHealthyAssessment({ currentTMP: 50 }));
    const r1 = results.find((r) => r.ruleId === "R1")!;
    expect(r1.triggered).toBe(true);
  });

  it("R1: TMP 49 kPa 不触发", () => {
    const results = evaluateRedlines(createHealthyAssessment({ currentTMP: 49 }));
    const r1 = results.find((r) => r.ruleId === "R1")!;
    expect(r1.triggered).toBe(false);
  });

  it("R2: 反洗压力 > 0.15 MPa 触发", () => {
    const results = evaluateRedlines(createHealthyAssessment({ backwashPressurePeak: 0.16 }));
    const r2 = results.find((r) => r.ruleId === "R2")!;
    expect(r2.triggered).toBe(true);
  });

  it("R2: 反洗压力 = 0.15 不触发", () => {
    const results = evaluateRedlines(createHealthyAssessment({ backwashPressurePeak: 0.15 }));
    const r2 = results.find((r) => r.ruleId === "R2")!;
    expect(r2.triggered).toBe(false);
  });

  it("R2: 反洗压力 null 不触发", () => {
    const results = evaluateRedlines(createHealthyAssessment({ backwashPressurePeak: null }));
    const r2 = results.find((r) => r.ruleId === "R2")!;
    expect(r2.triggered).toBe(false);
  });

  it("R3: 气密试验不合格触发", () => {
    const results = evaluateRedlines(createHealthyAssessment({ airTightTestPassed: false }));
    const r3 = results.find((r) => r.ruleId === "R3")!;
    expect(r3.triggered).toBe(true);
  });

  it("R3: 气密试验合格不触发", () => {
    const results = evaluateRedlines(createHealthyAssessment({ airTightTestPassed: true }));
    const r3 = results.find((r) => r.ruleId === "R3")!;
    expect(r3.triggered).toBe(false);
  });

  it("R3: 未做气密试验不触发", () => {
    const results = evaluateRedlines(createHealthyAssessment({ airTightTestPassed: null }));
    const r3 = results.find((r) => r.ruleId === "R3")!;
    expect(r3.triggered).toBe(false);
  });

  it("R4: 断丝检测阳性且存在封堵时触发", () => {
    const results = evaluateRedlines(
      createHealthyAssessment({ fiberBreakDetected: true, fiberBlockageLevel: "mild" })
    );
    const r4 = results.find((r) => r.ruleId === "R4")!;
    expect(r4.triggered).toBe(true);
  });

  it("R4: 断丝检测阳性但未发现封堵时不触发", () => {
    const results = evaluateRedlines(
      createHealthyAssessment({ fiberBreakDetected: true, fiberBlockageLevel: "none" })
    );
    const r4 = results.find((r) => r.ruleId === "R4")!;
    expect(r4.triggered).toBe(false);
  });

  it("R5: 膜根部泄漏触发", () => {
    const results = evaluateRedlines(createHealthyAssessment({ rootLeakDetected: true }));
    const r5 = results.find((r) => r.ruleId === "R5")!;
    expect(r5.triggered).toBe(true);
  });

  it("R6: 密封短路触发", () => {
    const results = evaluateRedlines(createHealthyAssessment({ sealShortCircuit: true }));
    const r6 = results.find((r) => r.ruleId === "R6")!;
    expect(r6.triggered).toBe(true);
  });

  it("R7: 产水出现污泥颗粒触发", () => {
    const results = evaluateRedlines(createHealthyAssessment({ sludgeParticles: true }));
    const r7 = results.find((r) => r.ruleId === "R7")!;
    expect(r7.triggered).toBe(true);
  });

  it("R8: 膜干燥触发", () => {
    const results = evaluateRedlines(createHealthyAssessment({ driedOut: true }));
    const r8 = results.find((r) => r.ruleId === "R8")!;
    expect(r8.triggered).toBe(true);
  });

  it("R9: 膜冻结触发", () => {
    const results = evaluateRedlines(createHealthyAssessment({ frozen: true }));
    const r9 = results.find((r) => r.ruleId === "R9")!;
    expect(r9.triggered).toBe(true);
  });

  it("R10: 机械撞击触发", () => {
    const results = evaluateRedlines(createHealthyAssessment({ mechanicalImpact: true }));
    const r10 = results.find((r) => r.ruleId === "R10")!;
    expect(r10.triggered).toBe(true);
  });

  it("R11: 停曝产水触发", () => {
    const results = evaluateRedlines(createHealthyAssessment({ stoppedAerationProducing: true }));
    const r11 = results.find((r) => r.ruleId === "R11")!;
    expect(r11.triggered).toBe(true);
  });

  it("R12: 水温 < 5°C 触发", () => {
    const results = evaluateRedlines(createHealthyAssessment({ waterTemperature: 3 }));
    const r12 = results.find((r) => r.ruleId === "R12")!;
    expect(r12.triggered).toBe(true);
  });

  it("R12: 水温 > 40°C 触发", () => {
    const results = evaluateRedlines(createHealthyAssessment({ waterTemperature: 42 }));
    const r12 = results.find((r) => r.ruleId === "R12")!;
    expect(r12.triggered).toBe(true);
  });

  it("R12: 水温 25°C 不触发", () => {
    const results = evaluateRedlines(createHealthyAssessment({ waterTemperature: 25 }));
    const r12 = results.find((r) => r.ruleId === "R12")!;
    expect(r12.triggered).toBe(false);
  });

  it("R13: 膜架损坏触发", () => {
    const ms = createHealthyAssessment().mechanicalStatus;
    const results = evaluateRedlines(
      createHealthyAssessment({
        mechanicalStatus: { ...ms, frameBolts: "damaged" },
      })
    );
    const r13 = results.find((r) => r.ruleId === "R13")!;
    expect(r13.triggered).toBe(true);
  });

  it("R13: 集水管破裂触发", () => {
    const ms = createHealthyAssessment().mechanicalStatus;
    const results = evaluateRedlines(
      createHealthyAssessment({
        mechanicalStatus: { ...ms, connectorPipe: "damaged" },
      })
    );
    const r13 = results.find((r) => r.ruleId === "R13")!;
    expect(r13.triggered).toBe(true);
  });

  it("多红线同时触发", () => {
    const results = evaluateRedlines(
      createHealthyAssessment({
        currentTMP: 55,
        airTightTestPassed: false,
        sludgeParticles: true,
        driedOut: true,
        frozen: true,
      })
    );
    const triggered = results.filter((r) => r.triggered);
    expect(triggered.length).toBeGreaterThanOrEqual(4);
    // R1 TMP + R3 气密 + R7 污泥颗粒 + R8 干燥 + R9 冻结
    expect(triggered.map((r) => r.ruleId)).toEqual(
      expect.arrayContaining(["R1", "R3", "R7", "R8", "R9"])
    );
  });
});

describe("getTriggeredRedlines", () => {
  it("无红线时返回空数组", () => {
    const triggered = getTriggeredRedlines(createHealthyAssessment());
    expect(triggered).toHaveLength(0);
  });

  it("有红线时只返回触发的", () => {
    const triggered = getTriggeredRedlines(
      createHealthyAssessment({ currentTMP: 55, airTightTestPassed: false })
    );
    expect(triggered.length).toBe(2);
    expect(triggered.every((r) => r.triggered)).toBe(true);
  });

  it("每条红线结果包含完整信息", () => {
    const triggered = getTriggeredRedlines(
      createHealthyAssessment({ currentTMP: 55 })
    );
    expect(triggered[0]).toHaveProperty("ruleId");
    expect(triggered[0]).toHaveProperty("name");
    expect(triggered[0]).toHaveProperty("triggered");
    expect(triggered[0]).toHaveProperty("value");
    expect(triggered[0]).toHaveProperty("threshold");
    expect(triggered[0]).toHaveProperty("recommendation");
    expect(triggered[0].triggered).toBe(true);
  });
});
