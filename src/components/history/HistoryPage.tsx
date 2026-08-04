import { useState, useMemo } from "react";
import {
  Search, Trash2, Eye, GitCompare, Upload, Printer,
  FileJson, FileSpreadsheet, ChevronDown, ChevronUp,
} from "lucide-react";
import type { Assessment, HealthGrade } from "@/types";
import { useApp } from "../../store/useStore";
import { calculateScore } from "../../engine/scoring";
import { printReport } from "../../utils/print";
import { downloadJSON, downloadCSV, parseJSONImport, parseCSVImport } from "../../utils/import-export";
import { formatDate } from "../../utils/date";

const gradeColors: Record<HealthGrade, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-emerald-100 text-emerald-800",
  C: "bg-yellow-100 text-yellow-800",
  D: "bg-orange-100 text-orange-800",
  E: "bg-red-100 text-red-800",
};

const gradeNames: Record<HealthGrade, string> = {
  A: "健康", B: "轻度衰减", C: "亚健康", D: "严重衰减", E: "失效风险",
};

export default function HistoryPage() {
  const { assessments, deleteAssessment, importAssessments, data } = useApp();

  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<HealthGrade | "">("");
  const [poolFilter, setPoolFilter] = useState("");
  const [sortKey, setSortKey] = useState<"date" | "score">("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [importStatus, setImportStatus] = useState<{ message: string; error: boolean } | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  // 预处理：为每条记录计算评分
  const scored = useMemo(() => {
    return assessments.map((a) => {
      let score = 0;
      let grade: HealthGrade = "E";
      let redlineCount = 0;
      try {
        const r = calculateScore(a);
        score = r.totalScore;
        grade = r.grade;
        redlineCount = r.redlineCount;
      } catch { /* ignore errors with old/broken data */ }
      return { ...a, _score: score, _grade: grade, _redlines: redlineCount };
    });
  }, [assessments]);

  // 筛选
  const filtered = useMemo(() => {
    return scored
      .filter((a) => {
        if (search) {
          const q = search.toLowerCase();
          const match =
            a.projectName.toLowerCase().includes(q) ||
            a.poolId.toLowerCase().includes(q) ||
            a.membraneId.toLowerCase().includes(q);
          if (!match) return false;
        }
        if (gradeFilter && a._grade !== gradeFilter) return false;
        if (poolFilter && a.poolId !== poolFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const cmp = sortKey === "date"
          ? new Date(b.date).getTime() - new Date(a.date).getTime()
          : b._score - a._score;
        return sortAsc ? -cmp : cmp;
      });
  }, [scored, search, gradeFilter, poolFilter, sortKey, sortAsc]);

  // 去重分期列表用于筛选
  const pools = useMemo(() => [...new Set(assessments.map((a) => a.poolId))].sort(), [assessments]);

  const selected = selectedId ? assessments.find((a) => a.id === selectedId) : null;

  const handleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("确定删除此评估记录？")) {
      deleteAssessment(id);
      if (selectedId === id) setSelectedId(null);
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.csv";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const result = file.name.toLowerCase().endsWith(".csv")
          ? parseCSVImport(text)
          : parseJSONImport(text);
        if ("error" in result) {
          setImportStatus({ message: result.error, error: true });
          return;
        }
        importAssessments(result.assessments);
        setImportStatus({ message: `成功导入 ${result.assessments.length} 条记录`, error: false });
        setTimeout(() => setImportStatus(null), 3000);
      } catch {
        setImportStatus({ message: "无法读取导入文件", error: true });
      }
    };
    input.click();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">历史评估记录</h1>
          <p className="text-sm text-gray-500 mt-1">{assessments.length} 条记录</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleImport} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50" title="导入JSON/CSV">
            <Upload size={16} /> 导入
          </button>
          <button onClick={() => downloadJSON(data)} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50" title="导出JSON">
            <FileJson size={16} /> JSON
          </button>
          <button onClick={() => downloadCSV(assessments)} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50" title="导出CSV">
            <FileSpreadsheet size={16} /> CSV
          </button>
        </div>
      </div>

      {importStatus && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${importStatus.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {importStatus.message}
        </div>
      )}

      {/* 筛选栏 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索项目/膜池/膜箱..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value as HealthGrade | "")}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
          <option value="">全部等级</option>
          {(["A","B","C","D","E"] as HealthGrade[]).map((g) => <option key={g} value={g}>等级 {g} · {gradeNames[g]}</option>)}
        </select>
        <select value={poolFilter} onChange={(e) => setPoolFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
          <option value="">全部膜池</option>
          {pools.filter(Boolean).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={() => { setSortAsc(!sortAsc); setSortKey("date"); }}
          className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
          日期 {sortKey === "date" ? (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : ""}
        </button>
        <button onClick={() => { setSortAsc(!sortAsc); setSortKey("score"); }}
          className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
          评分 {sortKey === "score" ? (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : ""}
        </button>
      </div>

      {/* 对比栏 */}
      {compareIds.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm">
          <GitCompare size={16} className="text-blue-600" />
          <span>已选 {compareIds.length}/2：</span>
          {compareIds.map((id) => {
            const a = assessments.find((x) => x.id === id);
            return <span key={id} className="bg-white px-2 py-0.5 rounded border text-xs">{a?.membraneId || id.slice(0, 8)}</span>;
          })}
          {compareIds.length === 2 && (
            <button onClick={() => setShowCompare(true)} className="ml-auto bg-blue-600 text-white px-3 py-1 rounded text-xs">开始对比</button>
          )}
          <button onClick={() => setCompareIds([])} className="text-gray-400 hover:text-gray-600 ml-2 text-xs">清除</button>
        </div>
      )}

      {/* 表格 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium w-8">选</th>
                <th className="text-left px-4 py-3 font-medium">评估日期</th>
                <th className="text-left px-4 py-3 font-medium">项目/膜池</th>
                <th className="text-left px-4 py-3 font-medium">膜箱</th>
                <th className="text-right px-4 py-3 font-medium">评分</th>
                <th className="text-center px-4 py-3 font-medium">等级</th>
                <th className="text-center px-4 py-3 font-medium">红线</th>
                <th className="text-center px-4 py-3 font-medium w-28">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">暂无评估记录</td></tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className={`hover:bg-gray-50 ${selectedId === a.id ? "bg-blue-50" : ""} ${compareIds.includes(a.id) ? "bg-blue-50/50" : ""}`}>
                    <td className="px-4 py-2.5">
                      <input type="checkbox" checked={compareIds.includes(a.id)} onChange={() => handleCompare(a.id)}
                        className="w-4 h-4 rounded text-blue-600" />
                    </td>
                    <td className="px-4 py-2.5 font-medium">{formatDate(a.date)}</td>
                    <td className="px-4 py-2.5 text-gray-500">{a.projectName} · {a.poolId}</td>
                    <td className="px-4 py-2.5">{a.membraneId}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{a._score.toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${gradeColors[a._grade]}`}>{a._grade}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {a._redlines > 0 ? <span className="text-red-600 font-bold">{a._redlines}</span> : <span className="text-gray-300">0</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setSelectedId(selectedId === a.id ? null : a.id)} className="p-1.5 hover:bg-gray-100 rounded" title="详情"><Eye size={15} /></button>
                        <button onClick={() => printReport(a)} className="p-1.5 hover:bg-gray-100 rounded" title="打印"><Printer size={15} /></button>
                        <button onClick={() => handleDelete(a.id)} className="p-1.5 hover:bg-red-50 text-red-400 rounded" title="删除"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 详情弹窗 */}
      {selected && (
        <DetailModal assessment={selected} onClose={() => setSelectedId(null)} />
      )}

      {/* 对比弹窗 */}
      {showCompare && compareIds.length === 2 && assessments.some((x) => x.id === compareIds[0]) && assessments.some((x) => x.id === compareIds[1]) && (
        <CompareModal
          a={assessments.find((x) => x.id === compareIds[0])!}
          b={assessments.find((x) => x.id === compareIds[1])!}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}

// ================================================================
// 详情弹窗
// ================================================================
function DetailModal({ assessment, onClose }: { assessment: Assessment; onClose: () => void }) {
  const score = useMemo(() => { try { return calculateScore(assessment); } catch { return null; } }, [assessment]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">{assessment.projectName} · {assessment.membraneId}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm mb-4">
            <div><span className="text-gray-500">日期：</span>{assessment.date}</div>
            <div><span className="text-gray-500">膜池：</span>{assessment.poolId}</div>
            <div><span className="text-gray-500">面积：</span>{assessment.membraneArea} m²</div>
            <div><span className="text-gray-500">型号：</span>{assessment.membraneModel || "—"}</div>
          </div>
          {score && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">{score.totalScore.toFixed(1)}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColors[score.grade]}`}>{score.grade} · {gradeNames[score.grade]}</span>
                <span className="text-sm text-gray-500">红线 {score.redlineCount} 条</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {Object.entries(score.dimensions).map(([k, v]) => (
                  <div key={k} className="text-xs"><span className="text-gray-400">{k === "hydraulic" ? "水力" : k === "integrity" ? "完整性" : k === "fouling" ? "污染" : k === "mechanical" ? "机械" : k === "risk" ? "风险" : "维护"}:</span> {v.score.toFixed(1)}/{v.maxScore}</div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => printReport(assessment)} className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg"><Printer size={14} /> 打印报告</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// 对比弹窗
// ================================================================
function CompareModal({ a, b, onClose }: { a: Assessment; b: Assessment; onClose: () => void }) {
  const scoreA = useMemo(() => { try { return calculateScore(a); } catch { return null; } }, [a]);
  const scoreB = useMemo(() => { try { return calculateScore(b); } catch { return null; } }, [b]);

  const diff = (va: number | undefined | null, vb: number | undefined | null, lowerIsBetter = false) => {
    if (va == null || vb == null) return <span className="text-gray-400">—</span>;
    const d = (vb as number) - (va as number);
    const improved = lowerIsBetter ? d < 0 : d > 0;
    return <span className={d === 0 ? "text-gray-500" : improved ? "text-green-600" : "text-red-600"}>{d > 0 ? "+" : ""}{d.toFixed(1)}</span>;
  };

  const items: { label: string; lowerIsBetter?: boolean; accessor: (x: Assessment) => number | null }[] = [
    { label: "TMP (kPa)", lowerIsBetter: true, accessor: (x) => Math.abs(x.currentTMP) },
    { label: "通量 (LMH)", accessor: (x) => x.currentFlux ?? x.currentWaterProduction / (x.membraneArea || 1) },
    { label: "浊度 (NTU)", lowerIsBetter: true, accessor: (x) => x.turbidity },
    { label: "水温 (°C)", accessor: (x) => x.waterTemperature },
    { label: "MLSS (mg/L)", accessor: (x) => x.mlss },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">评估对比</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 w-28">指标</th>
                <th className="text-right py-2">{a.date} · {a.membraneId}</th>
                <th className="text-right py-2">{b.date} · {b.membraneId}</th>
                <th className="text-center py-2 w-16">变化</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 font-medium">评分</td>
                <td className="text-right">{scoreA ? <span className={`font-bold ${scoreA.grade === "A" ? "text-green-600" : "text-red-600"}`}>{scoreA.totalScore.toFixed(1)} ({scoreA.grade})</span> : "—"}</td>
                <td className="text-right">{scoreB ? <span className={`font-bold ${scoreB.grade === "A" ? "text-green-600" : "text-red-600"}`}>{scoreB.totalScore.toFixed(1)} ({scoreB.grade})</span> : "—"}</td>
                <td className="text-center">{diff(scoreA?.totalScore, scoreB?.totalScore)}</td>
              </tr>
              {items.map((item) => {
                const va = item.accessor(a);
                const vb = item.accessor(b);
                return (
                  <tr key={item.label} className="border-b">
                    <td className="py-2">{item.label}</td>
                    <td className="text-right font-mono">{va ?? "—"}</td>
                    <td className="text-right font-mono">{vb ?? "—"}</td>
                    <td className="text-center">{diff(va, vb, item.lowerIsBetter)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
