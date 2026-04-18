"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, RefreshCw, Copy, Trash2,
  Clock, FileText, Hash, Globe, Zap,
  MoreHorizontal, CheckCircle2, AlertCircle, ExternalLink,
} from "lucide-react";
import type { Profile } from "@/lib/api/profiles";

interface Props {
  profile: Profile;
  index: number;
  onActivate:   (id: number) => Promise<void>;
  onDeactivate: (id: number) => Promise<void>;
  onRefresh:    (id: number) => Promise<void>;
  onClone:      (id: number) => Promise<void>;
  onDelete:     (id: number) => void;
}

function timeAgo(iso: string | null | undefined) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const AI_FEATURES = [
  { key: "enable_sentiment",         label: "Sentiment" },
  { key: "enable_intent",            label: "Intent" },
  { key: "enable_pain_detection",    label: "Pain" },
  { key: "enable_entity_extraction", label: "Entities" },
  { key: "enable_topic_extraction",  label: "Topics" },
];

export function ProfileCard({ profile, index, onActivate, onDeactivate, onRefresh, onClone, onDelete }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } finally { setBusy(null); }
  };

  const analysisPct = profile.total_posts_fetched > 0
    ? Math.round((profile.total_posts_analyzed / profile.total_posts_fetched) * 100)
    : 0;

  const enabledFeatures = AI_FEATURES.filter(f => profile[f.key as keyof Profile]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.07 }}
      whileHover={{ y: -3, boxShadow: profile.is_active
        ? "0 8px 40px rgba(255,69,0,0.12), 0 0 0 1px rgba(255,69,0,0.15)"
        : "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)"
      }}
      style={{
        background: "#161618",
        border: `1px solid ${profile.is_active ? "rgba(255,69,0,0.18)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 18, padding: "22px",
        display: "flex", flexDirection: "column", gap: 0,
        position: "relative", cursor: "default",
        transition: "box-shadow 0.25s, border-color 0.25s",
      }}
    >
      {/* Active glow top bar */}
      {profile.is_active && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2, borderRadius: "18px 18px 0 0",
          background: "linear-gradient(90deg, #FF4500, #ff8c69, #FF4500)",
        }} />
      )}

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Status badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <motion.div
              animate={profile.is_active ? { scale: [1, 1.3, 1], opacity: [1, 0.5, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: profile.is_active ? "#22c55e" : "#606068",
                boxShadow: profile.is_active ? "0 0 8px rgba(34,197,94,0.7)" : "none",
              }}
            />
            <span style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: "0.5px",
              color: profile.is_active ? "#22c55e" : "#606068",
              textTransform: "uppercase",
            }}>
              {profile.is_active ? "Active" : "Paused"}
            </span>
          </div>

          <div style={{ fontSize: 15.5, fontWeight: 700, color: "#f0f0f0", marginBottom: 4, wordBreak: "break-word" }}>
            {profile.name}
          </div>
          {profile.description && (
            <div style={{ fontSize: 12, color: "#808088", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {profile.description}
            </div>
          )}
        </div>

        {/* Menu button */}
        <div style={{ position: "relative", marginLeft: 10, flexShrink: 0 }}>
          <motion.button
            onClick={() => setMenuOpen(v => !v)}
            whileHover={{ background: "rgba(255,255,255,0.08)" }}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: "transparent", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#606068",
            }}
          >
            <MoreHorizontal size={16} />
          </motion.button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -6 }}
                transition={{ duration: 0.15 }}
                onMouseLeave={() => setMenuOpen(false)}
                style={{
                  position: "absolute", top: 34, right: 0, zIndex: 50,
                  background: "#1c1c1f", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12, padding: 6, minWidth: 150,
                  boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                }}
              >
                {[
                  { icon: Copy,  label: "Clone",  action: () => run("clone", () => onClone(profile.id)), color: "#a0a0a8" },
                  { icon: Trash2, label: "Delete", action: () => { setMenuOpen(false); onDelete(profile.id); }, color: "#ef4444" },
                ].map(({ icon: Icon, label, action, color }) => (
                  <button
                    key={label}
                    onClick={action}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 9,
                      padding: "8px 12px", borderRadius: 8, background: "none",
                      border: "none", color, fontSize: 13, fontWeight: 500,
                      cursor: "pointer", fontFamily: "Inter, sans-serif",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Subreddits ── */}
      {(profile.subreddits?.length ?? 0) > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
          {profile.subreddits!.slice(0, 4).map(s => (
            <div key={s} style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 6,
              background: "rgba(255,69,0,0.1)", border: "1px solid rgba(255,69,0,0.18)",
              fontSize: 11, fontWeight: 600, color: "#FF6534",
            }}>
              <Globe size={9} />
              r/{s}
            </div>
          ))}
          {(profile.subreddits?.length ?? 0) > 4 && (
            <div style={{
              padding: "3px 8px", borderRadius: 6,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 11, color: "#606068",
            }}>
              +{profile.subreddits!.length - 4} more
            </div>
          )}
        </div>
      )}

      {/* ── Stats row ── */}
      <div style={{
        display: "flex", gap: 0,
        border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden",
        marginBottom: 14,
      }}>
        {[
          { icon: FileText, label: "Fetched",  value: profile.total_posts_fetched.toLocaleString() },
          { icon: CheckCircle2, label: "Analyzed", value: profile.total_posts_analyzed.toLocaleString() },
          { icon: Clock, label: "Last fetch", value: timeAgo(profile.last_fetch_at) },
        ].map(({ icon: Icon, label, value }, i) => (
          <div key={label} style={{
            flex: 1, padding: "10px 8px", textAlign: "center",
            borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 3 }}>
              <Icon size={11} style={{ color: "#606068" }} />
              <span style={{ fontSize: 9.5, color: "#606068", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0e8" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Analysis progress bar ── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: "#606068" }}>Analysis coverage</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: analysisPct > 80 ? "#22c55e" : analysisPct > 40 ? "#eab308" : "#a0a0a8" }}>
            {analysisPct}%
          </span>
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${analysisPct}%` }}
            transition={{ duration: 0.8, delay: index * 0.07 + 0.3, ease: "easeOut" }}
            style={{
              height: "100%", borderRadius: 99,
              background: analysisPct > 80
                ? "linear-gradient(90deg,#22c55e,#4ade80)"
                : analysisPct > 40
                ? "linear-gradient(90deg,#eab308,#fbbf24)"
                : "linear-gradient(90deg,#FF4500,#ff8c69)",
            }}
          />
        </div>
      </div>

      {/* ── AI features ── */}
      {enabledFeatures.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 16 }}>
          {enabledFeatures.map(f => (
            <div key={f.key} style={{
              display: "flex", alignItems: "center", gap: 3,
              padding: "2px 7px", borderRadius: 5,
              background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)",
              fontSize: 10.5, color: "#a070f0", fontWeight: 600,
            }}>
              <Zap size={8} />
              {f.label}
            </div>
          ))}
        </div>
      )}

      {/* ── Action buttons ── */}
      <div style={{ display: "flex", gap: 7, marginTop: "auto" }}>
        {/* Toggle active */}
        <motion.button
          onClick={() => run("toggle", () => profile.is_active ? onDeactivate(profile.id) : onActivate(profile.id))}
          disabled={busy === "toggle"}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            flex: 1, height: 36, borderRadius: 10,
            background: profile.is_active ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
            border: `1px solid ${profile.is_active ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
            color: profile.is_active ? "#f87171" : "#4ade80",
            fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            opacity: busy === "toggle" ? 0.6 : 1,
          }}
        >
          {profile.is_active ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Activate</>}
        </motion.button>

        {/* Refresh */}
        <motion.button
          onClick={() => run("refresh", () => onRefresh(profile.id))}
          disabled={busy === "refresh" || !profile.is_active}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Refresh posts"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "#808088", cursor: profile.is_active ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: (!profile.is_active || busy === "refresh") ? 0.4 : 1,
          }}
        >
          <RefreshCw size={14} style={{ animation: busy === "refresh" ? "spin 1s linear infinite" : "none" }} />
        </motion.button>

        {/* Keywords count chip */}
        {(profile.keywords?.length ?? 0) > 0 && (
          <div style={{
            height: 36, padding: "0 12px", borderRadius: 10,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", gap: 5, color: "#808088", fontSize: 12,
          }}>
            <Hash size={11} />
            {profile.keywords!.length}
          </div>
        )}

        {/* View Posts link */}
        <Link
          href={`/profiles/${profile.id}/posts`}
          title="View posts feed"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(255,69,0,0.07)", border: "1px solid rgba(255,69,0,0.18)",
            color: "#FF6534", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            textDecoration: "none", flexShrink: 0,
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,69,0,0.15)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,69,0,0.07)"; }}
        >
          <ExternalLink size={13} />
        </Link>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}
