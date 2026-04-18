"use client";

import { motion } from "framer-motion";
import { Flame, Bell, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

export interface ActivityItem {
  id: string | number;
  type: "crisis" | "notification" | "trend" | "alert" | "resolved";
  title: string;
  subtitle?: string;
  time: string;
  severity?: "low" | "medium" | "high" | "critical";
}

const SEVERITY_COLOR: Record<string, string> = {
  low: "#eab308", medium: "#f97316", high: "#ef4444", critical: "#dc2626",
};

const TYPE_META: Record<string, { icon: React.FC<{ size?: number; style?: React.CSSProperties }>, color: string }> = {
  crisis:       { icon: Flame,         color: "#ef4444" },
  notification: { icon: Bell,          color: "#FF4500" },
  trend:        { icon: TrendingUp,    color: "#22c55e" },
  alert:        { icon: AlertTriangle, color: "#eab308" },
  resolved:     { icon: CheckCircle2,  color: "#22c55e" },
};

const SAMPLE: ActivityItem[] = [
  { id: 1, type: "crisis",       title: "Crisis detected — r/techsupport",     subtitle: "Negative sentiment spike: 84%",  time: "2m ago",  severity: "high" },
  { id: 2, type: "trend",        title: "Trending: 'AI pricing backlash'",      subtitle: "42 mentions in the last hour",   time: "8m ago" },
  { id: 3, type: "notification", title: "New posts fetched — r/MachineLearning",subtitle: "87 new posts analyzed",          time: "15m ago" },
  { id: 4, type: "alert",        title: "Keyword spike — 'customer service'",   subtitle: "3× normal volume",              time: "22m ago", severity: "medium" },
  { id: 5, type: "resolved",     title: "Crisis resolved — r/startups",         subtitle: "Sentiment returned to baseline", time: "1h ago" },
  { id: 6, type: "trend",        title: "Emerging: 'subscription fatigue'",     subtitle: "18 posts, growing",             time: "1h ago" },
  { id: 7, type: "notification", title: "Weekly digest ready",                  subtitle: "Tap to view full report",       time: "2h ago" },
];

interface Props {
  items?: ActivityItem[];
}

export function ActivityTimeline({ items = SAMPLE }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      style={{
        background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 18, padding: "24px", height: "100%",
        display: "flex", flexDirection: "column",
      }}
    >
      <div style={{ marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0" }}>Activity Feed</div>
          <div style={{ fontSize: 12, color: "#606068", marginTop: 3 }}>Recent notifications & alerts</div>
        </div>
        {/* Live indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }}
          />
          <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>LIVE</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
        {items.map((item, i) => {
          const meta = TYPE_META[item.type] ?? TYPE_META.notification;
          const Icon = meta.icon;
          const color = item.severity ? SEVERITY_COLOR[item.severity] : meta.color;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3, ease: "easeOut" }}
              style={{ display: "flex", gap: 12, marginBottom: 16, position: "relative" }}
            >
              {/* Connector line */}
              {i < items.length - 1 && (
                <div style={{
                  position: "absolute", left: 15, top: 32, bottom: -16,
                  width: 1, background: "rgba(255,255,255,0.05)",
                }} />
              )}

              {/* Icon dot */}
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                background: `${color}18`, border: `1px solid ${color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={13} style={{ color }} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e0e0e8", lineHeight: 1.35 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 10.5, color: "#606068", flexShrink: 0, marginTop: 1 }}>{item.time}</div>
                </div>
                {item.subtitle && (
                  <div style={{ fontSize: 11.5, color: "#808088", marginTop: 3 }}>{item.subtitle}</div>
                )}
                {item.severity && (
                  <div style={{
                    display: "inline-flex", alignItems: "center",
                    marginTop: 5, padding: "2px 8px", borderRadius: 6,
                    background: `${SEVERITY_COLOR[item.severity]}18`,
                    border: `1px solid ${SEVERITY_COLOR[item.severity]}30`,
                    fontSize: 10.5, fontWeight: 700, color: SEVERITY_COLOR[item.severity],
                    textTransform: "uppercase", letterSpacing: "0.5px",
                  }}>
                    {item.severity}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
