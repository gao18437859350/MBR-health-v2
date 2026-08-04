import type { Assessment, ValidationError } from "@/types";

interface StepProps {
  form: Assessment;
  onChange: <K extends keyof Assessment>(key: K, value: Assessment[K]) => void;
  errors: ValidationError[];
}

function errFor(field: string, errors: ValidationError[]): string | undefined {
  return errors.find((e) => e.field === field)?.message;
}

const riskEvents: { key: keyof Assessment; label: string; red?: boolean }[] = [
  { key: "stoppedAerationProducing", label: "停止曝气时仍持续产水", red: true },
  { key: "fiberExposedToAir", label: "膜丝露出水面", red: true },
  { key: "driedOut", label: "膜发生干燥", red: true },
  { key: "frozen", label: "膜发生冰冻", red: true },
  { key: "mechanicalImpact", label: "发生机械撞击", red: true },
  { key: "oilContamination", label: "发生油类冲击" },
  { key: "toxicInflow", label: "发生毒性进水冲击" },
  { key: "chemicalAbnormality", label: "清洗药剂异常" },
];

export default function StepRisk({ form, onChange, errors }: StepProps) {
  const triggeredCount = riskEvents.filter((e) => form[e.key] === true).length;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">运行环境与风险事件</h2>

      {/* 运行参数 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">实际运行通量 (LMH) *</label>
          <input
            type="number" value={form.actualFlux || ""}
            onChange={(e) => onChange("actualFlux", e.target.value === "" ? 0 : Number(e.target.value))}
            min="0" step="0.1"
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${errFor("actualFlux", errors) ? "border-red-300 bg-red-50" : "border-gray-200"}`}
          />
          {errFor("actualFlux", errors) && <p className="text-xs text-red-500 mt-1">{errFor("actualFlux", errors)}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            TMP峰值 (kPa) <span className="text-gray-400 font-normal">— 选填</span>
          </label>
          <input type="number" value={form.tmpPeak ?? ""} onChange={(e) => onChange("tmpPeak", e.target.value === "" ? null : Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            反洗压力峰值 (MPa) <span className="text-gray-400 font-normal">— 选填</span>
          </label>
          <input type="number" value={form.backwashPressurePeak ?? ""} onChange={(e) => onChange("backwashPressurePeak", e.target.value === "" ? null : Number(e.target.value))}
            min="0" step="0.01" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            MLSS (mg/L) <span className="text-gray-400 font-normal">— 选填</span>
          </label>
          <input type="number" value={form.mlss ?? ""} onChange={(e) => onChange("mlss", e.target.value === "" ? null : Number(e.target.value))}
            min="0" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            风险事件持续时间 (h) <span className="text-gray-400 font-normal">— 选填</span>
          </label>
          <input type="number" value={form.riskDuration ?? ""} onChange={(e) => onChange("riskDuration", e.target.value === "" ? null : Number(e.target.value))}
            min="0" step="0.5" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>

        {/* 曝气状态 */}
        <div className="flex items-center gap-3">
          <input type="checkbox" id="aerationNormal" checked={form.aerationNormal}
            onChange={(e) => onChange("aerationNormal", e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
          <label htmlFor="aerationNormal" className="text-sm text-gray-700">曝气正常</label>
        </div>
      </div>

      {/* 风险事件 */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-600 mb-2">
          风险事件
          {triggeredCount > 0 && (
            <span className="text-red-500 ml-2">（{triggeredCount} 项）</span>
          )}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {riskEvents.map(({ key, label, red }) => (
            <div key={key} className={`flex items-center gap-3 p-2.5 rounded-lg border ${form[key] === true ? (red ? "border-red-300 bg-red-50" : "border-yellow-300 bg-yellow-50") : "border-gray-100"}`}>
              <input type="checkbox" id={key} checked={form[key] === true}
                onChange={(e) => onChange(key, e.target.checked as never)}
                className={`w-4 h-4 rounded ${red ? "text-red-500" : "text-blue-600"}`} />
              <label htmlFor={key} className={`text-sm ${form[key] === true && red ? "text-red-700 font-medium" : "text-gray-700"}`}>
                {label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* 风险说明 */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">风险事件说明</label>
        <textarea value={form.riskDescription} onChange={(e) => onChange("riskDescription", e.target.value)}
          rows={3} placeholder="描述风险事件的具体情况…"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
      </div>
    </div>
  );
}
