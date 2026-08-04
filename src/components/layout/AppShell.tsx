import { useState } from "react";
import Sidebar from "./Sidebar";
import DashboardPage from "../dashboard/DashboardPage";
import AssessmentPage from "../assessment/AssessmentPage";
import HistoryPage from "../history/HistoryPage";
import RulesPage from "../rules/RulesPage";

type Page = "dashboard" | "assessment" | "history" | "rules";

export default function AppShell() {
  const [page, setPage] = useState<Page>("dashboard");

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentPage={page} onNavigate={setPage} />
      <main className="flex-1 overflow-y-auto">
        {page === "dashboard" && <DashboardPage />}
        {page === "assessment" && <AssessmentPage />}
        {page === "history" && <HistoryPage />}
        {page === "rules" && <RulesPage />}
      </main>
    </div>
  );
}
