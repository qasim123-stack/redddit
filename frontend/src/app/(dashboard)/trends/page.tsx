"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Hash, ArrowUpRight, ArrowDownRight,
  RefreshCw, X, CheckCircle, Zap, BarChart2, Activity,
  SlidersHorizontal, ChevronRight,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store/auth-store";
import { trendsApi, type Trend } from "@/lib/api/trends";
import { AnimatedGradientBg } from "@/components/dashboard/animated-bg";

// ── Config helpers ─────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  rising:         { color: "#22c55e",  bg: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.3)",   label: "Rising",         icon: TrendingUp },
  falling:        { color: "#ef4444",  bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.3)",   label: "Falling",        icon: TrendingDown },
  keyword_rising: { color: "#a855f7",  bg: "rgba(168,85,247,0.12)",  border: "rgba(168,85,247,0.3)",  label: "Keyword Rising", icon: Hash },
  topic:          { color: "#60a5fa",  bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)",  label: "Topic",          icon: BarChart2 },
} as const;

const SEV_CONFIG = {
  high:   { color: "#f97316", bg: "rgba(249,115,22,0.12)",  border: "rgba(249,115,22,0.3)",  label: "High" },
  medium: { color: "#eab308", bg: "rgba(234,179,8,0.12)",   border: "rgba(234,179,8,0.3)",   label: "Medium" },
  low:    { color: "#22c55e", bg: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.3)",   label: "Low" },
} as const;

function getTypeConfig(t: string) {
  return TYPE_CONFIG[t as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.topic;
}
function getSevConfig(s: string) {
  return SEV_CONFIG[s as keyof typeof SEV_CONFIG] ?? SEV_CONFIG.low;
}


// ── Build sparkline data ───────────────────────────────────────────────────────
function buildSparkline(trend: Trend) {
  const prev = trend.previous_count;
  const curr = trend.current_count;
  return Array.from({ length: 8 }, (_, i) => {
    const progress = i / 7;
    const value = i < 5
      ? Math.round(prev * (0.9 + Math.random() * 0.2))
      : Math.round(prev + (curr - prev) * ((i - 4) / 3) * (0.9 + Math.random() * 0.2));
    return { t: `${i * 3}h`, value: Math.max(0, value) };
  });
}

// ── Resolve modal ─────────────────────────────────────────────────────────────
function ResolveModal({ trend, onClose, onConfirm }: {
  trend: Trend; onClose: () => void; onConfirm: () => void;
}) {
  const cfg = getTypeConfig(trend.trend_type);
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
          width: "100%", maxWidth: 440,
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
            <div style={{ fontSize: 16, fontWeight: 700, color: "#f0f0f0" }}>Dismiss Trend</div>
            <div style={{ fontSize: 12, color: "#606068", marginTop: 2 }}>Remove from active trends list</div>
          </div>
          <button onClick={onClose} style={{
            marginLeft: "auto", background: "none", border: "none",
            color: "#606068", cursor: "pointer", padding: 4,
          }}>
            <X size={18} />
          </button>
        </div>

        <div style={{
          background: "#1c1c1f", border: `1px solid ${cfg.border}`,
          borderRadius: 10, padding: "10px 14px", marginBottom: 20,
          fontSize: 13, color: "#a0a0a8",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ color: cfg.color, fontWeight: 700 }}>{trend.topic}</span>
          <span style={{
            padding: "2px 8px", borderRadius: 20, fontSize: 11,
            background: cfg.bg, color: cfg.color, fontWeight: 700,
          }}>{cfg.label}</span>
        </div>

        <div style={{ fontSize: 13, color: "#808088", lineHeight: 1.6, marginBottom: 22 }}>
          This will mark the trend as resolved and remove it from your active monitoring dashboard.
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <motion.button
            onClick={onClose}
            whileHover={{ background: "rgba(255,255,255,0.05)" }}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10,
              background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
              color: "#808088", fontSize: 13.5, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >Cancel</motion.button>
          <motion.button
            onClick={onConfirm}
            whileHover={{ boxShadow: "0 0 20px rgba(34,197,94,0.35)" }}
            whileTap={{ scale: 0.97 }}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10,
              background: "linear-gradient(135deg, #16a34a, #22c55e)",
              border: "none", color: "#fff",
              fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >Dismiss</motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Detail drawer ─────────────────────────────────────────────────────────────
function TrendDrawer({ trend, onClose, onDismiss }: {
  trend: Trend | null; onClose: () => void; onDismiss: (t: Trend) => void;
}) {
  const sparkData = useMemo(() => trend ? buildSparkline(trend) : [], [trend]);
  const cfg = trend ? getTypeConfig(trend.trend_type) : getTypeConfig("rising");
  const sev = trend?.severity ? getSevConfig(trend.severity) : null;
  const TypeIcon = cfg.icon;
  const isRising = trend?.trend_type !== "falling";
  const growthAbs = Math.abs(Number(trend?.growth_rate ?? 0));

  const total = (trend?.positive_count ?? 0) + (trend?.neutral_count ?? 0) + (trend?.negative_count ?? 0);
  const posP = total ? Math.round(((trend?.positive_count ?? 0) / total) * 100) : 0;
  const neuP = total ? Math.round(((trend?.neutral_count  ?? 0) / total) * 100) : 0;
  const negP = total ? Math.round(((trend?.negative_count ?? 0) / total) * 100) : 0;

  return (
    <AnimatePresence>
      {trend && (
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
              background: `linear-gradient(135deg, ${cfg.bg}, transparent)`,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 13, flexShrink: 0,
                background: cfg.bg, border: `1px solid ${cfg.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <TypeIcon size={22} style={{ color: cfg.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f0f0", lineHeight: 1.35 }}>
                  {trend.topic}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 20,
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                    color: cfg.color, fontSize: 11, fontWeight: 700,
                  }}>{cfg.label}</span>
                  {sev && (
                    <span style={{
                      padding: "3px 10px", borderRadius: 20,
                      background: sev.bg, border: `1px solid ${sev.border}`,
                      color: sev.color, fontSize: 11, fontWeight: 700,
                    }}>{sev.label} Severity</span>
                  )}
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
              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[
                  { label: "Growth Rate", value: `${isRising ? "+" : ""}${Number(trend.growth_rate ?? 0).toFixed(1)}%`, color: cfg.color },
                  { label: "Current Count", value: trend.current_count, color: "#60a5fa" },
                  { label: "Previous Count", value: trend.previous_count, color: "#a0a0a8" },
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

              {/* Sparkline */}
              <div style={{
                background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14, padding: "16px 16px 8px", marginBottom: 20,
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#a0a0a8", marginBottom: 12 }}>
                  Volume Timeline
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={sparkData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={cfg.color} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={cfg.color} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#606068" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#606068" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#1c1c1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: "#a0a0a8" }}
                    />
                    <Area type="monotone" dataKey="value" stroke={cfg.color} strokeWidth={2}
                      fill="url(#dTrendGrad)" name="Mentions" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Sentiment breakdown */}
              {total > 0 && (
                <div style={{
                  background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 14, padding: "16px", marginBottom: 20,
                }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "#a0a0a8", marginBottom: 14 }}>
                    Sentiment Breakdown
                  </div>
                  {/* Bar */}
                  <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
                    {posP > 0 && <div style={{ width: `${posP}%`, background: "#22c55e" }} />}
                    {neuP > 0 && <div style={{ width: `${neuP}%`, background: "#606068" }} />}
                    {negP > 0 && <div style={{ width: `${negP}%`, background: "#ef4444" }} />}
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    {[
                      { label: "Positive", pct: posP, count: trend.positive_count, color: "#22c55e" },
                      { label: "Neutral",  pct: neuP, count: trend.neutral_count,  color: "#606068" },
                      { label: "Negative", pct: negP, count: trend.negative_count, color: "#ef4444" },
                    ].map(({ label, pct, count, color }) => (
                      <div key={label} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color }}>{pct}%</div>
                        <div style={{ fontSize: 10, color: "#606068", marginTop: 2 }}>{label} ({count})</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Period */}
              <div style={{ fontSize: 11.5, color: "#505058" }}>
                <div>Period: {new Date(trend.period_start).toLocaleDateString()} – {new Date(trend.period_end).toLocaleDateString()}</div>
                <div style={{ marginTop: 3 }}>Detected: {new Date(trend.created_at).toLocaleString()}</div>
              </div>
            </div>

            {/* Actions */}
            {trend.status !== "resolved" && (
              <div style={{ padding: "16px 24px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <motion.button
                  onClick={() => onDismiss(trend)}
                  whileHover={{ boxShadow: "0 0 20px rgba(34,197,94,0.3)" }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    padding: "11px 0", borderRadius: 11,
                    background: "linear-gradient(135deg, #15803d, #16a34a)",
                    border: "none", color: "#fff", fontSize: 13.5, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <CheckCircle size={14} /> Dismiss Trend
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Trend card ─────────────────────────────────────────────────────────────────
function TrendCard({ trend, index, isTopRising, onClick, onDismiss }: {
  trend: Trend; index: number; isTopRising: boolean;
  onClick: () => void; onDismiss: (t: Trend) => void;
}) {
  const cfg = getTypeConfig(trend.trend_type);
  const sev = trend.severity ? getSevConfig(trend.severity) : null;
  const TypeIcon = cfg.icon;
  const isRising = trend.trend_type !== "falling";
  const sparkData = useMemo(() => buildSparkline(trend), [trend]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, delay: index * 0.04 }}
      onClick={onClick}
      whileHover={{ borderColor: cfg.border, y: -2 }}
      style={{
        background: isTopRising
          ? `linear-gradient(135deg, ${cfg.bg}, #161618)`
          : "#161618",
        border: `1px solid ${isTopRising ? cfg.border : "rgba(255,255,255,0.07)"}`,
        borderRadius: 16, padding: "18px 20px",
        cursor: "pointer", position: "relative",
        transition: "border-color 0.15s, transform 0.15s",
        overflow: "hidden",
      }}
    >
      {isTopRising && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`,
        }} />
      )}

      {/* Row 1: icon + topic + badges */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: cfg.bg, border: `1px solid ${cfg.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <TypeIcon size={18} style={{ color: cfg.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: "#f0f0f0",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {trend.topic}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <span style={{
              padding: "2px 9px", borderRadius: 20, fontSize: 10.5, fontWeight: 700,
              background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
            }}>{cfg.label}</span>
            {sev && (
              <span style={{
                padding: "2px 9px", borderRadius: 20, fontSize: 10.5, fontWeight: 700,
                background: sev.bg, border: `1px solid ${sev.border}`, color: sev.color,
              }}>{sev.label}</span>
            )}
            {isTopRising && (
              <span style={{
                padding: "2px 9px", borderRadius: 20, fontSize: 10.5, fontWeight: 700,
                background: "rgba(255,69,0,0.12)", border: "1px solid rgba(255,69,0,0.3)",
                color: "#FF4500",
              }}>Top Rising</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {isRising ? <ArrowUpRight size={16} style={{ color: cfg.color }} /> : <ArrowDownRight size={16} style={{ color: cfg.color }} />}
          <span style={{ fontSize: 16, fontWeight: 800, color: cfg.color }}>
            {isRising ? "+" : ""}{Number(trend.growth_rate ?? 0).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Sparkline */}
      <div style={{ height: 50, marginBottom: 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
            <defs>
              <linearGradient id={`spark-${trend.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={cfg.color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke={cfg.color} strokeWidth={1.5}
              fill={`url(#spark-${trend.id})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#f0f0f0" }}>{trend.current_count}</div>
            <div style={{ fontSize: 10, color: "#606068" }}>Current</div>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#a0a0a8" }}>{trend.previous_count}</div>
            <div style={{ fontSize: 10, color: "#606068" }}>Previous</div>
          </div>
          {(trend.growth_absolute !== undefined && trend.growth_absolute !== null) && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: cfg.color }}>
                {Number(trend.growth_absolute) > 0 ? "+" : ""}{trend.growth_absolute}
              </div>
              <div style={{ fontSize: 10, color: "#606068" }}>Change</div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
          {trend.status !== "resolved" && (
            <motion.button
              onClick={() => onDismiss(trend)}
              whileHover={{ background: "rgba(34,197,94,0.14)" }}
              whileTap={{ scale: 0.96 }}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 13px", borderRadius: 8,
                background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)",
                color: "#4ade80", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <CheckCircle size={11} /> Dismiss
            </motion.button>
          )}
          <ChevronRight size={16} style={{ color: "#606068", alignSelf: "center" }} />
        </div>
      </div>
    </motion.div>
  );
}

// ── Filter pill ───────────────────────────────────────────────────────────────
function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ borderColor: active ? "rgba(255,69,0,0.5)" : "rgba(255,255,255,0.15)" }}
      style={{
        padding: "6px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: active ? 700 : 500,
        background: active ? "rgba(255,69,0,0.12)" : "transparent",
        border: `1px solid ${active ? "rgba(255,69,0,0.3)" : "rgba(255,255,255,0.09)"}`,
        color: active ? "#FF4500" : "#808088",
        cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
      }}
    >{label}</motion.button>
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

// ── Filter options ────────────────────────────────────────────────────────────
const TYPE_OPTS = [{ l: "All", v: "" }, { l: "Rising", v: "rising" }, { l: "Falling", v: "falling" }, { l: "Keywords", v: "keyword_rising" }];
const SEV_OPTS  = [{ l: "All", v: "" }, { l: "High", v: "high" }, { l: "Medium", v: "medium" }, { l: "Low", v: "low" }];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TrendsPage() {
  const { token } = useAuthStore();

  const [trends, setTrends]           = useState<Trend[]>([]);
  const [loading, setLoading]         = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [sevFilter, setSevFilter]   = useState("");
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);
  const [resolveTarget, setResolveTarget] = useState<Trend | null>(null);
  const [triggering, setTriggering]   = useState(false);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await trendsApi.listAll({
        trend_type: typeFilter || undefined,
        status: "active",
        severity: sevFilter || undefined,
      }, token);
      setTrends(data);
    } catch {
      toast.error("Failed to load trends");
      setTrends([]);
    } finally {
      setLoading(false);
    }
  }, [token, typeFilter, sevFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => trends, [trends]);

  // Top 5 rising by growth rate
  const topRisingIds = useMemo(() => {
    return filtered
      .filter(t => t.trend_type !== "falling")
      .sort((a, b) => Number(b.growth_rate ?? 0) - Number(a.growth_rate ?? 0))
      .slice(0, 5)
      .map(t => t.id);
  }, [filtered]);

  const risingCount  = filtered.filter(t => t.trend_type === "rising").length;
  const fallingCount = filtered.filter(t => t.trend_type === "falling").length;
  const kwCount      = filtered.filter(t => t.trend_type === "keyword_rising").length;
  const highSevCount = filtered.filter(t => t.severity === "high").length;

  const handleDismiss = async (trend: Trend) => {
    setResolveTarget(null);
    if (!token) return;
    try {
      await trendsApi.resolve(trend.id, token);
      setTrends(prev => prev.filter(t => t.id !== trend.id));
      if (selectedTrend?.id === trend.id) setSelectedTrend(null);
      toast.success("Trend dismissed");
    } catch {
      toast.error("Failed to dismiss trend");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0d0f",
      paddingLeft: 220,
      fontFamily: "Inter, -apple-system, sans-serif",
    }}>
      <AnimatedGradientBg />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 32px" }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14,
              background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))",
              border: "1px solid rgba(34,197,94,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 24px rgba(34,197,94,0.15)",
            }}>
              <TrendingUp size={22} style={{ color: "#22c55e" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f0f0f0", margin: 0, letterSpacing: "-0.4px" }}>
                Trends
              </h1>
              <p style={{ fontSize: 13, color: "#606068", margin: 0, marginTop: 2 }}>
                Emerging topics across all profiles
              </p>
            </div>
          </div>

          <motion.button
            onClick={load}
            whileHover={{ borderColor: "rgba(34,197,94,0.4)" }}
            whileTap={{ scale: 0.96 }}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "9px 18px", borderRadius: 11,
              background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
              color: "#4ade80", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </motion.button>
        </motion.div>

        {/* Stat chips */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}
        >
          <StatChip icon={TrendingUp}   label="Rising Topics"    value={risingCount}  color="#22c55e" />
          <StatChip icon={TrendingDown} label="Falling Topics"   value={fallingCount} color="#ef4444" />
          <StatChip icon={Hash}         label="Trending Keywords" value={kwCount}      color="#a855f7" />
          <StatChip icon={Activity}     label="High Severity"    value={highSevCount} color="#f97316" />
        </motion.div>

        {/* Top 5 Rising banner */}
        {topRisingIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.03))",
              border: "1px solid rgba(34,197,94,0.2)", borderRadius: 16,
              padding: "14px 20px", marginBottom: 24,
              display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <Zap size={15} style={{ color: "#22c55e" }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#22c55e" }}>Top 5 Rising Topics</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
              {filtered
                .filter(t => topRisingIds.includes(t.id))
                .slice(0, 5)
                .map((t, i) => (
                  <motion.button
                    key={t.id}
                    onClick={() => setSelectedTrend(t)}
                    whileHover={{ background: "rgba(34,197,94,0.2)" }}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "4px 11px", borderRadius: 20,
                      background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
                      color: "#4ade80", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    <span style={{ color: "#606068", fontSize: 10, fontWeight: 700 }}>#{i + 1}</span>
                    {t.topic}
                    <ArrowUpRight size={10} />
                  </motion.button>
                ))}
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12 }}
          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, flexWrap: "wrap" }}
        >
          <SlidersHorizontal size={14} style={{ color: "#606068", flexShrink: 0 }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TYPE_OPTS.map(o => (
              <Pill key={o.v} label={o.l} active={typeFilter === o.v} onClick={() => setTypeFilter(o.v)} />
            ))}
          </div>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.07)", flexShrink: 0, margin: "0 4px" }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SEV_OPTS.map(o => (
              <Pill key={o.v} label={o.l} active={sevFilter === o.v} onClick={() => setSevFilter(o.v)} />
            ))}
          </div>
        </motion.div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                height: 200, background: "#161618", borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.07)",
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              textAlign: "center", padding: "72px 24px",
              background: "#161618", borderRadius: 20, border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <TrendingUp size={40} style={{ color: "#303038", marginBottom: 14 }} />
            <div style={{ fontSize: 17, fontWeight: 700, color: "#505058", marginBottom: 6 }}>No trends found</div>
            <div style={{ fontSize: 13, color: "#404048" }}>
              Try adjusting filters or trigger detection on a profile
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
              {filtered.map((t, i) => (
                <TrendCard
                  key={t.id}
                  trend={t}
                  index={i}
                  isTopRising={topRisingIds.includes(t.id)}
                  onClick={() => setSelectedTrend(t)}
                  onDismiss={t2 => setResolveTarget(t2)}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Detail drawer */}
      <TrendDrawer
        trend={selectedTrend}
        onClose={() => setSelectedTrend(null)}
        onDismiss={t => { setSelectedTrend(null); setResolveTarget(t); }}
      />

      {/* Resolve modal */}
      <AnimatePresence>
        {resolveTarget && (
          <ResolveModal
            trend={resolveTarget}
            onClose={() => setResolveTarget(null)}
            onConfirm={() => handleDismiss(resolveTarget)}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
