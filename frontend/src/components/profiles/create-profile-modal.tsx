"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Hash, Globe, Loader2, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { profilesApi, type ProfileCreate } from "@/lib/api/profiles";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const INPUT: React.CSSProperties = {
  width: "100%", height: 44, background: "#1c1c1f",
  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
  color: "#f5f5f5", fontSize: 14, fontFamily: "Inter, sans-serif",
  padding: "0 14px", outline: "none", boxSizing: "border-box",
};
const LABEL: React.CSSProperties = {
  display: "block", fontSize: 12.5, fontWeight: 600, color: "#c0c0c8", marginBottom: 6,
};
const SECTION: React.CSSProperties = { marginBottom: 20 };

function TagInput({ tags, onChange, placeholder, color = "#FF4500" }: {
  tags: string[]; onChange: (t: string[]) => void; placeholder: string; color?: string;
}) {
  const [val, setVal] = useState("");
  const add = () => {
    const trimmed = val.trim().replace(/^r\//, "");
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
    setVal("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
    if (e.key === "Backspace" && !val && tags.length) onChange(tags.slice(0, -1));
  };
  return (
    <div style={{
      minHeight: 44, background: "#1c1c1f",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
      padding: "6px 10px", display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center",
      cursor: "text",
    }}
      onClick={e => (e.currentTarget.querySelector("input") as HTMLInputElement)?.focus()}
    >
      {tags.map(t => (
        <div key={t} style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "2px 8px", borderRadius: 6,
          background: `${color}18`, border: `1px solid ${color}28`,
          fontSize: 12, fontWeight: 600, color,
        }}>
          {t}
          <button onClick={() => onChange(tags.filter(x => x !== t))}
            style={{ background: "none", border: "none", cursor: "pointer", color, padding: 0, lineHeight: 1, display: "flex" }}>
            <X size={10} />
          </button>
        </div>
      ))}
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={onKey}
        onBlur={add}
        placeholder={tags.length === 0 ? placeholder : ""}
        style={{
          flex: 1, minWidth: 80, background: "none", border: "none",
          outline: "none", color: "#f0f0f0", fontSize: 13, fontFamily: "Inter, sans-serif",
        }}
      />
    </div>
  );
}

const AI_TOGGLES = [
  { key: "enable_sentiment",         label: "Sentiment Analysis" },
  { key: "enable_intent",            label: "Intent Detection" },
  { key: "enable_pain_detection",    label: "Pain Point Mining" },
  { key: "enable_entity_extraction", label: "Entity Extraction" },
  { key: "enable_topic_extraction",  label: "Topic Extraction" },
];

export function CreateProfileModal({ open, onClose, onCreated }: Props) {
  const { token } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [subreddits, setSubreddits] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [pollFreq, setPollFreq] = useState(30);
  const [aiFeatures, setAiFeatures] = useState({
    enable_sentiment: true,
    enable_intent: true,
    enable_pain_detection: true,
    enable_entity_extraction: false,
    enable_topic_extraction: true,
  });

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "rgba(255,69,0,0.5)";
    e.currentTarget.style.boxShadow  = "0 0 0 3px rgba(255,69,0,0.1)";
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
    e.currentTarget.style.boxShadow   = "none";
  };

  const reset = () => {
    setName(""); setDesc(""); setSubreddits([]); setKeywords([]);
    setPollFreq(30); setShowAdvanced(false);
    setAiFeatures({ enable_sentiment: true, enable_intent: true, enable_pain_detection: true, enable_entity_extraction: false, enable_topic_extraction: true });
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Profile name is required"); return; }
    if (!token) { toast.error("Not authenticated"); return; }
    setBusy(true);
    try {
      const body: ProfileCreate = {
        name: name.trim(),
        description: desc.trim() || undefined,
        subreddits: subreddits.length > 0 ? subreddits : undefined,
        keywords: keywords.length > 0 ? keywords : undefined,
        polling_frequency_minutes: pollFreq,
        ...aiFeatures,
      };
      await profilesApi.create(body, token);
      toast.success(`Profile "${name}" created!`);
      reset();
      onCreated();
    } catch (e) {
      toast.error("Failed to create profile", { description: e instanceof Error ? e.message : "Try again" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{
              position: "fixed", top: "50%", left: "50%", zIndex: 101,
              transform: "translate(-50%, -50%)",
              width: "min(560px, calc(100vw - 40px))",
              maxHeight: "90vh", overflowY: "auto",
              background: "#161618", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 22, padding: 32,
              boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,69,0,0.08)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 26 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f0f0f0", letterSpacing: "-0.4px" }}>
                  Create Profile
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#606068" }}>
                  Define what to monitor on Reddit
                </p>
              </div>
              <motion.button onClick={handleClose} whileHover={{ background: "rgba(255,255,255,0.08)" }}
                style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#808088" }}>
                <X size={15} />
              </motion.button>
            </div>

            {/* Profile name */}
            <div style={SECTION}>
              <label style={LABEL}>Profile name <span style={{ color: "#FF4500" }}>*</span></label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. SaaS Brand Monitor"
                style={{ ...INPUT, transition: "border-color 0.2s, box-shadow 0.2s" }}
                onFocus={focusStyle} onBlur={blurStyle}
              />
            </div>

            {/* Description */}
            <div style={SECTION}>
              <label style={LABEL}>Description <span style={{ color: "#606068" }}>(optional)</span></label>
              <textarea
                value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="What are you monitoring for?"
                rows={2}
                style={{ ...INPUT, height: "auto", padding: "10px 14px", resize: "vertical", lineHeight: 1.5 }}
                onFocus={focusStyle} onBlur={blurStyle}
              />
            </div>

            {/* Subreddits */}
            <div style={SECTION}>
              <label style={{ ...LABEL, display: "flex", alignItems: "center", gap: 5 }}>
                <Globe size={12} style={{ color: "#FF4500" }} /> Subreddits
              </label>
              <TagInput tags={subreddits} onChange={setSubreddits} placeholder="Type subreddit + Enter (e.g. saas, startups)" color="#FF4500" />
              <div style={{ fontSize: 11, color: "#606068", marginTop: 5 }}>Press Enter or comma to add each subreddit</div>
            </div>

            {/* Keywords */}
            <div style={SECTION}>
              <label style={{ ...LABEL, display: "flex", alignItems: "center", gap: 5 }}>
                <Hash size={12} style={{ color: "#7c3aed" }} /> Keywords
              </label>
              <TagInput tags={keywords} onChange={setKeywords} placeholder="Type keyword + Enter" color="#7c3aed" />
            </div>

            {/* AI Features */}
            <div style={SECTION}>
              <label style={{ ...LABEL, display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
                <Zap size={12} style={{ color: "#a855f7" }} /> AI Analysis Features
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {AI_TOGGLES.map(({ key, label }) => {
                  const on = aiFeatures[key as keyof typeof aiFeatures];
                  return (
                    <motion.button
                      key={key}
                      onClick={() => setAiFeatures(prev => ({ ...prev, [key]: !on }))}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "9px 12px", borderRadius: 10, cursor: "pointer",
                        background: on ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${on ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.07)"}`,
                        fontSize: 12.5, fontWeight: 600,
                        color: on ? "#a070f0" : "#606068",
                        fontFamily: "inherit",
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        background: on ? "#7c3aed" : "rgba(255,255,255,0.08)",
                        border: `1px solid ${on ? "#7c3aed" : "rgba(255,255,255,0.1)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {on && <div style={{ width: 8, height: 8, borderRadius: 2, background: "#fff" }} />}
                      </div>
                      {label}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Advanced toggle */}
            <button
              onClick={() => setShowAdvanced(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
                color: "#808088", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit", marginBottom: showAdvanced ? 16 : 20, padding: 0,
              }}
            >
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Advanced settings
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden", marginBottom: 20 }}
                >
                  <label style={LABEL}>Polling frequency (minutes)</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[5, 15, 30, 60, 120].map(v => (
                      <motion.button
                        key={v}
                        onClick={() => setPollFreq(v)}
                        whileHover={{ scale: 1.05 }}
                        style={{
                          flex: 1, height: 36, borderRadius: 9, cursor: "pointer",
                          background: pollFreq === v ? "rgba(255,69,0,0.15)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${pollFreq === v ? "rgba(255,69,0,0.35)" : "rgba(255,255,255,0.08)"}`,
                          color: pollFreq === v ? "#FF4500" : "#808088",
                          fontSize: 12.5, fontWeight: 700, fontFamily: "inherit",
                        }}
                      >
                        {v}m
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <motion.button
                onClick={handleClose}
                whileHover={{ background: "rgba(255,255,255,0.06)" }}
                style={{
                  flex: 1, height: 46, borderRadius: 12,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#a0a0a8", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleSubmit}
                disabled={busy || !name.trim()}
                whileHover={!busy && name.trim() ? { scale: 1.02, boxShadow: "0 0 36px rgba(255,69,0,0.55)" } : {}}
                whileTap={{ scale: 0.98 }}
                style={{
                  flex: 2, height: 46, borderRadius: 12,
                  background: "#FF4500", color: "#fff",
                  fontSize: 14, fontWeight: 700, cursor: busy || !name.trim() ? "not-allowed" : "pointer",
                  border: "none", fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: "0 0 24px rgba(255,69,0,0.4)",
                  opacity: !name.trim() ? 0.5 : 1,
                  position: "relative", overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(255,255,255,0.1),transparent)", pointerEvents: "none" }} />
                {busy ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : <><Plus size={16} /> Create Profile</>}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
