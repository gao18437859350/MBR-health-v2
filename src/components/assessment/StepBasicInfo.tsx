import type { Assessment, ValidationError } from "@/types";

import { MEMBRANE_OPTIONS, MEMBRANE_POOLS, poolForMembrane } from "@/constants/membrane-options";

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
    hasError
      ? "border-red-300 focus:ring-red-200 bg-red-50"
      : "border-gray-200 focus:ring-blue-200 focus:border-blue-400"
  }`;
}

export default function StepBasicInfo({ form, onChange, errors, derivedFlux }: StepProps) {
  const selectedOption = MEMBRANE_OPTIONS.find((option) => option.id === form.membraneId);
  const suggestedProjectName = selectedOption
    ? `${selectedOption.poolId}${selectedOption.boxNumber}号膜箱健康监测`
    : "某期某池某号膜箱健康监测";

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">基础信息</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 评估日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">评估日期 *</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => onChange("date", e.target.value)}
            className={inputCls(!!errFor("date", errors))}
          />
          {errFor("date", errors) && <p className="text-xs text-red-500 mt-1">{errFor("date", errors)}</p>}
        </div>

        {/* 项目名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">项目名称 *</label>
          <input
            type="text"
            value={form.projectName}
            onChange={(e) => onChange("projectName", e.target.value)}
            placeholder={suggestedProjectName}
            className={inputCls(!!errFor("projectName", errors))}
          />
          {errFor("projectName", errors) && <p className="text-xs text-red-500 mt-1">{errFor("projectName", errors)}</p>}
        </div>

        {/* 膜箱编号 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">膜箱编号 *</label>
          <select
            value={form.membraneId}
            onChange={(e) => {
              const membraneId = e.target.value;
              const previousOption = MEMBRANE_OPTIONS.find((option) => option.id === form.membraneId);
              const previousSuggestion = previousOption
                ? `${previousOption.poolId}${previousOption.boxNumber}号膜箱健康监测`
                : "";
              const nextOption = MEMBRANE_OPTIONS.find((option) => option.id === membraneId);
              onChange("membraneId", membraneId);
              onChange("poolId", poolForMembrane(membraneId));
              if (!form.projectName.trim() || form.projectName === previousSuggestion) {
                onChange(
                  "projectName",
                  nextOption ? `${nextOption.poolId}${nextOption.boxNumber}号膜箱健康监测` : ""
                );
              }
            }}
            className={`${inputCls(!!errFor("membraneId", errors))} bg-white`}
          >
            <option value="">请选择膜箱编号</option>
            {MEMBRANE_POOLS.map((pool) => (
              <optgroup key={pool.id} label={pool.id}>
                {MEMBRANE_OPTIONS.filter((option) => option.poolId === pool.id).map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
          {errFor("membraneId", errors) && <p className="text-xs text-red-500 mt-1">{errFor("membraneId", errors)}</p>}
        </div>

        {/* 膜型号 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">膜型号</label>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="膜型号">
            {(["PVDF", "GE"] as const).map((model) => {
              const selected = form.membraneModel === model;
              return (
                <button
                  key={model}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange("membraneModel", model)}
                  className={`h-10 border rounded-lg text-sm font-medium transition-colors ${
                    selected
                      ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600"
                      : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                  }`}
                >
                  {model}
                </button>
              );
            })}
          </div>
        </div>

        {/* 投运日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">投运日期</label>
          <input
            type="date"
            value={form.installDate}
            onChange={(e) => onChange("installDate", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* 膜面积 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">膜面积 (m²) *</label>
          <input
            type="number"
            value={form.membraneArea || ""}
            onChange={(e) => onChange("membraneArea", e.target.value === "" ? 0 : Number(e.target.value))}
            placeholder="1000"
            min="0"
            className={inputCls(!!errFor("membraneArea", errors))}
          />
          {errFor("membraneArea", errors) && <p className="text-xs text-red-500 mt-1">{errFor("membraneArea", errors)}</p>}
        </div>

        {/* 运行时间 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">累计运行时间 (天)</label>
          <input
            type="number"
            value={form.runningHours || ""}
            onChange={(e) => onChange("runningHours", e.target.value === "" ? 0 : Number(e.target.value))}
            min="0"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* 日产水量 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">日产水量 (m³/d)</label>
          <input
            type="number"
            value={form.currentWaterProduction || ""}
            onChange={(e) => onChange("currentWaterProduction", e.target.value === "" ? 0 : Number(e.target.value))}
            min="0"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <p className="text-xs text-gray-400 mt-1">
            自动累计产水量：{form.totalWaterProduction.toLocaleString("zh-CN", { maximumFractionDigits: 2 })} m³
          </p>
        </div>

        {/* 总膜丝数 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">膜丝总数量</label>
          <input
            type="number"
            value={form.totalFiberCount || ""}
            onChange={(e) => onChange("totalFiberCount", e.target.value === "" ? 0 : Number(e.target.value))}
            min="0"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {/* 自动计算提示 */}
      {derivedFlux !== null && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          自动计算膜通量：<strong>{derivedFlux.toFixed(2)} L/(m²·h)</strong>（产水量 ÷ 膜面积）
        </div>
      )}
    </div>
  );
}
