import type { Assessment, ScoringResult, Diagnosis, RedlineResult } from "@/types";
import { calculateScore } from "@/engine/scoring";
import { getTriggeredRedlines } from "@/constants/redline-rules";
import { runDiagnosis } from "@/constants/diagnosis-rules";

export function printReport(assessment: Assessment) {
  let score: ScoringResult;
  let redlines: RedlineResult[];
  let diagnoses: Diagnosis[];
  try {
    score = calculateScore(assessment);
    redlines = getTriggeredRedlines(assessment).filter((r) => r.triggered);
    diagnoses = runDiagnosis(assessment);
  } catch {
    alert("当前记录无法生成报告，请重新保存或重新导入该评估。");
    return;
  }

  const html = buildReportHTML(assessment, score, redlines, diagnoses);
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

function escapeHTML(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char] ?? char));
}

function buildReportHTML(
  a: Assessment,
  score: ScoringResult,
  redlines: RedlineResult[],
  diagnoses: Diagnosis[]
): string {
  const dimLabels: Record<string, string> = {
    hydraulic: "水力性能", integrity: "膜完整性及出水", fouling: "污染与清洗恢复",
    mechanical: "机械及组件状态", risk: "运行风险暴露", maintenance: "维护与数据可靠性",
  };
  const gradeNames: Record<string, string> = {
    A: "健康", B: "轻度衰减", C: "亚健康", D: "严重衰减", E: "失效风险",
  };

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>MBR膜健康评估报告</title>
<style>
  body { font-family: "Microsoft YaHei", sans-serif; padding: 20px; color: #333; max-width: 800px; margin: auto; }
  h1 { font-size: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
  h2 { font-size: 16px; color: #2563eb; margin-top: 20px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .score { font-size: 48px; font-weight: bold; color: ${score.grade === "A" ? "#16a34a" : score.grade === "E" ? "#dc2626" : "#d97706"}; }
  .grade { font-size: 24px; margin-left: 8px; padding: 4px 12px; border-radius: 20px; background: ${score.grade === "A" ? "#dcfce7" : score.grade === "E" ? "#fecaca" : "#fef3c7"}; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  th, td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; }
  .redline { background: #fef2f2; border-left: 3px solid #dc2626; padding: 8px 12px; margin: 6px 0; }
  .diagnosis { background: #f0f9ff; border-left: 3px solid #2563eb; padding: 8px 12px; margin: 6px 0; }
  .disclaimer { font-size: 11px; color: #9ca3af; margin-top: 6px; }
  .confidence-high { color: #dc2626; font-weight: bold; }
  .confidence-medium { color: #d97706; }
  .confidence-low { color: #6b7280; }
  .bar-wrap { background: #e5e7eb; height: 8px; border-radius: 4px; margin: 2px 0; }
  .bar-fill { height: 8px; border-radius: 4px; }
  .footer { margin-top: 30px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
  @page { size: A4; margin: 15mm; }
  @media print { body { padding: 0; } h2, .redline, .diagnosis, tr { break-inside: avoid; } }
</style></head>
<body>
  <div class="header">
    <div>
      <h1>MBR 膜健康评估报告</h1>
      <div>${escapeHTML(a.projectName)} · ${escapeHTML(a.poolId)} · ${escapeHTML(a.membraneId)}</div>
      <div>评估日期: ${escapeHTML(a.date)} | 膜型号: ${escapeHTML(a.membraneModel || "—")}</div>
    </div>
    <div style="text-align:right">
      <div class="score">${score.totalScore.toFixed(1)}</div>
      <div class="grade">${score.grade}级 · ${gradeNames[score.grade]}</div>
    </div>
  </div>

  ${redlines.length > 0 ? `
  <h2>⚠ 红线告警 (${redlines.length}条)</h2>
  ${redlines.map((r) => `<div class="redline"><strong>${escapeHTML(r.name)}</strong>: ${escapeHTML(r.recommendation)}</div>`).join("")}
  ` : ""}

  <h2>六维评分明细</h2>
  <table>
    <tr><th>维度</th><th>得分</th><th>满分</th></tr>
    ${Object.entries(score.dimensions).map(([k, v]) =>
      `<tr><td>${dimLabels[k] || k}</td><td>${v.score.toFixed(1)}</td><td>${v.maxScore}</td></tr>`
    ).join("")}
    <tr style="font-weight:bold;background:#f0f9ff"><td>综合总分</td><td>${score.totalScore.toFixed(1)}</td><td>100</td></tr>
  </table>

  <h2>关键指标</h2>
  <table>
    <tr><th>指标</th><th>数值</th><th>单位</th></tr>
    <tr><td>TMP</td><td>${Math.abs(a.currentTMP)}</td><td>kPa</td></tr>
    <tr><td>通量</td><td>${a.currentFlux ?? "—"}</td><td>LMH</td></tr>
    <tr><td>浊度</td><td>${a.turbidity}</td><td>NTU</td></tr>
    <tr><td>MLSS</td><td>${a.mlss ?? "—"}</td><td>mg/L</td></tr>
    <tr><td>水温</td><td>${a.waterTemperature}</td><td>°C</td></tr>
  </table>

  ${diagnoses.length > 0 ? `
  <h2>问题诊断 (${diagnoses.length}条)</h2>
  ${diagnoses.map((d) => `
    <div class="diagnosis">
      <strong>${escapeHTML(d.name)}</strong>
      <span class="confidence-${d.confidence}">[置信度: ${d.confidence === "high" ? "高" : d.confidence === "medium" ? "中" : "低"}]</span>
      ${d.supportingData.length > 0 ? `<p>证据: ${d.supportingData.map(escapeHTML).join("；")}</p>` : ""}
      <p>检查顺序: ${d.checkOrder.map(escapeHTML).join(" → ")}</p>
      <p>建议措施: ${d.recommendedActions.map(escapeHTML).join("；")}</p>
      <p class="disclaimer">⚠ ${escapeHTML(d.disclaimer)}</p>
    </div>
  `).join("")}
  ` : ""}

  <div class="footer">
    PVDF中空纤维MBR膜健康度评估系统 v1.0 · 报告生成时间: ${new Date().toLocaleString("zh-CN")}<br>
    本报告由系统自动生成，诊断结果仅供运维参考，不替代人工检查和实验室检测。
  </div>
</body></html>`;
}
