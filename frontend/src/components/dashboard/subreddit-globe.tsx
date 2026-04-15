"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";

const GlobeInner = dynamic(() => import("./subreddit-globe-inner"), {
  ssr: false,
  loading: () => (
    <div style={{
      width: 420, height: 320,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        border: "2px solid rgba(255,69,0,0.3)",
        borderTop: "2px solid #FF4500",
        animation: "spin 1s linear infinite",
      }} />
    </div>
  ),
});

interface SubredditGlobeProps { subredditCount?: number }

export function SubredditGlobe({ subredditCount = 0 }: SubredditGlobeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.35 }}
      style={{
        background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 18, padding: "24px", height: "100%",
        display: "flex", flexDirection: "column",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0" }}>Subreddit Coverage</div>
        <div style={{ fontSize: 12, color: "#606068", marginTop: 3 }}>
          Geo-distribution of monitored communities
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 12 }}>
        <GlobeInner />
      </div>

      {/* Stats strip */}
      <div style={{
        display: "flex", gap: 0, marginTop: 16,
        border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, overflow: "hidden",
      }}>
        {[
          { label: "Subreddits", value: subredditCount > 0 ? String(subredditCount) : "—" },
          { label: "Countries", value: "14" },
          { label: "Live arcs", value: "5" },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, textAlign: "center", padding: "10px 0",
            borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none",
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#FF4500" }}>{s.value}</div>
            <div style={{ fontSize: 10.5, color: "#606068", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}
