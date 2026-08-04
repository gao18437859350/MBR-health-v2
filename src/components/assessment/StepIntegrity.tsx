import { useEffect, useState } from "react";
import type { Assessment, ValidationError } from "@/types";

interface StepProps {
  form: Assessment;
  onChange: <K extends keyof Assessment>(key: K, value: Assessment[K]) => void;
  errors: ValidationError[];
}

function errFor(field: string, errors: ValidationError[]): string | undefined {
  return errors.find((error) => error.field === field)?.message;
}

function inputCls(hasError: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
    hasError ? "border-red-300 focus:ring-red-200 bg-red-50" : "border-gray-200 focus:ring-blue-200"
  }`;
}

const airtightOptions = [
  { value: null, label: "未检测" },
  { value: true, label: "合格" },
  { value: false, label: "不合格" },
] as const;

const blockageOptions = [
  { value: "none", label: "未发现", selected: "border-green-500 bg-green-50 text-green-700 ring-green-500" },
  { value: "mild", label: "轻微", selected: "border-yellow-500 bg-yellow-50 text-yellow-700 ring-yellow-500" },
  { value: "moderate", label: "中度", selected: "border-orange-500 bg-orange-50 text-orange-700 ring-orange-500" },
  { value: "severe", label: "严重", selected: "border-red-500 bg-red-50 text-red-700 ring-red-500" },
] as const;

const integrityChecks = [
  { key: "fiberBreakDetected", label: "发现断丝" },
  { key: "pinholeDetected", label: "发现针孔" },
  { key: "rootLeakDetected", label: "膜根部泄漏" },
  { key: "sealShortCircuit", label: "密封连接短路" },
] as const;

export default function StepIntegrity({ form, onChange, errors }: StepProps) {
  const [turbidityInput, setTurbidityInput] = useState(String(form.turbidity));

  useEffect(() => {
    const parsed = Number(turbidityInput);
    if (turbidityInput.trim() === "" || !Number.isFinite(parsed) || parsed !== form.turbidity) {
      setTurbidityInput(String(form.turbidity));
    }
  }, [form.turbidity]);

  const handleTurbidityChange = (raw: string) => {
    if (!/^\d*(?:\.\d*)?$/.test(raw)) return;
    setTurbidityInput(raw);
    const parsed = Number(raw);
    if (raw !== "" && raw !== "." && Number.isFinite(parsed)) {
      onChange("turbidity", parsed);
    }
  };

  const normalizeTurbidityInput = () => {
    const parsed = Number(turbidityInput);
    if (turbidityInput !== "" && Number.isFinite(parsed) && parsed >= 0) {
      setTurbidityInput(String(parsed));
      onChange("turbidity", parsed);
    } else {
      setTurbidityInput(String(form.turbidity));
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800">膜完整性及出水</h2>

      <section className="mt-5 pb-6 border-b border-gray-200">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-800">出水质量</h3>
          <p className="mt-1 text-xs text-gray-400">记录检测仪表或实验室检测结果</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">产水浊度 (NTU)</label>
            <input
              type="text"
              inputMode="decimal"
              value={turbidityInput}
              onChange={(event) => handleTurbidityChange(event.target.value)}
              onBlur={normalizeTurbidityInput}
              placeholder="0.05"
              className={inputCls(!!errFor("turbidity", errors))}
            />
            {errFor("turbidity", errors) && (
              <p className="text-xs text-red-500 mt-1">{errFor("turbidity", errors)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              产水SS (mg/L)
              <span className="text-gray-400 font-normal ml-1">— 选填</span>
            </label>
            <input
              type="number"
              value={form.ss ?? ""}
              onChange={(event) => onChange("ss", event.target.value === "" ? null : Number(event.target.value))}
              min="0"
              step="0.1"
              className={inputCls(false)}
            />
          </div>
        </div>

        <label className="mt-4 min-h-11 flex items-center gap-3 border-t border-gray-100 pt-4 cursor-pointer">
          <input
            type="checkbox"
            checked={form.sludgeParticles}
            onChange={(event) => onChange("sludgeParticles", event.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm text-gray-700">产水出现明显污泥颗粒</span>
        </label>
      </section>

      <section className="py-6 border-b border-gray-200">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-800">完整性检测</h3>
          <p className="mt-1 text-xs text-gray-400">记录气密试验和目视检查结果</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">0.02 MPa 气密试验结果</label>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="气密试验结果">
            {airtightOptions.map((option) => {
              const selected = form.airTightTestPassed === option.value;
              return (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange("airTightTestPassed", option.value)}
                  className={`h-10 border rounded-lg text-sm font-medium transition-colors ${
                    selected
                      ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600"
                      : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {integrityChecks.map((item) => (
            <label key={item.key} className="min-h-12 flex items-center gap-3 border-b border-gray-100 cursor-pointer">
              <input
                type="checkbox"
                checked={form[item.key]}
                onChange={(event) => onChange(item.key, event.target.checked)}
                className="w-4 h-4 text-red-500 rounded"
              />
              <span className="text-sm text-gray-700">{item.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="pt-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-800">膜丝封堵情况</h3>
          <p className="mt-1 text-xs text-gray-400">根据现场检测结果选择封堵程度，该结果将用于完整性评分</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-label="膜丝封堵情况">
          {blockageOptions.map((option) => {
            const selected = form.fiberBlockageLevel === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange("fiberBlockageLevel", option.value)}
                className={`h-11 border rounded-lg text-sm font-medium transition-colors ${
                  selected
                    ? `${option.selected} ring-1`
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
