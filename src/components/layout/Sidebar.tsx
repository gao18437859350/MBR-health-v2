import { useState } from "react";
import {
  LayoutDashboard, ClipboardPlus, History, Settings, Menu, X,
} from "lucide-react";

type Page = "dashboard" | "assessment" | "history" | "rules";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "总览仪表盘", icon: LayoutDashboard },
  { id: "assessment", label: "新建评估", icon: ClipboardPlus },
  { id: "history", label: "历史记录", icon: History },
  { id: "rules", label: "规则设置", icon: Settings },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
              active
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-56 bg-white border-r border-gray-200 flex flex-col transform transition-transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">MBR 膜健康评估</h2>
          <p className="text-xs text-gray-400 mt-0.5">PVDF 中空纤维膜</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{nav}</div>
        <div className="p-3 border-t border-gray-100 text-xs text-gray-400 text-center">
          v1.0.0
        </div>
      </aside>
    </>
  );
}
