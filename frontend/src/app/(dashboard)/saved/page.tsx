"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark, BookmarkX, RefreshCw, AlertCircle,
  Search, X, Filter, ChevronUp, MessageSquare, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store/auth-store";
import { savedPostsApi, type SavedPostEntry } from "@/lib/api/saved-posts";
import { AnimatedGradientBg } from "@/components/dashboard/animated-bg";
import { PostCard } from "@/components/posts/post-card";
import { PostDrawer } from "@/components/posts/post-drawer";
import type { RedditPost } from "@/lib/api/posts";

// ── Sort options ──────────────────────────────────────────────────────────
type SortBy = "saved_at" | "score" | "comments";
const SORT_OPTIONS: { label: string; value: SortBy }[] = [
  { label: "Recently Saved", value: "saved_at" },
  { label: "Top Score",      value: "score"    },
  { label: "Most Comments",  value: "comments" },
];

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function SavedPostsPage() {
  const { token } = useAuthStore();

  const [entries, setEntries]           = useState<SavedPostEntry[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [sortBy, setSortBy]             = useState<SortBy>("saved_at");
  const [selectedPost, setSelectedPost] = useState<RedditPost | null>(null);
  const [savedIds, setSavedIds]         = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const data = await savedPostsApi.list(token);
      setEntries(data);
      setSavedIds(new Set(data.map(e => e.post_id)));
    } catch {
      toast.error("Failed to load saved posts");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // ── Save / unsave ──────────────────────────────────────────────────────
  const handleSave = useCallback(async (postId: number) => {
    if (!token) { toast.info("Sign in to manage saved posts"); return; }
    try {
      await savedPostsApi.unsave(postId, token);
      setEntries(prev => prev.filter(e => e.post_id !== postId));
      setSavedIds(prev => { const n = new Set(prev); n.delete(postId); return n; });
      if (selectedPost?.id === postId) setSelectedPost(null);
      toast.success("Removed from Saved Posts");
    } catch {
      toast.error("Failed to unsave post");
    }
  }, [token, selectedPost]);

  // ── Filter + sort ──────────────────────────────────────────────────────
  const filtered = entries
    .filter(e => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        e.post.title?.toLowerCase().includes(q) ||
        e.post.subreddit.toLowerCase().includes(q) ||
        e.post.author?.toLowerCase().includes(q) ||
        e.note?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "score")    return b.post.score - a.post.score;
      if (sortBy === "comments") return b.post.num_comments - a.post.num_comments;
      return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime();
    });

  return (
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: "Inter, sans-serif" }}>
      <AnimatedGradientBg />

      <div style={{ position: "relative", zIndex: 1, padding: "24px 28px 60px" }}>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38 }}
          style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 14 }}
        >
          <div>
            <h1 style={{
              margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px",
              background: "linear-gradient(90deg,#FF4500,#ff8c69,#7c3aed)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Saved Posts
            </h1>
            <p style={{ margin: "5px 0 0", fontSize: 13, color: "#606068" }}>
              {`${entries.length} bookmarked post${entries.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Bookmark icon accent */}
          <div style={{
            width: 44, height: 44, borderRadius: 13,
            background: "linear-gradient(135deg, rgba(255,69,0,0.2), rgba(124,58,237,0.2))",
            border: "1px solid rgba(255,69,0,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Bookmark size={20} style={{ color: "#FF4500" }} />
          </div>
        </motion.div>

        {/* ── Stats chips ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.06 }}
          style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}
        >
          {[
            { label: "Total Saved",   value: entries.length,
              color: "#FF4500", icon: Bookmark },
            { label: "Analyzed",
              value: entries.filter(e => e.post.processing_status === "analyzed").length,
              color: "#7c3aed", icon: Filter },
            { label: "With Notes",
              value: entries.filter(e => e.note).length,
              color: "#22c55e", icon: MessageSquare },
            { label: "Avg Score",
              value: entries.length
                ? Math.round(entries.reduce((a, e) => a + e.post.score, 0) / entries.length).toLocaleString()
                : 0,
              color: "#eab308", icon: ChevronUp },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 14px", borderRadius: 10,
              background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 7,
                background: `${color}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={12} style={{ color }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#f0f0f0", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 10, color: "#606068", marginTop: 1 }}>{label}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── Search + Sort ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.1 }}
          style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}
        >
          {/* Search */}
          <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
            <Search size={14} style={{
              position: "absolute", left: 13, top: "50%",
              transform: "translateY(-50%)", color: "#606068", pointerEvents: "none",
            }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search saved posts, subreddits, notes…"
              style={{
                width: "100%", height: 42,
                background: "#161618", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 11, color: "#f0f0f0", fontSize: 13.5,
                fontFamily: "inherit", padding: "0 14px 0 38px",
                outline: "none", boxSizing: "border-box",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = "rgba(255,69,0,0.4)";
                e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(255,69,0,0.08)";
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.boxShadow   = "none";
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{
                position: "absolute", right: 12, top: "50%",
                transform: "translateY(-50%)", background: "none",
                border: "none", color: "#606068", cursor: "pointer", padding: 0,
              }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Sort tabs */}
          <div style={{
            display: "flex", gap: 4,
            background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 11, padding: 4,
          }}>
            {SORT_OPTIONS.map(opt => (
              <motion.button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                whileHover={sortBy !== opt.value ? { background: "rgba(255,255,255,0.04)" } : {}}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: "none",
                  background: sortBy === opt.value ? "rgba(255,69,0,0.15)" : "transparent",
                  color: sortBy === opt.value ? "#FF6534" : "#808088",
                  fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  whiteSpace: "nowrap",
                }}
              >
                {opt.label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Content ── */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
            <RefreshCw size={22} style={{ color: "#FF4500", animation: "spin 1s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: "center", padding: "80px 0", color: "#606068" }}
          >
            {search ? (
              <>
                <AlertCircle size={40} style={{ margin: "0 auto 14px", opacity: 0.3 }} />
                <div style={{ fontSize: 16, fontWeight: 600, color: "#a0a0a8" }}>No results for "{search}"</div>
              </>
            ) : (
              <>
                <div style={{
                  width: 72, height: 72, borderRadius: 20, margin: "0 auto 18px",
                  background: "rgba(255,69,0,0.08)", border: "1px solid rgba(255,69,0,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Bookmark size={30} style={{ color: "#FF4500", opacity: 0.5 }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#a0a0a8" }}>No saved posts yet</div>
                <div style={{ fontSize: 13, marginTop: 8, maxWidth: 320, margin: "8px auto 0", lineHeight: 1.5 }}>
                  Click the <Bookmark size={12} style={{ display: "inline", verticalAlign: "middle" }} /> bookmark icon on any post card to save it here.
                </div>
              </>
            )}
          </motion.div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: "#606068", marginBottom: 14 }}>
              {filtered.length} saved post{filtered.length !== 1 ? "s" : ""}
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: 14,
            }}>
              <AnimatePresence mode="popLayout">
                {filtered.map((entry, i) => (
                  <motion.div key={entry.id} layout>
                    {/* Saved-at label + note */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      marginBottom: 6, paddingLeft: 2,
                    }}>
                      <Bookmark size={11} style={{ color: "#FF4500", flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "#606068" }}>
                        Saved {formatTimeAgo(entry.saved_at)}
                      </span>
                      {entry.note && (
                        <>
                          <span style={{ fontSize: 11, color: "#404046" }}>·</span>
                          <span style={{
                            fontSize: 11, color: "#a0a0a8",
                            maxWidth: 200, overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap",
                            fontStyle: "italic",
                          }}>
                            {entry.note}
                          </span>
                        </>
                      )}
                    </div>

                    <PostCard
                      post={entry.post}
                      index={i}
                      sentimentLabel={null}
                      isSaved={true}
                      onSave={handleSave}
                      onClick={() => setSelectedPost(entry.post)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* ── Post detail drawer ── */}
      <PostDrawer
        post={selectedPost}
        token={token ?? undefined}
        isSaved={selectedPost ? savedIds.has(selectedPost.id) : false}
        onSave={handleSave}
        onClose={() => setSelectedPost(null)}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
