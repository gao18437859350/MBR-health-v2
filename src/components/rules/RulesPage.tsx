import { useState } from "react";
import type { Rule } from "@/types";
import { DEFAULT_RULES } from "../../constants/default-rules";

const sourceLabels: Record<string, string> = {
  manual: "产品说明书",
  engineering: "工程经验",
  "site-calibrated": "现场校准",
  pending: "待确认",
};

export default function RulesPage() {
  const [rules] = useState<Rule[]>(DEFAULT_RULES);
  const [filter, setFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const categories = [...new Set(rules.map((r) => r.category))];

  const filtered = rules.filter((r) => {
    if (filter && !r.name.includes(filter) && !r.metric.includes(filter)) return false;
    if (sourceFilter && r.sourceType !== sourceFilter) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">规则与阈值设置</h1>
          <p className="text-sm text-gray-500 mt-1">集中管理评分阈值、红线判定标准</p>
        </div>
      </div>

      {/* 筛选 */}
      <div className="flex gap-3 mb-4">
        <input type="text" value={filter} onChange={(e) => setFilter(e.target.value)}
          placeholder="搜索规则名称或指标..."
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-200" />
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
          <option value="">全部来源</option>
          <option value="manual">产品说明书</option>
          <option value="engineering">工程经验</option>
          <option value="site-calibrated">现场校准</option>
          <option value="pending">待确认</option>
        </select>
        <span className="text-xs text-gray-400 self-center">{filtered.length} 条规则</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">规则名称</th>
                <th className="text-left px-4 py-3 font-medium">分类</th>
                <th className="text-left px-4 py-3 font-medium">指标</th>
                <th className="text-left px-4 py-3 font-medium">单位</th>
                <th className="text-center px-4 py-3 font-medium">预警</th>
                <th className="text-center px-4 py-3 font-medium">告警</th>
                <th className="text-center px-4 py-3 font-medium">红线</th>
                <th className="text-center px-4 py-3 font-medium">来源</th>
                <th className="text-center px-4 py-3 font-medium">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium">{rule.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{rule.category}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{rule.metric}</td>
                  <td className="px-4 py-2.5 text-gray-500">{rule.unit}</td>
                  <td className="px-4 py-2.5 text-center">{rule.warningThreshold ?? "—"}</td>
                  <td className="px-4 py-2.5 text-center">{rule.alarmThreshold ?? "—"}</td>
                  <td className="px-4 py-2.5 text-center">
                    {rule.redlineThreshold !== null ? (
                      <span className="text-red-600 font-bold">{rule.redlineThreshold}</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      rule.sourceType === "manual" ? "bg-blue-100 text-blue-700" :
                      rule.sourceType === "engineering" ? "bg-purple-100 text-purple-700" :
                      rule.sourceType === "site-calibrated" ? "bg-green-100 text-green-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {sourceLabels[rule.sourceType] || rule.sourceType}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {rule.enabled ? <span className="text-green-600 text-xs">启用</span> : <span className="text-gray-400 text-xs">禁用</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
