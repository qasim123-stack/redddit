"use client";

import { useEffect, useState } from "react";
import { motion, type Easing } from "framer-motion";
import {
  Users, FileText, Brain, Flame, RefreshCw, Bell,
} from "lucide-react";

import { useAuthStore } from "@/lib/store/auth-store";
import { fetchProfileSummary, type ProfileSummary } from "@/lib/api/dashboard";

import { AnimatedGradientBg } from "@/components/dashboard/animated-bg";
import { StatCard } from "@/components/dashboard/stat-card";
import { SentimentDonut } from "@/components/dashboard/sentiment-donut";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { SubredditGlobe } from "@/components/dashboard/subreddit-globe";
import { TopicWordCloud } from "@/components/dashboard/topic-wordcloud";
import { CrisisHeatmap } from "@/components/dashboard/crisis-heatmap";

const EASE: Easing = "easeOut";
const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 22 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { duration: 0.45, ease: EASE, delay },
});

export default function DashboardPage() {
  const { user, token } = useAuthStore();
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();
  const timeString = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const dateString = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const load = async (showRefresh = false) => {
    if (!token) { setLoading(false); return; }
    if (showRefresh) setRefreshing(true);
    try {
      const data = await fetchProfileSummary(token);
      setSummary(data);
    } catch {
      // Silently fail — widgets will show sample data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = summary?.summary;

  return (
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: "Inter, sans-serif" }}>
      {/* Canvas background */}
      <AnimatedGradientBg />

      {/* All content is above the canvas */}
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ── Topbar ── */}
        <motion.div
          {...FADE_UP(0)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "20px 28px 0",
          }}
        >
          {/* Greeting */}
          <div>
            <h1 style={{
              margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px",
              background: "linear-gradient(90deg, #FF4500 0%, #ff8c69 45%, #7c3aed 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Good {now.getHours() < 12 ? "morning" : now.getHours() < 18 ? "afternoon" : "evening"},{" "}
              {user?.full_name?.split(" ")[0] ?? "there"} 👋
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#606068" }}>
              {dateString} · {timeString}
            </p>
          </div>

          {/* Right: refresh + notifications */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <motion.button
              onClick={() => load(true)}
              disabled={refreshing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 10,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#a0a0a8", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              Refresh
            </motion.button>

            <motion.div
              whileHover={{ scale: 1.07 }}
              style={{
                width: 38, height: 38, borderRadius: 10,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", position: "relative",
              }}
            >
              <Bell size={15} style={{ color: "#a0a0a8" }} />
              {/* Badge */}
              <div style={{
                position: "absolute", top: 7, right: 8, width: 7, height: 7,
                borderRadius: "50%", background: "#FF4500",
                boxShadow: "0 0 6px rgba(255,69,0,0.8)",
              }} />
            </motion.div>
          </div>
        </motion.div>

        {/* ── Stat Cards ── */}
        <motion.div
          {...FADE_UP(0.08)}
          style={{
            display: "flex", gap: 14, padding: "20px 28px 0",
            flexWrap: "wrap",
          }}
        >
          <StatCard
            label="Total Profiles"
            value={stats?.total_profiles ?? 8}
            icon={Users}
            color="#FF4500"
            delay={0.1}
          />
          <StatCard
            label="Posts Fetched"
            value={stats?.total_posts_fetched ?? 24310}
            icon={FileText}
            color="#7c3aed"
            delay={0.18}
          />
          <StatCard
            label="Analyses Done"
            value={stats?.total_posts_analyzed ?? 19840}
            icon={Brain}
            color="#22c55e"
            delay={0.26}
          />
          <StatCard
            label="Active Crises"
            value={3}
            icon={Flame}
            color="#ef4444"
            delay={0.34}
          />
        </motion.div>

        {/* ── Row 2: Sentiment + Activity ── */}
        <div style={{ display: "flex", gap: 14, padding: "14px 28px 0", alignItems: "stretch" }}>
          {/* Sentiment donut — 38% */}
          <div style={{ flex: "0 0 calc(38% - 7px)", minWidth: 0 }}>
            <SentimentDonut positive={11200} negative={4100} neutral={4540} />
          </div>

          {/* Activity timeline — 62% */}
          <div style={{ flex: "0 0 calc(62% - 7px)", minWidth: 0 }}>
            <ActivityTimeline />
          </div>
        </div>

        {/* ── Row 3: Globe + Word Cloud ── */}
        <div style={{ display: "flex", gap: 14, padding: "14px 28px 0", alignItems: "stretch" }}>
          {/* Globe — 45% */}
          <div style={{ flex: "0 0 calc(45% - 7px)", minWidth: 0 }}>
            <SubredditGlobe />
          </div>

          {/* Word cloud — 55% */}
          <div style={{ flex: "0 0 calc(55% - 7px)", minWidth: 0 }}>
            <TopicWordCloud />
          </div>
        </div>

        {/* ── Row 4: Crisis Heatmap ── */}
        <div style={{ padding: "14px 28px 28px" }}>
          <CrisisHeatmap />
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
