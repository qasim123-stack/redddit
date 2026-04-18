"use client";

import { motion } from "framer-motion";
import { ChevronUp, MessageSquare, Clock, Tag, Brain, AlertTriangle, ExternalLink, Bookmark, BookmarkCheck } from "lucide-react";
import type { RedditPost } from "@/lib/api/posts";

interface PostCardProps {
  post: RedditPost;
  index: number;
  sentimentLabel?: string | null;
  isSaved?: boolean;
  onSave?: (postId: number) => void;
  onClick: () => void;
}

function getSentimentBorder(status: string, sentiment?: string | null) {
  if (status !== "analyzed" || !sentiment) return "rgba(255,255,255,0.07)";
  if (sentiment === "positive") return "#22c55e";
  if (sentiment === "negative") return "#ef4444";
  return "#eab308";
}

function getSentimentGlow(status: string, sentiment?: string | null) {
  if (status !== "analyzed" || !sentiment) return "none";
  if (sentiment === "positive") return "0 0 12px rgba(34,197,94,0.15)";
  if (sentiment === "negative") return "0 0 12px rgba(239,68,68,0.15)";
  return "0 0 12px rgba(234,179,8,0.15)";
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatScore(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const SENTIMENT_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  positive: { label: "Positive",  bg: "rgba(34,197,94,0.12)",   color: "#4ade80" },
  negative: { label: "Negative",  bg: "rgba(239,68,68,0.12)",   color: "#f87171" },
  neutral:  { label: "Neutral",   bg: "rgba(234,179,8,0.12)",   color: "#fbbf24" },
};

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  pending:  { label: "Pending",   bg: "rgba(255,255,255,0.06)", color: "#808088" },
  analyzed: { label: "Analyzed",  bg: "rgba(124,58,237,0.12)",  color: "#a855f7" },
  failed:   { label: "Failed",    bg: "rgba(239,68,68,0.10)",   color: "#f87171" },
};

export function PostCard({ post, index, sentimentLabel, isSaved, onSave, onClick }: PostCardProps) {
  const borderColor = getSentimentBorder(post.processing_status, sentimentLabel);
  const glowShadow  = getSentimentGlow(post.processing_status, sentimentLabel);
  const sentiment   = sentimentLabel ? SENTIMENT_BADGE[sentimentLabel] : null;
  const statusBadge = STATUS_BADGE[post.processing_status] ?? STATUS_BADGE.pending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min(index * 0.04, 0.4) }}
      whileHover={{ y: -2, boxShadow: `0 8px 32px rgba(0,0,0,0.4), ${glowShadow !== "none" ? glowShadow : "0 0 0 rgba(0,0,0,0)"}` }}
      onClick={onClick}
      style={{
        background: "#161618",
        border: `1px solid rgba(255,255,255,0.07)`,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 14,
        padding: "16px 18px",
        cursor: "pointer",
        fontFamily: "Inter, sans-serif",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      {/* Subtle gradient overlay on hover */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(135deg, rgba(255,255,255,0.018) 0%, transparent 60%)",
        borderRadius: 14,
      }} />

      {/* Top row: subreddit + status */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 11.5, fontWeight: 700, color: "#FF4500",
          background: "rgba(255,69,0,0.1)", borderRadius: 6,
          padding: "3px 8px", letterSpacing: "0.2px",
        }}>
          r/{post.subreddit}
        </span>

        {sentiment ? (
          <span style={{
            fontSize: 11, fontWeight: 700, borderRadius: 6,
            padding: "3px 8px",
            background: sentiment.bg, color: sentiment.color,
          }}>
            {sentiment.label}
          </span>
        ) : (
          <span style={{
            fontSize: 11, fontWeight: 600, borderRadius: 6,
            padding: "3px 8px",
            background: statusBadge.bg, color: statusBadge.color,
          }}>
            {statusBadge.label}
          </span>
        )}

        {post.processing_status === "analyzed" && sentiment && (
          <span style={{
            fontSize: 11, fontWeight: 600, borderRadius: 6,
            padding: "3px 8px",
            background: "rgba(124,58,237,0.1)", color: "#a855f7",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <Brain size={9} />
            AI
          </span>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#606068", fontSize: 11.5 }}>
          <Clock size={11} />
          {formatTimeAgo(post.created_utc)}
        </div>
      </div>

      {/* Title */}
      <div style={{
        fontSize: 13.5, fontWeight: 600, color: "#e8e8f0",
        lineHeight: 1.45, marginBottom: 10,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>
        {post.title ?? "(no title)"}
      </div>

      {/* Author row */}
      {post.author && (
        <div style={{ fontSize: 11.5, color: "#606068", marginBottom: 10 }}>
          u/{post.author}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: post.matched_keywords?.length ? 10 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#a0a0a8", fontSize: 12.5 }}>
          <ChevronUp size={14} style={{ color: "#FF4500" }} />
          <span style={{ fontWeight: 700, color: "#f0f0f0" }}>{formatScore(post.score)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#a0a0a8", fontSize: 12.5 }}>
          <MessageSquare size={13} />
          <span>{post.num_comments.toLocaleString()}</span>
        </div>
        {post.upvote_ratio != null && (
          <div style={{ fontSize: 11.5, color: "#606068" }}>
            {Math.round(Number(post.upvote_ratio) * 100)}% upvoted
          </div>
        )}
        <div style={{ flex: 1 }} />
        {onSave && (
          <motion.button
            onClick={e => { e.stopPropagation(); onSave(post.id); }}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            title={isSaved ? "Unsave post" : "Save post"}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 0,
              color: isSaved ? "#FF4500" : "#606068",
              display: "flex", alignItems: "center",
              transition: "color 0.15s",
            }}
          >
            {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          </motion.button>
        )}
        {post.permalink && (
          <a
            href={`https://reddit.com${post.permalink}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ color: "#606068", display: "flex", alignItems: "center" }}
          >
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* Matched keywords */}
      {post.matched_keywords && post.matched_keywords.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Tag size={10} style={{ color: "#7c3aed", flexShrink: 0 }} />
          {post.matched_keywords.slice(0, 4).map(kw => (
            <span key={kw} style={{
              fontSize: 10.5, fontWeight: 600, color: "#9d6cf7",
              background: "rgba(124,58,237,0.1)",
              borderRadius: 5, padding: "2px 6px",
            }}>
              {kw}
            </span>
          ))}
          {post.matched_keywords.length > 4 && (
            <span style={{ fontSize: 10.5, color: "#606068" }}>
              +{post.matched_keywords.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Pain point indicator (if visible via sentinel) */}
      {post.processing_status === "failed" && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, color: "#f87171", fontSize: 11 }}>
          <AlertTriangle size={11} />
          Analysis failed
        </div>
      )}
    </motion.div>
  );
}
