"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Particles } from "@/components/magic/particles";
import { SnooIcon } from "@/components/icons/snoo";

/* ── Incoming post pool (cycles endlessly) ── */
const ALL_POSTS = [
  { id: 1,  sub: "r/SaaS",        subColor: "#FF6534", subBg: "rgba(255,69,0,0.12)",   title: "Our churn rate dropped 40% after adding this feature",    score: 2400, sentColor: "#4ade80", sentBg: "rgba(34,197,94,0.12)",   label: "● Positive" },
  { id: 2,  sub: "r/entrepreneur", subColor: "#a78bfa", subBg: "rgba(124,58,237,0.12)", title: "Nobody talks about how brutal year one of B2B sales is",  score: 891,  sentColor: "#f87171", sentBg: "rgba(239,68,68,0.12)",   label: "● Negative" },
  { id: 3,  sub: "r/startups",    subColor: "#4ade80", subBg: "rgba(34,197,94,0.1)",   title: "Raised seed round without a pitch deck. AMA.",            score: 1100, sentColor: "#facc15", sentBg: "rgba(234,179,8,0.1)",    label: "● Neutral"  },
  { id: 4,  sub: "r/technology",  subColor: "#60a5fa", subBg: "rgba(59,130,246,0.1)",  title: "⚡ Crisis: 3× spike in negative posts detected in r/SaaS", score: 3700, sentColor: "#f87171", sentBg: "rgba(239,68,68,0.22)",  label: "⚡ Crisis"  },
  { id: 5,  sub: "r/marketing",   subColor: "#f472b6", subBg: "rgba(244,114,182,0.1)", title: "Cold outreach is dead. Here's what's actually working now", score: 567,  sentColor: "#4ade80", sentBg: "rgba(34,197,94,0.12)",   label: "● Positive" },
  { id: 6,  sub: "r/growth",      subColor: "#34d399", subBg: "rgba(52,211,153,0.1)",  title: "We went from 0 to 10k users in 90 days — breakdown inside",score: 4200, sentColor: "#4ade80", sentBg: "rgba(34,197,94,0.15)",   label: "● Positive" },
  { id: 7,  sub: "r/SaaS",        subColor: "#FF6534", subBg: "rgba(255,69,0,0.12)",   title: "Competitor just slashed pricing by 50%. What do we do?",  score: 328,  sentColor: "#f87171", sentBg: "rgba(239,68,68,0.12)",   label: "● Negative" },
];

const AVATARS = [
  { l: "A", bg: "linear-gradient(135deg,#ff4500,#ff8c00)" },
  { l: "J", bg: "linear-gradient(135deg,#7c3aed,#3b82f6)" },
  { l: "M", bg: "linear-gradient(135deg,#22c55e,#0ea5e9)" },
  { l: "S", bg: "linear-gradient(135deg,#f43f5e,#ec4899)" },
  { l: "R", bg: "linear-gradient(135deg,#f59e0b,#ef4444)" },
];

type Post = typeof ALL_POSTS[0];

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export function AuthLeftPanel() {
  /* visible feed — start with first 3 */
  const [feed, setFeed] = useState<Post[]>(ALL_POSTS.slice(0, 3));
  const poolIdx = useRef(3); // next index to pull from ALL_POSTS

  /* live counter in header */
  const [postsPerHr, setPostsPerHr] = useState(147);

  /* animated "posts analyzed" big stat */
  const [analyzed, setAnalyzed] = useState(2_000_000);

  /* flash ring on new post arrival */
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    /* new post slides in every 1.6 s */
    const feedTimer = setInterval(() => {
      const next = ALL_POSTS[poolIdx.current % ALL_POSTS.length];
      poolIdx.current += 1;
      setFeed(prev => [next, ...prev.slice(0, 3)]);
      setFlash(true);
      setTimeout(() => setFlash(false), 400);
    }, 1600);

    /* counter ticks every 900 ms */
    const ctrTimer = setInterval(() => {
      setPostsPerHr(v => v + Math.floor(Math.random() * 4));
      setAnalyzed(v => v + Math.floor(Math.random() * 120 + 40));
    }, 900);

    return () => { clearInterval(feedTimer); clearInterval(ctrTimer); };
  }, []);

  const analyzedStr = analyzed >= 1_000_000
    ? `${(analyzed / 1_000_000).toFixed(2)}M+`
    : `${Math.round(analyzed / 1000)}k+`;

  return (
    <div style={{
      position: "relative", display: "flex", flexDirection: "column",
      width: "100%", height: "100%", minHeight: "100vh",
      background: "#0d0d0f", overflow: "hidden",
      fontFamily: "Inter, sans-serif",
    }}>
      <Particles count={55} />

      {/* Gradient orbs */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: -128, left: -80, width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,69,0,0.18) 0%,transparent 70%)", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: 60, right: -60, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,rgba(124,58,237,0.14) 0%,transparent 70%)", filter: "blur(80px)" }} />
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100%", padding: "36px 44px 36px" }}>

        {/* Logo */}
        <FadeUp delay={0}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,69,0,0.15)", border: "1px solid rgba(255,69,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SnooIcon style={{ width: 20, height: 20, fill: "#FF4500" }} />
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.3px", color: "#f0f0f0" }}>
              Redddit <span style={{ color: "#FF4500" }}>AI</span>
            </span>
          </div>
        </FadeUp>

        {/* Headline */}
        <FadeUp delay={0.08}>
          <div style={{ marginTop: 44 }}>
            <h1 style={{ fontSize: 48, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-2px", color: "#fff", margin: 0 }}>
              Turn Reddit<br />noise into{" "}
              <span style={{ background: "linear-gradient(90deg,#FF4500 0%,#ff8c69 45%,#7c3aed 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                signal
              </span>
            </h1>
            <p style={{ marginTop: 14, fontSize: 15.5, lineHeight: 1.7, color: "#b0b0b8", maxWidth: 380 }}>
              Monitor any subreddit, detect brand crises before they explode, and surface emerging trends — powered by GPT-4o-mini.
            </p>
          </div>
        </FadeUp>

        {/* Live Feed Card */}
        <FadeUp delay={0.16}>
          <motion.div
            animate={{ boxShadow: flash
              ? "0 0 0 2px rgba(255,69,0,0.5), 0 20px 60px rgba(0,0,0,0.5)"
              : "0 0 0 1px rgba(255,69,0,0.08), 0 20px 60px rgba(0,0,0,0.5)" }}
            transition={{ duration: 0.25 }}
            style={{ marginTop: 28, borderRadius: 16, overflow: "hidden", background: "#161618", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {/* card header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", display: "inline-block" }}
              />
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "#606068" }}>Live Monitoring Feed</span>
              {/* ticking counter */}
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={postsPerHr}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  style={{ marginLeft: "auto", fontSize: 11, color: "#FF4500", background: "rgba(255,69,0,0.1)", padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}
                >
                  {postsPerHr} posts/hr
                </motion.span>
              </AnimatePresence>
            </div>

            {/* Sliding rows */}
            <div style={{ overflow: "hidden" }}>
              <AnimatePresence initial={false} mode="popLayout">
                {feed.map((row, i) => (
                  <motion.div
                    key={row.id + "-" + i}
                    layout
                    initial={{ opacity: 0, y: -40, background: "rgba(255,69,0,0.1)" }}
                    animate={{ opacity: 1, y: 0, background: i === 0 ? "rgba(255,69,0,0.04)" : "transparent" }}
                    exit={{ opacity: 0, height: 0, padding: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderBottom: i < feed.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", position: "relative", overflow: "hidden" }}
                  >
                    {/* newest post accent bar */}
                    {i === 0 && (
                      <motion.div
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 0.25 }}
                        style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: "#FF4500", transformOrigin: "top" }}
                      />
                    )}
                    <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: row.subBg, color: row.subColor, whiteSpace: "nowrap", flexShrink: 0, marginTop: 1 }}>
                      {row.sub}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: i === 0 ? 600 : 500, color: i === 0 ? "#fff" : "#d0d0d8", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.title}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            key={row.score}
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ fontSize: 11.5, color: "#606068" }}
                          >
                            ▲ {fmt(row.score)}
                          </motion.span>
                        </AnimatePresence>
                        <span style={{ fontSize: 11.5, color: "#606068" }}>· just now</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: row.sentBg, color: row.sentColor, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {row.label}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </FadeUp>

        {/* Stats — "Posts analyzed" ticks live */}
        <FadeUp delay={0.24}>
          <div style={{ marginTop: 20, display: "flex" }}>
            {/* Posts analyzed — live */}
            <div style={{ flex: 1, padding: "14px 16px", background: "#161618", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px 0 0 12px" }}>
              <AnimatePresence mode="popLayout">
                <motion.p
                  key={analyzedStr}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", color: "#FF4500", margin: 0 }}
                >
                  {analyzedStr}
                </motion.p>
              </AnimatePresence>
              <p style={{ fontSize: 12, color: "#808088", margin: "3px 0 0 0" }}>Posts analyzed</p>
            </div>
            {/* Accuracy — static */}
            <div style={{ flex: 1, padding: "14px 16px", background: "#161618", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "none" }}>
              <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", color: "#FF4500", margin: 0 }}>98%</p>
              <p style={{ fontSize: 12, color: "#808088", margin: "3px 0 0 0" }}>Accuracy</p>
            </div>
            {/* Detection time — static */}
            <div style={{ flex: 1, padding: "14px 16px", background: "#161618", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "none", borderRadius: "0 12px 12px 0" }}>
              <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", color: "#FF4500", margin: 0 }}>&lt;2s</p>
              <p style={{ fontSize: 12, color: "#808088", margin: "3px 0 0 0" }}>Detection time</p>
            </div>
          </div>
        </FadeUp>

        {/* Social proof */}
        <FadeUp delay={0.32}>
          <div style={{ marginTop: "auto", paddingTop: 24, display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ display: "flex" }}>
              {AVATARS.map((a, i) => (
                <div key={a.l} style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #0d0d0f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", background: a.bg, marginLeft: i === 0 ? 0 : -8, zIndex: AVATARS.length - i }}>
                  {a.l}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, color: "#a0a0a8", margin: 0 }}>
              <b style={{ color: "#f0f0f0" }}>500+</b> growth teams trust Redddit AI
            </p>
          </div>
        </FadeUp>
      </div>
    </div>
  );
}

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}
