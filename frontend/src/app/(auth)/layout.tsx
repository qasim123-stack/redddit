import type { Metadata } from "next";
import { AuthLeftPanel } from "@/components/layout/auth-left-panel";
import { PageTransition } from "@/components/layout/page-transition";

export const metadata: Metadata = { title: "Redddit AI — Sign In" };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100%" }}>

      {/* ── Left panel ── */}
      <div style={{ width: "57%", position: "relative", flexShrink: 0 }}>
        <AuthLeftPanel />
      </div>

      {/* ── Right form panel ── */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        minHeight: "100vh",
        padding: "40px 56px 40px 32px",
        background: "#111113",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* radial glow — anchored to the right */}
        <div style={{
          position: "absolute", top: "50%", right: -80,
          transform: "translateY(-50%)",
          width: 560, height: 560, borderRadius: "50%",
          background: "radial-gradient(circle,rgba(255,69,0,0.07) 0%,transparent 65%)",
          pointerEvents: "none",
        }} />
        <PageTransition>
          <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440 }}>
            {children}
          </div>
        </PageTransition>
      </div>
    </div>
  );
}
