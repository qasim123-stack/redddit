"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, AlertTriangle, CheckCircle, Clock, X, ChevronRight,
  ArrowLeft, RefreshCw, Shield, TrendingUp, BarChart2, Zap,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store/auth-store";
import { crisisApi, type CrisisAlert } from "@/lib/api/crisis";
import { profilesApi, type Profile } from "@/lib/api/profiles";
import { AnimatedGradientBg } from "@/components/dashboard/animated-bg";
import { CrisisHeatmap } from "@/components/dashboard/crisis-heatmap";

// ── Color helpers ─────────────────────────────────────────────────────────────
const SEV_CONFIG = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", label: "Critical" },
  high:     { color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)", label: "High" },
  medium:   { color: "#eab308", bg: "rgba(234,179,8,0.12)",  border: "rgba(234,179,8,0.3)",  label: "Medium" },
  low:      { color: "#22c55e", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.3)",  label: "Low" },
} as const;

const STATUS_CONFIG = {
  active:       { color: "#ef4444", bg: "rgba(239,68,68,0.1)",  label: "Active",       icon: AlertTriangle },
  acknowledged: { color: "#eab308", bg: "rgba(234,179,8,0.1)",  label: "Acknowledged", icon: Clock },
  resolved:     { color: "#22c55e", bg: "rgba(34,197,94,0.1)",  label: "Resolved",     icon: CheckCircle },
} as const;

function getSevConfig(s: string) {
  return SEV_CONFIG[s as keyof typeof SEV_CONFIG] ?? SEV_CONFIG.low;
}
function getStatusConfig(s: string) {
  return STATUS_CONFIG[s as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.active;
}


function buildSpikeData(alert: CrisisAlert) {
  const baseline = alert.negative_count_baseline ?? 10;
  const current  = alert.negative_count_current ?? Math.round((alert.spike_multiplier ?? 2) * baseline);
  return Array.from({ length: 12 }, (_, i) => {
    const factor = i < 8 ? 1 : 1 + ((i - 8) / 3) * ((current / baseline) - 1);
    return {
      hour: `${i * 2}h`,
      baseline: Math.round(baseline * (0.9 + Math.random() * 0.2)),
      current:  i < 8
        ? Math.round(baseline * (0.85 + Math.random() * 0.3))
        : Math.round(baseline * factor * (0.92 + Math.random() * 0.16)),
    };
  });
}

// ── Resolve modal ─────────────────────────────────────────────────────────────
function ResolveModal({ alert, onClose, onConfirm }: {
  alert: CrisisAlert; onClose: () => void; onConfirm: (notes: string) => void;
}) {
  const [notes, setNotes] = useState("");
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: "#161618", border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 20, padding: "28px 28px 24px",
          width: "100%", maxWidth: 480,
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "rgba(34,197,94,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <CheckCircle size={20} style={{ color: "#22c55e" }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#f0f0f0" }}>Resolve Alert</div>
            <div style={{ fontSize: 12, color: "#606068", marginTop: 2 }}>Optional: add resolution notes</div>
          </div>
          <button onClick={onClose} style={{
            marginLeft: "auto", background: "none", border: "none",
            color: "#606068", cursor: "pointer", padding: 4,
          }}>
            <X size={18} />
          </button>
        </div>

        <div style={{
          background: "#1c1c1f", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#a0a0a8",
        }}>
          {alert.title}
        </div>

        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Describe what steps were taken to resolve this crisis…"
          rows={4}
          style={{
            width: "100%", background: "#1c1c1f",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: "12px 14px",
            color: "#f0f0f0", fontSize: 13, fontFamily: "Inter, sans-serif",
            resize: "none", outline: "none", boxSizing: "border-box",
          }}
          onFocus={e => (e.target.style.borderColor = "rgba(34,197,94,0.4)")}
          onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <motion.button
            onClick={onClose}
            whileHover={{ background: "rgba(255,255,255,0.05)" }}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10,
              background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
              color: "#808088", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >Cancel</motion.button>
          <motion.button
            onClick={() => onConfirm(notes)}
            whileHover={{ boxShadow: "0 0 20px rgba(34,197,94,0.35)" }}
            whileTap={{ scale: 0.97 }}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10,
              background: "linear-gradient(135deg, #16a34a, #22c55e)",
              border: "none", color: "#fff",
              fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >Resolve Alert</motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Detail drawer ─────────────────────────────────────────────────────────────
function AlertDrawer({ alert, onClose, onAcknowledge, onResolve }: {
  alert: CrisisAlert | null; onClose: () => void;
  onAcknowledge: (id: number) => void; onResolve: (a: CrisisAlert) => void;
}) {
  const spikeData = useMemo(() => alert ? buildSpikeData(alert) : [], [alert]);
  const sev = alert ? getSevConfig(alert.severity) : getSevConfig("low");
  const sta = alert ? getStatusConfig(alert.status) : getStatusConfig("active");
  const StatusIcon = sta.icon;

  return (
    <AnimatePresence>
      {alert && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 300,
              width: Math.min(520, typeof window !== "undefined" ? window.innerWidth - 220 : 520),
              background: "#111113", borderLeft: "1px solid rgba(255,255,255,0.07)",
              overflowY: "auto", display: "flex", flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "22px 24px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "flex-start", gap: 14,
              background: `linear-gradient(135deg, ${sev.bg}, transparent)`,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 13, flexShrink: 0,
                background: sev.bg, border: `1px solid ${sev.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Flame size={22} style={{ color: sev.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f0f0", lineHeight: 1.35 }}>
                  {alert.title}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 20,
                    background: sev.bg, border: `1px solid ${sev.border}`,
                    color: sev.color, fontSize: 11, fontWeight: 700,
                  }}>{sev.label}</span>
                  <span style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "3px 10px", borderRadius: 20,
                    background: sta.bg, color: sta.color, fontSize: 11, fontWeight: 700,
                  }}>
                    <StatusIcon size={10} />{sta.label}
                  </span>
                </div>
              </div>
              <button onClick={onClose} style={{
                background: "none", border: "none", color: "#606068", cursor: "pointer", padding: 4, flexShrink: 0,
              }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 24px", flex: 1 }}>
              {alert.description && (
                <div style={{
                  background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12, padding: "14px 16px", marginBottom: 20,
                  fontSize: 13.5, color: "#a0a0a8", lineHeight: 1.6,
                }}>
                  {alert.description}
                </div>
              )}

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[
                  { label: "Spike", value: alert.spike_multiplier ? `${Number(alert.spike_multiplier).toFixed(1)}×` : "—", color: sev.color },
                  { label: "Posts Affected", value: alert.affected_posts_count ?? "—", color: "#60a5fa" },
                  { label: "Neg. Count", value: alert.negative_count_current ?? "—", color: "#f87171" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 12, padding: "12px 14px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
                    <div style={{ fontSize: 10.5, color: "#606068", marginTop: 3 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Spike chart */}
              <div style={{
                background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14, padding: "16px 16px 8px", marginBottom: 20,
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#a0a0a8", marginBottom: 12 }}>
                  Sentiment Spike Timeline
                </div>
                <ResponsiveContainer width="100%" height={130}>
                  <AreaChart data={spikeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pBaseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="pCurrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={sev.color} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={sev.color} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#606068" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#606068" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#1c1c1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: "#a0a0a8" }}
                    />
                    <Area type="monotone" dataKey="baseline" stroke="#22c55e" strokeWidth={1.5}
                      fill="url(#pBaseGrad)" name="Baseline" dot={false} />
                    <Area type="monotone" dataKey="current" stroke={sev.color} strokeWidth={2}
                      fill="url(#pCurrGrad)" name="Current" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                  {[{ color: "#22c55e", label: "Baseline" }, { color: sev.color, label: "Current" }].map(({ color, label }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 10, height: 3, borderRadius: 2, background: color }} />
                      <span style={{ fontSize: 10.5, color: "#606068" }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pain points */}
              {(alert.top_pain_points?.length ?? 0) > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#606068", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                    Top Pain Points
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {alert.top_pain_points!.map(pp => (
                      <span key={pp} style={{
                        padding: "5px 12px", borderRadius: 20,
                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                        color: "#f87171", fontSize: 12,
                      }}>{pp}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Keywords */}
              {(alert.top_keywords?.length ?? 0) > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#606068", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                    Trending Keywords
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {alert.top_keywords!.map(kw => (
                      <span key={kw} style={{
                        padding: "5px 12px", borderRadius: 20,
                        background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)",
                        color: "#a855f7", fontSize: 12,
                      }}>#{kw}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution notes */}
              {alert.resolution_notes && (
                <div style={{
                  background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)",
                  borderRadius: 12, padding: "14px 16px", marginBottom: 20,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Resolution Notes
                  </div>
                  <div style={{ fontSize: 13, color: "#a0a0a8", lineHeight: 1.55 }}>{alert.resolution_notes}</div>
                </div>
              )}

              {/* Timestamps */}
              <div style={{ fontSize: 11.5, color: "#505058" }}>
                <div>Detected: {new Date(alert.created_at).toLocaleString()}</div>
                {alert.acknowledged_at && <div style={{ marginTop: 3 }}>Acknowledged: {new Date(alert.acknowledged_at).toLocaleString()}</div>}
                {alert.resolved_at && <div style={{ marginTop: 3 }}>Resolved: {new Date(alert.resolved_at).toLocaleString()}</div>}
              </div>
            </div>

            {/* Actions */}
            {alert.status !== "resolved" && (
              <div style={{ padding: "16px 24px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 10 }}>
                {alert.status === "active" && (
                  <motion.button
                    onClick={() => onAcknowledge(alert.id)}
                    whileHover={{ background: "rgba(234,179,8,0.15)" }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                      padding: "11px 0", borderRadius: 11,
                      background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)",
                      color: "#fbbf24", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    }}
                  ><Clock size={14} /> Acknowledge</motion.button>
                )}
                <motion.button
                  onClick={() => onResolve(alert)}
                  whileHover={{ boxShadow: "0 0 20px rgba(34,197,94,0.3)" }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    padding: "11px 0", borderRadius: 11,
                    background: "linear-gradient(135deg, #15803d, #16a34a)",
                    border: "none", color: "#fff", fontSize: 13.5, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                ><CheckCircle size={14} /> Resolve</motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Alert card ─────────────────────────────────────────────────────────────────
function AlertCard({ alert, index, onClick, onAcknowledge, onResolve }: {
  alert: CrisisAlert; index: number; onClick: () => void;
  onAcknowledge: (id: number) => void; onResolve: (a: CrisisAlert) => void;
}) {
  const sev = getSevConfig(alert.severity);
  const sta = getStatusConfig(alert.status);
  const StatusIcon = sta.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, delay: index * 0.04 }}
      onClick={onClick}
      whileHover={{ borderColor: sev.border, y: -2 }}
      style={{
        background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16, padding: "18px 20px",
        cursor: "pointer", transition: "border-color 0.15s, transform 0.15s",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Accent bar */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        borderRadius: "16px 0 0 16px", background: sev.color,
      }} />

      {/* Pulsing glow for critical active */}
      {alert.severity === "critical" && alert.status === "active" && (
        <motion.div
          animate={{ opacity: [0.06, 0.14, 0.06] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          style={{
            position: "absolute", inset: 0, borderRadius: 16,
            background: `radial-gradient(ellipse at top left, ${sev.color}20, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
      )}

      <div style={{ position: "relative" }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
            background: sev.bg, border: `1px solid ${sev.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Flame size={18} style={{ color: sev.color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#f0f0f0", lineHeight: 1.35, marginBottom: 7 }}>
              {alert.title}
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <span style={{
                padding: "2px 9px", borderRadius: 20,
                background: sev.bg, border: `1px solid ${sev.border}`,
                color: sev.color, fontSize: 10.5, fontWeight: 700,
              }}>{sev.label}</span>
              <span style={{
                display: "flex", alignItems: "center", gap: 3,
                padding: "2px 9px", borderRadius: 20,
                background: sta.bg, color: sta.color, fontSize: 10.5, fontWeight: 700,
              }}>
                <StatusIcon size={9} />{sta.label}
              </span>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: "#404048", flexShrink: 0, marginTop: 2 }} />
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
          {alert.spike_multiplier != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <TrendingUp size={12} style={{ color: sev.color }} />
              <span style={{ fontSize: 12, color: "#a0a0a8" }}>
                <span style={{ fontWeight: 700, color: sev.color }}>{Number(alert.spike_multiplier).toFixed(1)}×</span> spike
              </span>
            </div>
          )}
          {alert.affected_posts_count != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <BarChart2 size={12} style={{ color: "#60a5fa" }} />
              <span style={{ fontSize: 12, color: "#a0a0a8" }}>
                <span style={{ fontWeight: 600, color: "#60a5fa" }}>{alert.affected_posts_count}</span> posts
              </span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={11} style={{ color: "#606068" }} />
            <span style={{ fontSize: 11, color: "#606068" }}>{new Date(alert.created_at).toLocaleString()}</span>
          </div>
        </div>

        {/* Pain points */}
        {(alert.top_pain_points?.length ?? 0) > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {alert.top_pain_points!.slice(0, 3).map(pp => (
              <span key={pp} style={{
                padding: "3px 10px", borderRadius: 20,
                background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)",
                color: "#f87171", fontSize: 11,
              }}>{pp}</span>
            ))}
          </div>
        )}

        {/* Actions */}
        {alert.status !== "resolved" && (
          <div style={{ display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
            {alert.status === "active" && (
              <motion.button
                onClick={() => onAcknowledge(alert.id)}
                whileHover={{ background: "rgba(234,179,8,0.14)" }}
                whileTap={{ scale: 0.96 }}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 14px", borderRadius: 8,
                  background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.2)",
                  color: "#fbbf24", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}
              ><Clock size={11} /> Acknowledge</motion.button>
            )}
            <motion.button
              onClick={() => onResolve(alert)}
              whileHover={{ background: "rgba(34,197,94,0.14)" }}
              whileTap={{ scale: 0.96 }}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 14px", borderRadius: 8,
                background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)",
                color: "#4ade80", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            ><CheckCircle size={11} /> Resolve</motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 16px", borderRadius: 12,
      background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9, background: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={15} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#f0f0f0", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 10.5, color: "#606068", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

// ── Filter pills ──────────────────────────────────────────────────────────────
const SEV_OPTS   = [{ label: "All", value: "" }, { label: "Critical", value: "critical" }, { label: "High", value: "high" }, { label: "Medium", value: "medium" }, { label: "Low", value: "low" }];
const STATUS_OPTS = [{ label: "All", value: "" }, { label: "Active", value: "active" }, { label: "Acknowledged", value: "acknowledged" }, { label: "Resolved", value: "resolved" }];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProfileCrisisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: profileId } = use(params);
  const pid = parseInt(profileId, 10);

  const { token } = useAuthStore();

  const [profile, setProfile]       = useState<Profile | null>(null);
  const [alerts, setAlerts]         = useState<CrisisAlert[]>([]);
  const [loading, setLoading]       = useState(true);
  const [sevFilter, setSevFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedAlert, setSelectedAlert] = useState<CrisisAlert | null>(null);
  const [resolveTarget, setResolveTarget] = useState<CrisisAlert | null>(null);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    if (!token) return;
    profilesApi.list(token).then(list => {
      setProfile(list.find(p => p.id === pid) ?? null);
    }).catch(() => {});
  }, [pid, token]);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await crisisApi.listForProfile(pid, {
        status: statusFilter || undefined,
        severity: sevFilter || undefined,
      }, token);
      setAlerts(data);
    } catch {
      toast.error("Failed to load alerts");
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [pid, token, statusFilter, sevFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => alerts, [alerts]);

  const hasCriticalActive = filtered.some(a => a.severity === "critical" && a.status === "active");

  const handleTrigger = async () => {
    if (!token) return;
    setTriggering(true);
    try {
      await crisisApi.triggerDetection(pid, token);
      toast.success("Crisis detection queued", { description: "Results will appear shortly" });
    } catch {
      toast.error("Failed to trigger detection");
    } finally {
      setTriggering(false);
    }
  };

  const handleAcknowledge = async (id: number) => {
    if (!token) return;
    try {
      const updated = await crisisApi.acknowledge(id, token);
      setAlerts(prev => prev.map(a => a.id === id ? updated : a));
      if (selectedAlert?.id === id) setSelectedAlert(updated);
      toast.success("Alert acknowledged");
    } catch {
      toast.error("Failed to acknowledge alert");
    }
  };

  const handleResolveConfirm = async (notes: string) => {
    if (!resolveTarget || !token) return;
    try {
      const updated = await crisisApi.resolve(resolveTarget.id, notes || undefined, token);
      setAlerts(prev => prev.map(a => a.id === resolveTarget.id ? updated : a));
      if (selectedAlert?.id === resolveTarget.id) setSelectedAlert(updated);
      toast.success("Alert resolved");
    } catch {
      toast.error("Failed to resolve alert");
    } finally {
      setResolveTarget(null);
    }
  };

  const activeCount   = filtered.filter(a => a.status === "active").length;
  const ackCount      = filtered.filter(a => a.status === "acknowledged").length;
  const resolvedCount = filtered.filter(a => a.status === "resolved").length;

  return (
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: "Inter, sans-serif" }}>
      <AnimatedGradientBg />

      <div style={{ position: "relative", zIndex: 1, padding: "24px 28px 60px" }}>

        {/* ── Critical banner ── */}
        <AnimatePresence>
          {hasCriticalActive && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden", marginBottom: 22 }}
            >
              <motion.div
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 4, repeat: Infinity }}
                style={{
                  borderRadius: 14, padding: "14px 20px",
                  background: "linear-gradient(90deg, rgba(239,68,68,0.18), rgba(249,115,22,0.18), rgba(239,68,68,0.18))",
                  backgroundSize: "200% 100%",
                  border: "1px solid rgba(239,68,68,0.35)",
                  display: "flex", alignItems: "center", gap: 14,
                }}
              >
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "rgba(239,68,68,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}
                >
                  <Flame size={20} style={{ color: "#ef4444" }} />
                </motion.div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#fca5a5" }}>Critical Crisis Alert Active</div>
                  <div style={{ fontSize: 12.5, color: "#f87171", marginTop: 2 }}>
                    A critical spike has been detected for this profile. Immediate action recommended.
                  </div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#f87171" }}>LIVE</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38 }}
          style={{ marginBottom: 22 }}
        >
          <Link href={`/profiles`} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            color: "#606068", fontSize: 12.5, textDecoration: "none",
            fontWeight: 600, marginBottom: 14,
          }}
            onMouseEnter={e => (e.currentTarget.style.color = "#FF4500")}
            onMouseLeave={e => (e.currentTarget.style.color = "#606068")}
          >
            <ArrowLeft size={13} /> Back to Profiles
          </Link>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Flame size={20} style={{ color: "#ef4444" }} />
                </div>
                <div>
                  <h1 style={{
                    margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px",
                    background: "linear-gradient(90deg, #ef4444, #f97316, #FF4500)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  }}>
                    Crisis Alerts
                  </h1>
                  {profile && (
                    <div style={{ fontSize: 12, color: "#606068", marginTop: 2 }}>
                      {profile.name} · {filtered.length} alert{filtered.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <motion.button
                onClick={load}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "9px 16px", borderRadius: 11,
                  background: "#161618", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#808088", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <RefreshCw size={13} /> Refresh
              </motion.button>
              <motion.button
                onClick={handleTrigger}
                disabled={triggering}
                whileHover={{ boxShadow: "0 0 18px rgba(239,68,68,0.3)" }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "9px 18px", borderRadius: 11,
                  background: triggering ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "#f87171", fontSize: 13, fontWeight: 600,
                  cursor: triggering ? "not-allowed" : "pointer", fontFamily: "inherit",
                  opacity: triggering ? 0.6 : 1,
                }}
              >
                <Zap size={13} /> {triggering ? "Detecting…" : "Run Detection"}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ── Stats ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.06 }}
          style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}
        >
          <StatChip icon={Flame}        label="Active"       value={activeCount}    color="#ef4444" />
          <StatChip icon={Clock}        label="Acknowledged" value={ackCount}        color="#eab308" />
          <StatChip icon={CheckCircle}  label="Resolved"     value={resolvedCount}   color="#22c55e" />
          <StatChip icon={Shield}       label="Total"        value={filtered.length} color="#7c3aed" />
        </motion.div>

        {/* ── Filters ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.1 }}
          style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap", alignItems: "center" }}
        >
          <div style={{
            display: "flex", gap: 3,
            background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 11, padding: 3,
          }}>
            {SEV_OPTS.map(opt => (
              <motion.button
                key={opt.value}
                onClick={() => setSevFilter(opt.value)}
                whileHover={sevFilter !== opt.value ? { background: "rgba(255,255,255,0.04)" } : {}}
                style={{
                  padding: "6px 13px", borderRadius: 8, border: "none",
                  background: sevFilter === opt.value ? (opt.value ? getSevConfig(opt.value).bg : "rgba(255,69,0,0.12)") : "transparent",
                  color: sevFilter === opt.value ? (opt.value ? getSevConfig(opt.value).color : "#FF6534") : "#808088",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                }}
              >{opt.label}</motion.button>
            ))}
          </div>
          <div style={{
            display: "flex", gap: 3,
            background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 11, padding: 3,
          }}>
            {STATUS_OPTS.map(opt => (
              <motion.button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                whileHover={statusFilter !== opt.value ? { background: "rgba(255,255,255,0.04)" } : {}}
                style={{
                  padding: "6px 13px", borderRadius: 8, border: "none",
                  background: statusFilter === opt.value ? (opt.value ? getStatusConfig(opt.value).bg : "rgba(255,69,0,0.12)") : "transparent",
                  color: statusFilter === opt.value ? (opt.value ? getStatusConfig(opt.value).color : "#FF6534") : "#808088",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                }}
              >{opt.label}</motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Alert grid ── */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180 }}>
            <RefreshCw size={22} style={{ color: "#ef4444", animation: "spin 1s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: "center", padding: "80px 0", color: "#606068" }}
          >
            <Shield size={44} style={{ margin: "0 auto 16px", opacity: 0.2 }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: "#a0a0a8" }}>No crisis alerts</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              {sevFilter || statusFilter ? "Try adjusting filters" : "All clear for this profile"}
            </div>
          </motion.div>
        ) : (
          <motion.div layout style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 14, marginBottom: 36,
          }}>
            <AnimatePresence mode="popLayout">
              {filtered.map((alert, i) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  index={i}
                  onClick={() => setSelectedAlert(alert)}
                  onAcknowledge={handleAcknowledge}
                  onResolve={setResolveTarget}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Crisis history calendar ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
        >
          <CrisisHeatmap />
        </motion.div>
      </div>

      {/* ── Detail drawer ── */}
      <AlertDrawer
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onAcknowledge={handleAcknowledge}
        onResolve={setResolveTarget}
      />

      {/* ── Resolve modal ── */}
      <AnimatePresence>
        {resolveTarget && (
          <ResolveModal
            alert={resolveTarget}
            onClose={() => setResolveTarget(null)}
            onConfirm={handleResolveConfirm}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #2a2a2d; border-radius: 99px; }
      `}</style>
    </div>
  );
}
