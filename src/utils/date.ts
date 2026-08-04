export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function daysBetween(d1: string, d2: string): number {
  const ms = new Date(d2).getTime() - new Date(d1).getTime();
  return Math.round(ms / (24 * 3600 * 1000));
}
