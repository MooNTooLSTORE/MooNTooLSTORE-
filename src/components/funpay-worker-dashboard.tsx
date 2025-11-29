"use client";

import { useDashboardState } from "@/hooks/useDashboardState";
import { DashboardUI } from "@/components/DashboardUI";

export default function FunPayWorkerDashboard() {
  const state = useDashboardState();

  return <DashboardUI {...state} />;
}
