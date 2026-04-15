"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronUp, MessageSquare, Clock, ExternalLink, Brain,
  Smile, Target, AlertTriangle, Tag, Hash, Building2,
  ThumbsUp, ThumbsDown, Minus, Loader2, RefreshCw, Bookmark, BookmarkCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { RedditPost, AIAnalysisResult } from "@/lib/api/posts";
import { postsApi } from "@/lib/api/posts";

interface PostDrawerProps {
  post: RedditPost | null;
  token?: string;
  isSaved?: boolean;
  onSave?: (postId: number) => void;
  onClose: () => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatScore(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ── Sentiment Section ──────────────────────────────────────────────────────
function SentimentBar({ label, score }: { label: string; score: number }) {
  const pct   = Math.round(Math.abs(score) * 100);
  const color  = label === "positive" ? "#22c55e" : label === "negative" ? "#ef4444" : "#eab308";
  const Icon   = label === "positive" ? ThumbsUp : label === "negative" ? ThumbsDown : Minus;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9,
        background: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={14} style={{ color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#e8e8f0", textTransform: "capitalize" }}>{label}</span>
          <span style={{ fontSize: 12, color: "#a0a0a8" }}>{pct}%</span>
        </div>
        <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.07)" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{ height: "100%", borderRadius: 99, background: color }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Chip ──────────────────────────────────────────────────────────────────
function Chip({ label, color = "#a0a0a8", bg = "rgba(255,255,255,0.06)" }: { label: string; color?: string; bg?: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color, background: bg,
      borderRadius: 6, padding: "3px 8px", display: "inline-block",
    }}>
      {label}
    </span>
  );
}

// ── Section Header ────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, iconColor = "#FF4500" }: { icon: React.ElementType; title: string; iconColor?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <div style={{
        width: 26, height: 26, borderRadius: 7,
        background: `${iconColor}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={13} style={{ color: iconColor }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#e0e0e8", letterSpacing: "0.5px", textTransform: "uppercase" }}>
        {title}
      </span>
    </div>
  );
}

// ── AI Analysis Panel ─────────────────────────────────────────────────────
function AIAnalysisPanel({ analysis }: { analysis: AIAnalysisResult }) {
  const intentColors: Record<string, string> = {
    question: "#60a5fa", complaint: "#f87171", recommendation: "#4ade80",
    discussion: "#a855f7", information: "#fbbf24",
  };
  const intentColor = analysis.intent_label ? (intentColors[analysis.intent_label] ?? "#a0a0a8") : "#a0a0a8";

  const severityColor: Record<string, string> = {
    low: "#fbbf24", medium: "#f97316", high: "#ef4444", critical: "#dc2626",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Sentiment */}
      {analysis.sentiment_label && analysis.sentiment_score != null && (
        <div>
          <SectionHeader icon={Brain} title="Sentiment" iconColor="#7c3aed" />
          <SentimentBar label={analysis.sentiment_label} score={Number(analysis.sentiment_score)} />
          {analysis.emotion && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <Smile size={13} style={{ color: "#7c3aed" }} />
              <span style={{ fontSize: 12, color: "#a0a0a8" }}>Emotion:</span>
              <Chip
                label={analysis.emotion}
                color="#c084fc"
                bg="rgba(124,58,237,0.1)"
              />
              {analysis.emotion_score != null && (
                <span style={{ fontSize: 11, color: "#606068" }}>
                  ({Math.round(Number(analysis.emotion_score) * 100)}%)
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Intent */}
      {analysis.intent_label && (
        <div>
          <SectionHeader icon={Target} title="Intent" iconColor="#60a5fa" />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Chip
              label={analysis.intent_label}
              color={intentColor}
              bg={`${intentColor}18`}
            />
            {analysis.intent_score != null && (
              <span style={{ fontSize: 11.5, color: "#606068" }}>
                {Math.round(Number(analysis.intent_score) * 100)}% confidence
              </span>
            )}
          </div>
        </div>
      )}

      {/* Pain Points */}
      {analysis.has_pain_point && (
        <div>
          <SectionHeader icon={AlertTriangle} title="Pain Point Detected" iconColor="#f97316" />
          <div style={{
            background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)",
            borderRadius: 10, padding: "12px 14px",
          }}>
            <div style={{ display: "flex", gap: 8, marginBottom: analysis.pain_point_phrases?.length ? 10 : 0, flexWrap: "wrap" }}>
              {analysis.pain_point_category && (
                <Chip label={analysis.pain_point_category} color="#fb923c" bg="rgba(249,115,22,0.12)" />
              )}
              {analysis.pain_point_severity && (
                <Chip
                  label={`${analysis.pain_point_severity} severity`}
                  color={severityColor[analysis.pain_point_severity] ?? "#f97316"}
                  bg={`${severityColor[analysis.pain_point_severity] ?? "#f97316"}15`}
                />
              )}
            </div>
            {analysis.pain_point_phrases && analysis.pain_point_phrases.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {analysis.pain_point_phrases.slice(0, 4).map((phrase, i) => (
                  <div key={i} style={{
                    fontSize: 12, color: "#c0a0a0", lineHeight: 1.4,
                    paddingLeft: 10, borderLeft: "2px solid rgba(239,68,68,0.3)",
                    fontStyle: "italic",
                  }}>
                    "{phrase}"
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Topics */}
      {analysis.topics && analysis.topics.length > 0 && (
        <div>
          <SectionHeader icon={Hash} title="Topics" iconColor="#22c55e" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {analysis.topics.map((t, i) => (
              <Chip
                key={t}
                label={t}
                color="#4ade80"
                bg={`rgba(34,197,94,${0.12 - i * 0.01 > 0.04 ? 0.12 - i * 0.01 : 0.06})`}
              />
            ))}
          </div>
          {analysis.main_topic && (
            <div style={{ marginTop: 8, fontSize: 11.5, color: "#606068" }}>
              Main topic: <span style={{ color: "#4ade80" }}>{analysis.main_topic}</span>
            </div>
          )}
        </div>
      )}

      {/* Keywords */}
      {analysis.extracted_keywords && analysis.extracted_keywords.length > 0 && (
        <div>
          <SectionHeader icon={Tag} title="Extracted Keywords" iconColor="#7c3aed" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {analysis.extracted_keywords.slice(0, 12).map(kw => (
              <Chip key={kw} label={kw} color="#c084fc" bg="rgba(124,58,237,0.1)" />
            ))}
          </div>
        </div>
      )}

      {/* Entities */}
      {analysis.entities && Object.keys(analysis.entities).length > 0 && (
        <div>
          <SectionHeader icon={Building2} title="Entities" iconColor="#60a5fa" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(analysis.entities).slice(0, 5).map(([type, values]) => (
              <div key={type}>
                <div style={{ fontSize: 10.5, color: "#606068", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  {type}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {(values as string[]).slice(0, 6).map(v => (
                    <Chip key={v} label={v} color="#93c5fd" bg="rgba(96,165,250,0.1)" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meta */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        paddingTop: 12,
        display: "flex", gap: 16, flexWrap: "wrap",
      }}>
        {analysis.model_version && (
          <div style={{ fontSize: 10.5, color: "#606068" }}>
            Model: <span style={{ color: "#808088" }}>{analysis.model_version}</span>
          </div>
        )}
        {analysis.processing_time_ms != null && (
          <div style={{ fontSize: 10.5, color: "#606068" }}>
            Processed in <span style={{ color: "#808088" }}>{analysis.processing_time_ms}ms</span>
          </div>
        )}
        <div style={{ fontSize: 10.5, color: "#606068" }}>
          Analyzed: <span style={{ color: "#808088" }}>{formatDate(analysis.analyzed_at)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Drawer ───────────────────────────────────────────────────────────
export function PostDrawer({ post, token, isSaved, onSave, onClose }: PostDrawerProps) {
  const [analysis, setAnalysis]   = useState<AIAnalysisResult | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError]     = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "analysis">("content");

  useEffect(() => {
    if (!post) { setAnalysis(null); setAiError(false); return; }
    if (post.processing_status !== "analyzed") return;
    if (!token) return;

    setLoadingAI(true);
    setAiError(false);
    postsApi.getAnalysis(post.id, token)
      .then(setAnalysis)
      .catch(() => setAiError(true))
      .finally(() => setLoadingAI(false));
  }, [post?.id, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <AnimatePresence>
      {post && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            }}
          />

          {/* Drawer panel */}
          <motion.div
            key="drawer"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
            onKeyDown={handleKeyDown}
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 101,
              width: 500, maxWidth: "100vw",
              background: "#111113",
              borderLeft: "1px solid rgba(255,255,255,0.07)",
              display: "flex", flexDirection: "column",
              fontFamily: "Inter, sans-serif",
              boxShadow: "-24px 0 64px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "18px 20px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "flex-start", gap: 12,
              background: "#0d0d0f",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Subreddit */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 11.5, fontWeight: 700, color: "#FF4500",
                    background: "rgba(255,69,0,0.1)", borderRadius: 6, padding: "3px 9px",
                  }}>
                    r/{post.subreddit}
                  </span>
                  {post.author && (
                    <span style={{ fontSize: 11.5, color: "#606068" }}>u/{post.author}</span>
                  )}
                  <div style={{ flex: 1 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#606068", fontSize: 11.5 }}>
                    <Clock size={11} />
                    {formatDate(post.created_utc)}
                  </div>
                </div>
                {/* Title */}
                <div style={{
                  fontSize: 14.5, fontWeight: 700, color: "#f0f0f0",
                  lineHeight: 1.4,
                }}>
                  {post.title}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {onSave && post && (
                  <motion.button
                    onClick={() => onSave(post.id)}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    title={isSaved ? "Unsave post" : "Save post"}
                    style={{
                      width: 32, height: 32, borderRadius: 9,
                      background: isSaved ? "rgba(255,69,0,0.15)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${isSaved ? "rgba(255,69,0,0.3)" : "rgba(255,255,255,0.07)"}`,
                      color: isSaved ? "#FF4500" : "#808088", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                  </motion.button>
                )}
                <button
                  onClick={onClose}
                  style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.07)",
                    color: "#808088", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Stats bar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 18, padding: "10px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              background: "#0d0d0f",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ChevronUp size={14} style={{ color: "#FF4500" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#f0f0f0" }}>
                  {formatScore(post.score)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#a0a0a8" }}>
                <MessageSquare size={13} />
                <span style={{ fontSize: 13 }}>{post.num_comments.toLocaleString()}</span>
              </div>
              {post.upvote_ratio != null && (
                <span style={{ fontSize: 12, color: "#606068" }}>
                  {Math.round(Number(post.upvote_ratio) * 100)}% upvoted
                </span>
              )}
              <div style={{ flex: 1 }} />
              {post.permalink && (
                <a
                  href={`https://reddit.com${post.permalink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 12, color: "#FF4500", textDecoration: "none", fontWeight: 600,
                  }}
                >
                  <ExternalLink size={12} />
                  View on Reddit
                </a>
              )}
            </div>

            {/* Tabs */}
            <div style={{
              display: "flex", borderBottom: "1px solid rgba(255,255,255,0.05)",
              padding: "0 20px", background: "#111113",
            }}>
              {(["content", "analysis"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "12px 16px",
                    fontSize: 13, fontWeight: activeTab === tab ? 700 : 500,
                    color: activeTab === tab ? "#FF4500" : "#606068",
                    background: "none", border: "none", cursor: "pointer",
                    borderBottom: `2px solid ${activeTab === tab ? "#FF4500" : "transparent"}`,
                    fontFamily: "inherit",
                    transition: "color 0.15s",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  {tab === "analysis" && <Brain size={13} />}
                  {tab === "content" ? "Post Content" : "AI Analysis"}
                  {tab === "analysis" && post.processing_status === "analyzed" && (
                    <span style={{ fontSize: 10, background: "rgba(124,58,237,0.2)", color: "#a855f7", borderRadius: 4, padding: "1px 5px" }}>
                      AI
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Body — scrollable */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

              {activeTab === "content" && (
                <div>
                  {/* Post body */}
                  {post.selftext && post.selftext.trim() && post.selftext !== "[removed]" && post.selftext !== "[deleted]" ? (
                    <div style={{
                      fontSize: 13, color: "#c0c0cc", lineHeight: 1.65,
                      whiteSpace: "pre-wrap", wordBreak: "break-word",
                    }}>
                      {post.selftext}
                    </div>
                  ) : (
                    <div style={{
                      textAlign: "center", padding: "40px 0",
                      color: "#606068", fontSize: 13,
                    }}>
                      <ExternalLink size={28} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                      <div>This is a link post — no text body.</div>
                      {post.url && (
                        <a href={post.url} target="_blank" rel="noopener noreferrer"
                          style={{ color: "#FF4500", fontSize: 12, marginTop: 8, display: "block" }}>
                          {post.url.length > 60 ? post.url.slice(0, 60) + "…" : post.url}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Matched keywords */}
                  {post.matched_keywords && post.matched_keywords.length > 0 && (
                    <div style={{
                      marginTop: 20, padding: "14px 16px",
                      background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)",
                      borderRadius: 10,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#a855f7", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Matched Keywords
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {post.matched_keywords.map(kw => (
                          <Chip key={kw} label={kw} color="#c084fc" bg="rgba(124,58,237,0.15)" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Post metadata */}
                  <div style={{
                    marginTop: 20, padding: "12px 14px",
                    background: "#161618", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 10, display: "flex", flexDirection: "column", gap: 8,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#606068", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                      Post Info
                    </div>
                    {[
                      { label: "Reddit ID", value: post.reddit_id },
                      { label: "Fetched at", value: formatDate(post.fetched_at) },
                      { label: "Status", value: post.processing_status },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "#606068" }}>{label}</span>
                        <span style={{ fontSize: 12, color: "#a0a0a8", textAlign: "right", maxWidth: 280, wordBreak: "break-all" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "analysis" && (
                <div>
                  {post.processing_status === "pending" && (
                    <div style={{ textAlign: "center", padding: "50px 0", color: "#606068" }}>
                      <RefreshCw size={32} style={{ margin: "0 auto 14px", opacity: 0.3 }} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#808088" }}>Not yet analyzed</div>
                      <div style={{ fontSize: 12.5, marginTop: 6 }}>This post is queued for AI analysis.</div>
                    </div>
                  )}
                  {post.processing_status === "failed" && (
                    <div style={{ textAlign: "center", padding: "50px 0", color: "#606068" }}>
                      <AlertTriangle size={32} style={{ margin: "0 auto 14px", color: "#f87171", opacity: 0.5 }} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#f87171" }}>Analysis failed</div>
                      <div style={{ fontSize: 12.5, marginTop: 6 }}>The AI analysis encountered an error.</div>
                    </div>
                  )}
                  {post.processing_status === "analyzed" && loadingAI && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "50px 0", color: "#7c3aed" }}>
                      <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                      <span style={{ fontSize: 13.5, color: "#a0a0a8" }}>Loading analysis…</span>
                    </div>
                  )}
                  {post.processing_status === "analyzed" && !loadingAI && aiError && (
                    <div style={{ textAlign: "center", padding: "50px 0", color: "#606068" }}>
                      <AlertTriangle size={32} style={{ margin: "0 auto 14px", color: "#f87171", opacity: 0.5 }} />
                      <div style={{ fontSize: 14, color: "#f87171" }}>Could not load analysis</div>
                      <div style={{ fontSize: 12, marginTop: 6 }}>Check your connection.</div>
                    </div>
                  )}
                  {post.processing_status === "analyzed" && !loadingAI && !aiError && analysis && (
                    <AIAnalysisPanel analysis={analysis} />
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
