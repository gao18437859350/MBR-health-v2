import type { Assessment, ValidationError } from "@/types";

interface StepProps {
  form: Assessment;
  onChange: <K extends keyof Assessment>(key: K, value: Assessment[K]) => void;
  errors: ValidationError[];
  derivedFlux: number | null;
}

function errFor(field: string, errors: ValidationError[]): string | undefined {
  return errors.find((e) => e.field === field)?.message;
}

function inputCls(hasError: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
    hasError ? "border-red-300 focus:ring-red-200 bg-red-50" : "border-gray-200 focus:ring-blue-200"
  }`;
}

export default function StepHydraulic({ form, onChange, errors, derivedFlux }: StepProps) {
  const fluxDisplay = form.currentFlux ?? derivedFlux;
  const permeability = fluxDisplay !== null && form.currentTMP !== 0
    ? (fluxDisplay / Math.abs(form.currentTMP)).toFixed(3)
    : null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">水力性能</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 日产水量 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">日产水量 (m³/d) *</label>
          <input
            type="number"
            value={form.currentWaterProduction || ""}
            onChange={(e) => onChange("currentWaterProduction", e.target.value === "" ? 0 : Number(e.target.value))}
            min="0"
            className={inputCls(!!errFor("currentWaterProduction", errors))}
          />
          {errFor("currentWaterProduction", errors) && (
            <p className="text-xs text-red-500 mt-1">{errFor("currentWaterProduction", errors)}</p>
          )}
        </div>

        {/* 当前膜通量（可手动覆盖） */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            当前膜通量 (LMH)
            <span className="text-gray-400 font-normal ml-1">— 留空则自动计算</span>
          </label>
          <input
            type="number"
            value={form.currentFlux ?? ""}
            onChange={(e) =>
              onChange("currentFlux", e.target.value === "" ? null : Number(e.target.value))
            }
            placeholder={derivedFlux ? `自动: ${derivedFlux.toFixed(2)}` : ""}
            min="0"
            step="0.1"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* 当前TMP */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">当前TMP (kPa) *</label>
          <input
            type="number"
            value={form.currentTMP || ""}
            onChange={(e) => onChange("currentTMP", e.target.value === "" ? 0 : Number(e.target.value))}
            placeholder="-15（负压）或 15"
            className={inputCls(!!errFor("currentTMP", errors))}
          />
          {errFor("currentTMP", errors) && (
            <p className="text-xs text-red-500 mt-1">{errFor("currentTMP", errors)}</p>
          )}
        </div>

        {/* 水温 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">水温 (°C)</label>
          <input
            type="number"
            value={form.waterTemperature || ""}
            onChange={(e) => onChange("waterTemperature", e.target.value === "" ? 0 : Number(e.target.value))}
            placeholder="25"
            className={inputCls(!!errFor("waterTemperature", errors))}
          />
          {errFor("waterTemperature", errors) && (
            <p className="text-xs text-red-500 mt-1">{errFor("waterTemperature", errors)}</p>
          )}
        </div>

        {/* 标准化比通量 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            标准化比通量 (L/(m²·h·kPa))
            <span className="text-gray-400 font-normal ml-1">— 用户直接录入</span>
          </label>
          <input
            type="number"
            value={form.normalizedPermeability ?? ""}
            onChange={(e) => onChange("normalizedPermeability", e.target.value === "" ? null : Number(e.target.value))}
            placeholder="1.33"
            min="0"
            step="0.01"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* 健康期基准比通量 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">健康期基准比通量 (L/(m²·h·kPa))</label>
          <input
            type="number"
            value={form.baselinePermeability || ""}
            onChange={(e) => onChange("baselinePermeability", e.target.value === "" ? 0 : Number(e.target.value))}
            placeholder="1.33"
            min="0"
            step="0.01"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* TMP日增长率 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            TMP日增长率 (kPa/d)
            <span className="text-gray-400 font-normal ml-1">— 选填</span>
          </label>
          <input
            type="number"
            value={form.tmpDailyIncrease ?? ""}
            onChange={(e) => onChange("tmpDailyIncrease", e.target.value === "" ? null : Number(e.target.value))}
            placeholder="0.15"
            step="0.01"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* 膜箱间流量偏差 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            膜箱间流量偏差 (%)
            <span className="text-gray-400 font-normal ml-1">— 选填</span>
          </label>
          <input
            type="number"
            value={form.flowDeviation ?? ""}
            onChange={(e) => onChange("flowDeviation", e.target.value === "" ? null : Number(e.target.value))}
            placeholder="5"
            min="0"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {/* 派生指标展示 */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
        <h3 className="font-medium text-gray-700 mb-2">自动计算指标</h3>
        <div className="grid grid-cols-2 gap-2 text-gray-600">
          <div>
            膜通量 J：{fluxDisplay !== null ? <strong>{fluxDisplay.toFixed(2)} LMH</strong> : <span className="text-gray-400">数据不足</span>}
          </div>
          <div>
            比通量 K：{permeability !== null ? <strong>{permeability} L/(m²·h·kPa)</strong> : <span className="text-gray-400">数据不足</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
