import type { Assessment, ValidationError } from "@/types";

interface StepProps {
  form: Assessment;
  onChange: <K extends keyof Assessment>(key: K, value: Assessment[K]) => void;
  errors: ValidationError[];
}

function selectCls() {
  return "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white";
}

const foulingOptions = [
  { value: "", label: "未评估" },
  { value: "none", label: "无" },
  { value: "mild", label: "轻微" },
  { value: "moderate", label: "中等" },
  { value: "severe", label: "严重" },
];

const reboundOptions = [
  { value: "", label: "未评估" },
  { value: "slow", label: "慢" },
  { value: "moderate", label: "中等" },
  { value: "fast", label: "快" },
];

export default function StepFouling({ form, onChange, errors }: StepProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">污染与清洗恢复</h2>

      {/* 清洗前后比通量 */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-600 mb-2">在线清洗 (CIP)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">在线清洗前比通量 (L/(m²·h·kPa))</label>
            <input type="number" value={form.preCipPermeability ?? ""} onChange={(e) => onChange("preCipPermeability", e.target.value === "" ? null : Number(e.target.value))} min="0" step="0.01" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">在线清洗后比通量 (L/(m²·h·kPa))</label>
            <input type="number" value={form.postCipPermeability ?? ""} onChange={(e) => onChange("postCipPermeability", e.target.value === "" ? null : Number(e.target.value))} min="0" step="0.01" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-600 mb-2">离线清洗</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">离线清洗前比通量</label>
            <input type="number" value={form.preOfflineCleanPermeability ?? ""} onChange={(e) => onChange("preOfflineCleanPermeability", e.target.value === "" ? null : Number(e.target.value))} min="0" step="0.01" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">离线清洗后比通量</label>
            <input type="number" value={form.postOfflineCleanPermeability ?? ""} onChange={(e) => onChange("postOfflineCleanPermeability", e.target.value === "" ? null : Number(e.target.value))} min="0" step="0.01" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
        </div>
      </div>

      {/* 清洗周期 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">上次清洗日期</label>
          <input type="date" value={form.lastCleaningDate ?? ""} onChange={(e) => onChange("lastCleaningDate", e.target.value || null)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            当前清洗周期 (天)
            <span className="text-gray-400 font-normal ml-1">— 选填</span>
          </label>
          <input type="number" value={form.currentCleaningCycle ?? ""} onChange={(e) => onChange("currentCleaningCycle", e.target.value === "" ? null : Number(e.target.value))} min="0" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">历史正常清洗周期 (天)</label>
          <input type="number" value={form.historicalCleaningCycle || ""} onChange={(e) => onChange("historicalCleaningCycle", e.target.value === "" ? 0 : Number(e.target.value))} min="0" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
        </div>
      </div>

      {/* TMP反弹 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-1">清洗后TMP反弹速度</label>
        <select value={form.tmpReboundSpeed ?? ""} onChange={(e) => onChange("tmpReboundSpeed", (e.target.value || null) as typeof form.tmpReboundSpeed)} className={selectCls()}>
          {reboundOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
      </div>

      {/* 污染类型评估 */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-600 mb-2">污染类型目视评估</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {([
            { key: "cakeLayer", label: "表面滤饼状态" },
            { key: "organicFouling", label: "有机污染情况" },
            { key: "inorganicScaling", label: "无机结垢情况" },
            { key: "biofouling", label: "生物黏泥情况" },
            { key: "fiberEntanglement", label: "毛发纤维缠绕" },
          ] as const).map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <select
                value={(form[key] as string) ?? ""}
                onChange={(e) => onChange(key, (e.target.value || null) as never)}
                className={selectCls()}
              >
                {foulingOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* 清洗恢复率展示 */}
      {form.postCipPermeability !== null && form.baselinePermeability > 0 && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
          在线清洗恢复率：<strong>{((form.postCipPermeability / form.baselinePermeability) * 100).toFixed(1)}%</strong>
          {" · "}
          不可逆污染指数：<strong>{(1 - form.postCipPermeability / form.baselinePermeability).toFixed(3)}</strong>
          {1 - form.postCipPermeability / form.baselinePermeability > 0.5 && (
            <span className="text-red-500 ml-2">⚠ 不可逆污染严重</span>
          )}
        </div>
      )}
    </div>
  );
}
