import type { Assessment, ValidationError } from "@/types";

interface StepProps {
  form: Assessment;
  onChange: (key: string, value: string) => void;
  errors: ValidationError[];
}

const MECH_ITEMS: { key: string; label: string }[] = [
  { key: "fiberWear", label: "膜丝磨损" },
  { key: "fiberAdhesion", label: "膜丝粘连" },
  { key: "fiberBreakage", label: "膜丝断裂" },
  { key: "fiberRoot", label: "膜根部状态" },
  { key: "pottingLayer", label: "浇注层状态" },
  { key: "oring", label: "O形圈状态" },
  { key: "siliconeGasket", label: "硅胶垫片状态" },
  { key: "connectorPipe", label: "接头及集水管" },
  { key: "frameBolts", label: "膜架及螺栓" },
  { key: "aerationBox", label: "曝气盒状态" },
  { key: "aerationUniformity", label: "曝气均匀性" },
  { key: "pipeLeakage", label: "管路泄漏" },
];

const STATUS_MAP: Record<string, { label: string; bg: string; border: string }> = {
  normal: { label: "正常", bg: "bg-green-50", border: "border-green-400" },
  warning: { label: "异常", bg: "bg-yellow-50", border: "border-yellow-400" },
  damaged: { label: "损坏", bg: "bg-red-50", border: "border-red-400" },
};

export default function StepMechanical({ form, onChange }: StepProps) {
  const damagedCount = MECH_ITEMS.filter(
    (item) => (form.mechanicalStatus as unknown as Record<string, string>)[item.key] === "damaged"
  ).length;
  const warningCount = MECH_ITEMS.filter(
    (item) => (form.mechanicalStatus as unknown as Record<string, string>)[item.key] === "warning"
  ).length;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-2">机械及组件状态</h2>
      <p className="text-sm text-gray-500 mb-4">
        逐项评估组件机械状态。{damagedCount > 0 && (
          <span className="text-red-600 font-medium">
            ⚠ {damagedCount} 项损坏，{warningCount} 项异常
          </span>
        )}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {MECH_ITEMS.map(({ key, label }) => {
          const status = ((form.mechanicalStatus as unknown as Record<string, string>)[key]) || "normal";
          const s = STATUS_MAP[status] || STATUS_MAP.normal;
          return (
            <div
              key={key}
              className={`flex items-center justify-between p-3 rounded-lg border ${s.bg} ${s.border} transition-colors`}
            >
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <div className="flex gap-1">
                {(["normal", "warning", "damaged"] as const).map((v) => {
                  const st = STATUS_MAP[v];
                  return (
                    <button
                      key={v}
                      onClick={() => onChange(key, v)}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                        status === v
                          ? `${st.border} bg-white font-bold shadow-sm`
                          : "border-transparent text-gray-400 hover:bg-white"
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
