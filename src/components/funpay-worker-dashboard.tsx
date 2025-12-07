"use client";

import { useDashboardState } from "@/hooks/useDashboardState";
import { DashboardUI } from "@/components/DashboardUI";

export default function FunPayWorkerDashboard() {
  const state = useDashboardState();

  // Оборачиваем DashboardUI в стилизованный контейнер
  return (
      <div className="w-full max-w-6xl bg-transparent backdrop-blur-sm rounded-2xl border border-border/30 shadow-2xl overflow-hidden">
          <DashboardUI {...state} />
      </div>
  );
}
