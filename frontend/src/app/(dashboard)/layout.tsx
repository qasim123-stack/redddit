"use client";

import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#111113" }}>
      <DashboardSidebar />
      {/* Push main content right of the fixed sidebar */}
      <main style={{ marginLeft: 220, flex: 1, minWidth: 0, overflowX: "hidden" }}>
        {children}
      </main>
    </div>
  );
}
