import { useState, useMemo, useCallback } from "react";
import { ArrowLeft, ArrowRight, Save, AlertTriangle, Check } from "lucide-react";
import type { Assessment, ScoringResult, RedlineResult, ValidationError } from "@/types";
import { useApp } from "../../store/useStore";
import { createEmptyAssessment, validateAssessment, firstError } from "../../utils/assessment";
import { calculateScore } from "../../engine/scoring";
import { getTriggeredRedlines } from "../../constants/redline-rules";
import StepBasicInfo from "./StepBasicInfo";
import StepHydraulic from "./StepHydraulic";
import StepIntegrity from "./StepIntegrity";
import StepFouling from "./StepFouling";
import StepMechanical from "./StepMechanical";
import StepRisk from "./StepRisk";

const STEPS = [
  { id: 1, label: "基础信息" },
  { id: 2, label: "水力性能" },
  { id: 3, label: "膜完整性及出水" },
  { id: 4, label: "污染与清洗恢复" },
  { id: 5, label: "机械及组件状态" },
  { id: 6, label: "运行环境与风险" },
];

interface AssessmentPageProps {
  editId?: string;
}

export default function AssessmentPage({ editId }: AssessmentPageProps) {
  const { saveAssessment, getAssessment } = useApp();
  const existing = editId ? getAssessment(editId) : undefined;

  const [form, setForm] = useState<Assessment>(() => existing ?? createEmptyAssessment());
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [saved, setSaved] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  // 实时评分
  const scoreResult = useMemo<ScoringResult | null>(() => {
    try {
      if (!form.membraneId && !form.projectName) return null;
      return calculateScore(form);
    } catch {
      return null;
    }
  }, [form]);

  // 实时红线
  const redlines = useMemo<RedlineResult[]>(() => {
    try {
      return getTriggeredRedlines(form);
    } catch {
      return [];
    }
  }, [form]);

  const triggeredRedlines = redlines.filter((r) => r.triggered);

  // 派生指标自动计算
  const derivedFlux = useMemo(() => {
    if (form.membraneArea > 0 && form.currentWaterProduction > 0) {
      return form.currentWaterProduction / form.membraneArea;
    }
    return null;
  }, [form.currentWaterProduction, form.membraneArea]);

  const updateField = useCallback(
    <K extends keyof Assessment>(key: K, value: Assessment[K]) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value };
        if (key === "runningHours" || key === "currentWaterProduction") {
          next.totalWaterProduction = next.runningHours * next.currentWaterProduction;
        }
        return next;
      });
      setSaved(false);
    },
    []
  );

  const updateMechanical = useCallback(
    (key: string, value: string) => {
      setForm((prev) => ({
        ...prev,
        mechanicalStatus: { ...prev.mechanicalStatus, [key]: value },
      }));
      setSaved(false);
    },
    []
  );

  const handleNext = () => {
    const errs = validateStep(step, form);
    setErrors(errs);
    if (errs.length > 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (step < 6) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
    setShowErrors(false);
  };

  const handleSave = () => {
    // 全量校验
    const allErrs = validateAssessment(form);
    if (allErrs.length > 0) {
      setErrors(allErrs);
      setShowErrors(true);
      // 跳转到第一个错误所在的步骤
      const firstErrField = allErrs[0].field;
      const errStep = getFieldStep(firstErrField);
      if (errStep) setStep(errStep);
      return;
    }
    saveAssessment(form);
    setSaved(true);
    setShowErrors(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleNew = () => {
    setForm(createEmptyAssessment());
    setStep(1);
    setErrors([]);
    setSaved(false);
    setShowErrors(false);
  };

  const fieldErrors = showErrors ? errors : [];

  // 评分等级徽章颜色
  const gradeColor: Record<string, string> = {
    A: "bg-green-100 text-green-800 border-green-300",
    B: "bg-emerald-100 text-emerald-800 border-emerald-300",
    C: "bg-yellow-100 text-yellow-800 border-yellow-300",
    D: "bg-orange-100 text-orange-800 border-orange-300",
    E: "bg-red-100 text-red-800 border-red-300",
  };

  const statusColor: Record<string, string> = {
    healthy: "text-green-600",
    watch: "text-yellow-600",
    warning: "text-orange-600",
    critical: "text-red-600",
  };

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {existing ? "编辑评估" : "新建健康评估"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {existing ? `评估日期: ${form.date}` : "填写膜箱运行数据，自动生成健康评分"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleNew}
            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            新建
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              saved
                ? "bg-green-600 text-white"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? "已保存" : "保存评估"}
          </button>
        </div>
      </div>

      {/* Redline Banner */}
      {triggeredRedlines.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-red-600 mt-0.5" size={20} />
            <div>
              <h3 className="font-bold text-red-800">
                红线告警 — {triggeredRedlines.length} 条红线触发
              </h3>
              <ul className="mt-1 text-sm text-red-700 space-y-1">
                {triggeredRedlines.map((r) => (
                  <li key={r.ruleId}>
                    <strong>{r.name}</strong>：{r.recommendation}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Score Preview */}
      {scoreResult && (
        <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">综合评分</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-gray-900">
                  {scoreResult.totalScore.toFixed(1)}
                </span>
                <span className="text-sm text-gray-400">/100</span>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full border text-sm font-bold ${gradeColor[scoreResult.grade] || "bg-gray-100"}`}>
              等级 {scoreResult.grade}
            </div>
            <div className={`text-sm font-medium ${statusColor[scoreResult.overallStatus] || ""}`}>
              {scoreResult.overallStatus === "healthy" && "状态良好"}
              {scoreResult.overallStatus === "watch" && "需要关注"}
              {scoreResult.overallStatus === "warning" && "警告"}
              {scoreResult.overallStatus === "critical" && "严重告警"}
            </div>
          </div>
          {/* Dimension bars */}
          <div className="mt-3 grid grid-cols-3 lg:grid-cols-6 gap-2">
            {Object.entries(scoreResult.dimensions).map(([key, dim]) => (
              <div key={key} className="text-center">
                <div className="text-xs text-gray-500 mb-1">
                  {key === "hydraulic" && "水力"}
                  {key === "integrity" && "完整性"}
                  {key === "fouling" && "污染"}
                  {key === "mechanical" && "机械"}
                  {key === "risk" && "风险"}
                  {key === "maintenance" && "维护"}
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      dim.score / dim.maxScore >= 0.7
                        ? "bg-green-500"
                        : dim.score / dim.maxScore >= 0.4
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${(dim.score / dim.maxScore) * 100}%` }}
                  />
                </div>
                <div className="text-xs font-mono mt-0.5">{dim.score.toFixed(0)}/{dim.maxScore}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => { if (s.id <= step || step === 6) setStep(s.id); }}
              className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                s.id === step
                  ? "bg-blue-600 text-white"
                  : s.id < step
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {s.id}
            </button>
            <span
              className={`text-xs hidden sm:inline ${
                s.id === step ? "text-blue-700 font-medium" : "text-gray-400"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-gray-200 mx-1 flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* Validation Error Summary */}
      {showErrors && fieldErrors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium">请修正以下问题：</p>
          <ul className="mt-1 text-xs text-red-600 space-y-0.5">
            {fieldErrors.map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 min-h-[400px]">
        {step === 1 && (
          <StepBasicInfo form={form} onChange={updateField} errors={fieldErrors} derivedFlux={derivedFlux} />
        )}
        {step === 2 && (
          <StepHydraulic form={form} onChange={updateField} errors={fieldErrors} derivedFlux={derivedFlux} />
        )}
        {step === 3 && (
          <StepIntegrity form={form} onChange={updateField} errors={fieldErrors} />
        )}
        {step === 4 && (
          <StepFouling form={form} onChange={updateField} errors={fieldErrors} />
        )}
        {step === 5 && (
          <StepMechanical form={form} onChange={updateMechanical} errors={fieldErrors} />
        )}
        {step === 6 && (
          <StepRisk form={form} onChange={updateField} errors={fieldErrors} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={handlePrev}
          disabled={step === 1}
          className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowLeft size={16} /> 上一步
        </button>
        {step < 6 ? (
          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
          >
            下一步 <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 rounded-lg"
          >
            <Save size={16} /> 保存评估
          </button>
        )}
      </div>
    </div>
  );
}

/** 按步骤局部校验 */
function validateStep(step: number, a: Assessment): ValidationError[] {
  const errs: ValidationError[] = [];
  switch (step) {
    case 1:
      if (!a.projectName.trim()) errs.push({ field: "projectName", message: "请输入项目名称" });
      if (!a.membraneId.trim()) errs.push({ field: "membraneId", message: "请选择膜箱编号" });
      if (!a.date) errs.push({ field: "date", message: "请选择评估日期" });
      if (a.membraneArea <= 0) errs.push({ field: "membraneArea", message: "请输入膜面积（> 0）" });
      break;
    case 2:
      if (a.currentWaterProduction <= 0) errs.push({ field: "currentWaterProduction", message: "请输入当前产水量" });
      if (a.currentTMP === 0) errs.push({ field: "currentTMP", message: "请输入当前TMP" });
      break;
    case 5:
      // 机械状态全部 normal 也允许通过
      break;
    case 6:
      if (a.actualFlux <= 0) errs.push({ field: "actualFlux", message: "请输入实际运行通量" });
      break;
  }
  return errs;
}

/** 根据字段名推断步骤号 */
function getFieldStep(field: string): number | null {
  const map: Record<string, number> = {
    projectName: 1, poolId: 1, membraneId: 1, date: 1, membraneArea: 1, installDate: 1,
    currentWaterProduction: 2, currentTMP: 2, waterTemperature: 2,
    baselinePermeability: 2, normalizedPermeability: 2,
    turbidity: 3, airTightTestPassed: 3, fiberBreakDetected: 3,
    currentCleaningCycle: 4, historicalCleaningCycle: 4,
    actualFlux: 6,
  };
  return map[field] ?? null;
}
