import { useEffect, useMemo, useState } from "react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { AlertTriangle, Check, ChevronRight, X } from "lucide-react";
import type { Assessment, HealthGrade, ScoringResult } from "@/types";
import type { Phase } from "@/constants/membrane-options";
import { MEMBRANE_OPTIONS, MEMBRANE_POOLS } from "@/constants/membrane-options";
import { useApp } from "../../store/useStore";
import { calculateScore } from "../../engine/scoring";
import { getTriggeredRedlines } from "../../constants/redline-rules";
import {
  DEMO_ASSESSMENTS,
  DEMO_PROJECT_NAME,
  generateTrendData,
} from "../../constants/demo-data";

const gradeColors: Record<HealthGrade, string> = {
  A: "text-green-600 bg-green-50 border-green-200",
  B: "text-emerald-600 bg-emerald-50 border-emerald-200",
  C: "text-yellow-600 bg-yellow-50 border-yellow-200",
  D: "text-orange-600 bg-orange-50 border-orange-200",
  E: "text-red-600 bg-red-50 border-red-200",
};

interface ScoredAssessment {
  a: Assessment;
  s: ScoringResult;
}

export default function DashboardPage() {
  const { assessments, importAssessments } = useApp();
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [selectedMembraneId, setSelectedMembraneId] = useState<string | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<Phase>("一期");
  const [openPoolId, setOpenPoolId] = useState<string | null>(null);
  const hasData = assessments.length > 0;

  const loadDemo = () => {
    importAssessments(DEMO_ASSESSMENTS);
    setDemoLoaded(true);
  };

  // Earlier demo versions only had 12 records. Fill the missing boxes once after migration.
  useEffect(() => {
    const isDemoDataset = assessments.some((assessment) => assessment.projectName === DEMO_PROJECT_NAME);
    if (!isDemoDataset) return;
    const existingIds = new Set(assessments.map((assessment) => assessment.membraneId));
    const additions = DEMO_ASSESSMENTS.filter((assessment) => !existingIds.has(assessment.membraneId));
    if (additions.length > 0) importAssessments(additions);
  }, [assessments, importAssessments]);

  const latest = useMemo<ScoredAssessment[]>(() => {
    if (!hasData && !demoLoaded) return [];
    const source = hasData ? assessments : DEMO_ASSESSMENTS;
    const map = new Map<string, ScoredAssessment>();
    source.forEach((assessment) => {
      try {
        const score = calculateScore(assessment);
        const existing = map.get(assessment.membraneId);
        if (!existing || new Date(assessment.date) > new Date(existing.a.date)) {
          map.set(assessment.membraneId, { a: assessment, s: score });
        }
      } catch {
        // A malformed imported record must not break the dashboard.
      }
    });
    const order = new Map(MEMBRANE_OPTIONS.map((option, index) => [option.id, index]));
    return Array.from(map.values()).sort(
      (left, right) => (order.get(left.a.membraneId) ?? 9999) - (order.get(right.a.membraneId) ?? 9999)
    );
  }, [assessments, hasData, demoLoaded]);

  const allAssessments = hasData ? assessments : (demoLoaded ? assessments : DEMO_ASSESSMENTS);

  useEffect(() => {
    if (latest.length === 0) {
      setSelectedMembraneId(null);
      return;
    }
    if (!latest.some(({ a }) => a.membraneId === selectedMembraneId)) {
      setSelectedMembraneId(latest[0].a.membraneId);
    }
  }, [latest, selectedMembraneId]);

  const selected = useMemo(
    () => latest.find(({ a }) => a.membraneId === selectedMembraneId) ?? latest[0] ?? null,
    [latest, selectedMembraneId]
  );

  const totalRedlines = useMemo(
    () => latest.reduce((sum, { a }) => sum + getTriggeredRedlines(a).filter((rule) => rule.triggered).length, 0),
    [latest]
  );

  const avgScore = useMemo(
    () => latest.length === 0 ? 0 : latest.reduce((sum, { s }) => sum + s.totalScore, 0) / latest.length,
    [latest]
  );

  const radarData = useMemo(() => {
    if (!selected) return [];
    const dimensions = selected.s.dimensions;
    return [
      { dimension: "水力性能", score: dimensions.hydraulic.score / dimensions.hydraulic.maxScore * 100 },
      { dimension: "膜完整性", score: dimensions.integrity.score / dimensions.integrity.maxScore * 100 },
      { dimension: "污染与清洗", score: dimensions.fouling.score / dimensions.fouling.maxScore * 100 },
      { dimension: "机械状态", score: dimensions.mechanical.score / dimensions.mechanical.maxScore * 100 },
      { dimension: "运行风险", score: dimensions.risk.score / dimensions.risk.maxScore * 100 },
      { dimension: "维护可靠性", score: dimensions.maintenance.score / dimensions.maintenance.maxScore * 100 },
    ];
  }, [selected]);

  const trendData = useMemo(() => {
    if (!selected) return [];
    const stored = allAssessments.filter((assessment) => assessment.membraneId === selected.a.membraneId);
    const source = stored.length >= 2 ? stored : [...generateTrendData(selected.a), selected.a];
    return source
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
      .slice(-30)
      .map((assessment) => ({
        date: assessment.date.slice(5),
        TMP: Math.abs(assessment.currentTMP),
        flux: assessment.currentFlux
          ?? (assessment.membraneArea > 0 ? assessment.currentWaterProduction / assessment.membraneArea : 0),
        turbidity: assessment.turbidity,
      }));
  }, [allAssessments, selected]);

  const phasePools = MEMBRANE_POOLS.filter((pool) => pool.phase === selectedPhase);
  const openPool = MEMBRANE_POOLS.find((pool) => pool.id === openPoolId) ?? null;
  const openPoolOptions = openPool
    ? MEMBRANE_OPTIONS.filter((option) => option.poolId === openPool.id)
    : [];

  const selectBox = (membraneId: string) => {
    setSelectedMembraneId(membraneId);
    setOpenPoolId(null);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">总览仪表盘</h1>
          <p className="text-sm text-gray-500 mt-1">MBR膜健康度全局监控</p>
        </div>
        {!hasData && !demoLoaded && (
          <button onClick={loadDemo} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            加载演示数据
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs text-gray-400 uppercase">平均健康分</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{avgScore.toFixed(1)}</div>
          <div className="text-xs text-gray-400 mt-1">{latest.length}/120 个膜箱有数据</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs text-gray-400 uppercase">红线告警</div>
          <div className={`text-2xl font-bold mt-1 ${totalRedlines > 0 ? "text-red-600" : "text-green-600"}`}>
            {totalRedlines}
          </div>
          <div className="text-xs text-gray-400 mt-1">条触发</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs text-gray-400 uppercase">A级膜箱</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {latest.filter(({ s }) => s.grade === "A").length}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs text-gray-400 uppercase">D/E级膜箱</div>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {latest.filter(({ s }) => s.grade === "D" || s.grade === "E").length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">六维健康雷达图</h3>
              {selected && <p className="text-xs text-gray-400 mt-1">{selected.a.membraneId} · {selected.a.date}</p>}
            </div>
            {selected && (
              <div className="text-right">
                <span className="text-lg font-bold text-gray-800">{selected.s.totalScore.toFixed(1)}</span>
                <span className={`ml-2 inline-block px-2 py-0.5 rounded-full border text-xs font-bold ${gradeColors[selected.s.grade]}`}>
                  {selected.s.grade}级
                </span>
              </div>
            )}
          </div>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                <Radar name="维度得分率" dataKey="score" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">无数据</div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-700">TMP / 通量 / 浊度趋势</h3>
            {selected && <p className="text-xs text-gray-400 mt-1">{selected.a.membraneId} · 最近 {trendData.length} 次评估</p>}
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="TMP" stroke="#ef4444" dot={false} name="TMP (kPa)" strokeWidth={2} />
                <Line yAxisId="left" type="monotone" dataKey="flux" stroke="#3b82f6" dot={false} name="通量 (LMH)" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="turbidity" stroke="#f59e0b" dot={false} name="浊度 (NTU)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">无数据</div>
          )}
        </div>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold text-gray-700">各膜箱健康状态</h3>
          <p className="text-xs text-gray-400 mt-1">选择分期和膜池，查看池内10个膜箱</p>
        </div>
        <div className="p-4">
          <div className="inline-flex border border-gray-200 rounded-lg p-1 bg-gray-50 mb-4" aria-label="选择分期">
            {(["一期", "二期"] as const).map((phase) => (
              <button
                key={phase}
                type="button"
                onClick={() => setSelectedPhase(phase)}
                className={`px-5 py-1.5 text-sm rounded-md transition-colors ${
                  selectedPhase === phase ? "bg-white text-blue-700 shadow-sm font-medium" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {phase}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {phasePools.map((pool) => {
              const boxes = latest.filter(({ a }) => a.poolId === pool.id);
              const poolAverage = boxes.length
                ? boxes.reduce((sum, { s }) => sum + s.totalScore, 0) / boxes.length
                : 0;
              const poolRedlines = boxes.reduce((sum, { s }) => sum + s.redlineCount, 0);
              return (
                <button
                  key={pool.id}
                  type="button"
                  onClick={() => setOpenPoolId(pool.id)}
                  className="min-h-[112px] border border-gray-200 rounded-lg p-3 text-left hover:border-blue-400 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">{pool.poolNumber}号膜池</span>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                  <div className="text-xl font-bold text-gray-800 mt-2">{poolAverage.toFixed(1)}</div>
                  <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                    <span>{boxes.length}/10 个膜箱</span>
                    {poolRedlines > 0 && <span className="text-red-600">{poolRedlines} 条红线</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {openPool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpenPoolId(null)}>
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-base font-bold text-gray-800">{openPool.id}</h3>
                <p className="text-xs text-gray-400 mt-1">选择膜箱查看六维评分和运行趋势</p>
              </div>
              <button
                type="button"
                onClick={() => setOpenPoolId(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="关闭"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4">
              {openPoolOptions.map((option) => {
                const item = latest.find(({ a }) => a.membraneId === option.id);
                if (!item) {
                  return (
                    <div key={option.id} className="min-h-[118px] rounded-lg border border-dashed border-gray-200 p-3 text-gray-400">
                      <div className="text-sm font-medium">{option.label}</div>
                      <div className="text-xs mt-8">暂无评估</div>
                    </div>
                  );
                }
                const redlines = getTriggeredRedlines(item.a).filter((rule) => rule.triggered);
                const isSelected = selected?.a.membraneId === item.a.membraneId;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => selectBox(item.a.membraneId)}
                    className={`relative min-h-[118px] rounded-lg border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                        : item.s.overallStatus === "critical"
                          ? "border-red-300 bg-red-50 hover:border-red-400"
                          : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                    }`}
                  >
                    {isSelected && <Check size={15} className="absolute right-2 top-2 text-blue-600" />}
                    <div className="flex items-center justify-between pr-5">
                      <span className="text-sm font-medium text-gray-800">{option.label}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${gradeColors[item.s.grade]}`}>
                        {item.s.grade}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800 mt-3">{item.s.totalScore.toFixed(0)}</div>
                    {redlines.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                        <AlertTriangle size={12} /> {redlines.length} 条红线
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
