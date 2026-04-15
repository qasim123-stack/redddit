"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronUp, MessageSquare, Search, Filter,
  RefreshCw, AlertCircle, X, LayoutGrid, List,
  SlidersHorizontal, Brain, FileText,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth-store";
import { postsApi, type RedditPost } from "@/lib/api/posts";
import { profilesApi, type Profile } from "@/lib/api/profiles";
import { savedPostsApi } from "@/lib/api/saved-posts";
import { AnimatedGradientBg } from "@/components/dashboard/animated-bg";
import { PostCard } from "@/components/posts/post-card";
import { PostDrawer } from "@/components/posts/post-drawer";
import { toast } from "sonner";


// ── Score quick-select options ────────────────────────────────────────────
const SCORE_OPTIONS = [
  { label: "Any",    value: 0    },
  { label: "10+",    value: 10   },
  { label: "100+",   value: 100  },
  { label: "1,000+", value: 1000 },
];

const DATE_OPTIONS = [
  { label: "All time", value: undefined },
  { label: "24h",      value: 24  },
  { label: "7 days",   value: 168 },
  { label: "30 days",  value: 720 },
];

const STATUS_OPTIONS = [
  { label: "All",      value: ""         },
  { label: "Analyzed", value: "analyzed" },
  { label: "Pending",  value: "pending"  },
  { label: "Failed",   value: "failed"   },
];

const PAGE_SIZE = 20;

// ── Stats chip ────────────────────────────────────────────────────────────
function StatChip({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div style={{
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
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function PostsFeedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: profileId } = use(params);
  const pid = parseInt(profileId, 10);

  const { token } = useAuthStore();

  const [profile, setProfile]           = useState<Profile | null>(null);
  const [selectedSubreddit, setSubreddit] = useState("");
  const [minScore, setMinScore]         = useState(0);
  const [hoursAgo, setHoursAgo]         = useState<number | undefined>(undefined);
  const [status, setStatus]             = useState("");
  const [selectedPost, setSelectedPost] = useState<RedditPost | null>(null);
  const [savedIds, setSavedIds]         = useState<Set<number>>(new Set());
  const [viewMode, setViewMode]         = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters]   = useState(false);

  // ── Fetch profile + initial saved IDs ──
  useEffect(() => {
    if (!token) return;
    profilesApi.list(token).then(list => {
      setProfile(list.find(p => p.id === pid) ?? null);
    }).catch(() => {});
    savedPostsApi.list(token).then(entries => {
      setSavedIds(new Set(entries.map(e => e.post_id)));
    }).catch(() => {});
  }, [pid, token]);

  // ── Infinite query ──────────────────────────────────────────────────────
  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError,
  } = useInfiniteQuery({
    queryKey: ["posts", pid, selectedSubreddit, minScore, hoursAgo, status, token],
    queryFn: ({ pageParam = 0 }) =>
      postsApi.list({
        profile_id: isNaN(pid) ? undefined : pid,
        subreddit:  selectedSubreddit || undefined,
        min_score:  minScore > 0 ? minScore : undefined,
        hours_ago:  hoursAgo,
        processing_status: status || undefined,
        limit:  PAGE_SIZE,
        offset: pageParam as number,
      }, token ?? undefined),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.flat().length : undefined,
    enabled: !!token,
    staleTime: 60_000,
  });

  const allPosts: RedditPost[] = data?.pages.flat() ?? [];

  // ── Save / unsave toggle ──
  const handleSave = useCallback(async (postId: number) => {
    if (!token) return;
    const alreadySaved = savedIds.has(postId);
    try {
      if (alreadySaved) {
        await savedPostsApi.unsave(postId, token);
        setSavedIds(prev => { const n = new Set(prev); n.delete(postId); return n; });
        toast.success("Removed from Saved Posts");
      } else {
        await savedPostsApi.save(postId, token);
        setSavedIds(prev => new Set(prev).add(postId));
        toast.success("Saved!", { description: "Find it in Saved Posts" });
      }
    } catch {
      toast.error("Failed to update saved posts");
    }
  }, [token, savedIds]);

  // sentiment comes from the post's analysis; null until fetched
  const sentimentFor = useCallback((_post: RedditPost): string | null => null, []);

  // ── Infinite scroll observer ────────────────────────────────────────────
  const loaderRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage)
        fetchNextPage();
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── Compute stats ───────────────────────────────────────────────────────
  const analyzedCount = allPosts.filter(p => p.processing_status === "analyzed").length;
  const pendingCount  = allPosts.filter(p => p.processing_status === "pending").length;
  const totalScore    = allPosts.reduce((a, p) => a + p.score, 0);

  const subreddits = profile?.subreddits ?? [];

  return (
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: "Inter, sans-serif" }}>
      <AnimatedGradientBg />

      <div style={{ position: "relative", zIndex: 1, padding: "24px 28px 60px" }}>

        {/* ── Back + Page header ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38 }}
          style={{ marginBottom: 22 }}
        >
          <Link href="/profiles" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            color: "#606068", fontSize: 12.5, textDecoration: "none",
            fontWeight: 600, marginBottom: 14,
            transition: "color 0.15s",
          }}
            onMouseEnter={e => (e.currentTarget.style.color = "#FF4500")}
            onMouseLeave={e => (e.currentTarget.style.color = "#606068")}
          >
            <ArrowLeft size={13} />
            Back to Profiles
          </Link>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div>
              <h1 style={{
                margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px",
                background: "linear-gradient(90deg,#FF4500,#ff8c69,#7c3aed)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                Posts Feed
              </h1>
              <p style={{ margin: "5px 0 0", fontSize: 13, color: "#606068" }}>
                {`Profile #${pid} · ${allPosts.length} posts loaded`}
              </p>
            </div>

            {/* View toggle */}
            <div style={{
              display: "flex", gap: 2,
              background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10, padding: 3,
            }}>
              {([["grid", LayoutGrid], ["list", List]] as const).map(([mode, Icon]) => (
                <motion.button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  whileHover={viewMode !== mode ? { background: "rgba(255,255,255,0.04)" } : {}}
                  style={{
                    width: 34, height: 34, borderRadius: 8, border: "none",
                    background: viewMode === mode ? "rgba(255,69,0,0.15)" : "transparent",
                    color: viewMode === mode ? "#FF4500" : "#606068",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Icon size={15} />
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Stats chips ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.06 }}
          style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}
        >
          <StatChip icon={FileText}      label="Total Posts"  value={allPosts.length}            color="#FF4500" />
          <StatChip icon={Brain}         label="Analyzed"     value={analyzedCount}              color="#7c3aed" />
          <StatChip icon={RefreshCw}     label="Pending"      value={pendingCount}               color="#eab308" />
          <StatChip icon={ChevronUp}     label="Total Score"  value={totalScore.toLocaleString()} color="#22c55e" />
          <StatChip icon={MessageSquare} label="Avg Comments"
            value={allPosts.length ? Math.round(allPosts.reduce((a,p) => a + p.num_comments, 0) / allPosts.length) : 0}
            color="#60a5fa"
          />
        </motion.div>

        {/* ── Filter bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.1 }}
          style={{ marginBottom: 22 }}
        >
          {/* Primary row */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: showFilters ? 12 : 0 }}>

            {/* Subreddit pills */}
            <div style={{
              display: "flex", gap: 4, overflowX: "auto",
              background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 11, padding: 4, flex: "1 1 auto", minWidth: 0,
            }}>
              <motion.button
                onClick={() => setSubreddit("")}
                whileHover={selectedSubreddit !== "" ? { background: "rgba(255,255,255,0.04)" } : {}}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: "none",
                  background: selectedSubreddit === "" ? "rgba(255,69,0,0.15)" : "transparent",
                  color: selectedSubreddit === "" ? "#FF6534" : "#808088",
                  fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                All
              </motion.button>
              {subreddits.map(sr => (
                <motion.button
                  key={sr}
                  onClick={() => setSubreddit(selectedSubreddit === sr ? "" : sr)}
                  whileHover={selectedSubreddit !== sr ? { background: "rgba(255,255,255,0.04)" } : {}}
                  style={{
                    padding: "6px 14px", borderRadius: 8, border: "none",
                    background: selectedSubreddit === sr ? "rgba(255,69,0,0.15)" : "transparent",
                    color: selectedSubreddit === sr ? "#FF6534" : "#808088",
                    fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    whiteSpace: "nowrap", flexShrink: 0,
                  }}
                >
                  r/{sr}
                </motion.button>
              ))}
            </div>

            {/* Advanced filters toggle */}
            <motion.button
              onClick={() => setShowFilters(v => !v)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 16px", borderRadius: 11,
                background: showFilters ? "rgba(255,69,0,0.12)" : "#161618",
                border: `1px solid ${showFilters ? "rgba(255,69,0,0.25)" : "rgba(255,255,255,0.07)"}`,
                color: showFilters ? "#FF6534" : "#808088",
                fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                flexShrink: 0,
              }}
            >
              <SlidersHorizontal size={13} />
              Filters
              {(minScore > 0 || hoursAgo || status) && (
                <span style={{
                  width: 16, height: 16, borderRadius: "50%",
                  background: "#FF4500", color: "#fff",
                  fontSize: 9, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {[minScore > 0, !!hoursAgo, !!status].filter(Boolean).length}
                </span>
              )}
            </motion.button>
          </div>

          {/* Expanded filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{
                  display: "flex", gap: 16, flexWrap: "wrap",
                  background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12, padding: "14px 16px",
                }}>

                  {/* Status filter */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#606068", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Status
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {STATUS_OPTIONS.map(opt => (
                        <motion.button
                          key={opt.value}
                          onClick={() => setStatus(opt.value)}
                          whileHover={status !== opt.value ? { background: "rgba(255,255,255,0.04)" } : {}}
                          style={{
                            padding: "5px 12px", borderRadius: 7, border: "none",
                            background: status === opt.value
                              ? opt.value === "analyzed" ? "rgba(124,58,237,0.15)"
                              : opt.value === "pending" ? "rgba(234,179,8,0.12)"
                              : opt.value === "failed" ? "rgba(239,68,68,0.12)"
                              : "rgba(255,69,0,0.12)"
                              : "transparent",
                            color: status === opt.value
                              ? opt.value === "analyzed" ? "#a855f7"
                              : opt.value === "pending" ? "#fbbf24"
                              : opt.value === "failed" ? "#f87171"
                              : "#FF6534"
                              : "#808088",
                            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                          }}
                        >
                          {opt.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ width: 1, background: "rgba(255,255,255,0.07)", alignSelf: "stretch" }} />

                  {/* Min score */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#606068", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Min Score
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {SCORE_OPTIONS.map(opt => (
                        <motion.button
                          key={opt.value}
                          onClick={() => setMinScore(opt.value)}
                          whileHover={minScore !== opt.value ? { background: "rgba(255,255,255,0.04)" } : {}}
                          style={{
                            padding: "5px 12px", borderRadius: 7, border: "none",
                            background: minScore === opt.value ? "rgba(34,197,94,0.12)" : "transparent",
                            color: minScore === opt.value ? "#4ade80" : "#808088",
                            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                          }}
                        >
                          {opt.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ width: 1, background: "rgba(255,255,255,0.07)", alignSelf: "stretch" }} />

                  {/* Date range */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#606068", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Date Range
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {DATE_OPTIONS.map(opt => (
                        <motion.button
                          key={String(opt.value)}
                          onClick={() => setHoursAgo(opt.value)}
                          whileHover={hoursAgo !== opt.value ? { background: "rgba(255,255,255,0.04)" } : {}}
                          style={{
                            padding: "5px 12px", borderRadius: 7, border: "none",
                            background: hoursAgo === opt.value ? "rgba(96,165,250,0.12)" : "transparent",
                            color: hoursAgo === opt.value ? "#60a5fa" : "#808088",
                            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                          }}
                        >
                          {opt.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div style={{ flex: 1 }} />

                  {/* Clear filters */}
                  {(minScore > 0 || hoursAgo || status) && (
                    <motion.button
                      onClick={() => { setMinScore(0); setHoursAgo(undefined); setStatus(""); }}
                      whileHover={{ color: "#f87171" }}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        background: "none", border: "none",
                        color: "#606068", fontSize: 12, fontWeight: 600,
                        cursor: "pointer", fontFamily: "inherit", alignSelf: "center",
                      }}
                    >
                      <X size={12} />
                      Clear
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Post count / loading state ── */}
        {isLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
            <RefreshCw size={22} style={{ color: "#FF4500", animation: "spin 1s linear infinite" }} />
          </div>
        ) : isError ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: "center", padding: "80px 0", color: "#606068" }}
          >
            <AlertCircle size={40} style={{ margin: "0 auto 14px", color: "#f87171", opacity: 0.5 }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: "#f87171" }}>Failed to load posts</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Check your connection and try again.</div>
          </motion.div>
        ) : allPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: "center", padding: "80px 0", color: "#606068" }}
          >
            <FileText size={40} style={{ margin: "0 auto 14px", opacity: 0.3 }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: "#a0a0a8" }}>No posts found</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              {selectedSubreddit || status || minScore > 0
                ? "Try adjusting your filters"
                : "No posts have been fetched for this profile yet"}
            </div>
          </motion.div>
        ) : (
          <>
            {/* Result count */}
            <div style={{ fontSize: 12, color: "#606068", marginBottom: 14 }}>
              Showing <span style={{ color: "#a0a0a8", fontWeight: 600 }}>{allPosts.length}</span> posts
              {selectedSubreddit && <> in <span style={{ color: "#FF4500" }}>r/{selectedSubreddit}</span></>}
            </div>

            {/* ── Grid / List ── */}
            <motion.div
              layout
              style={viewMode === "grid" ? {
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: 14,
              } : {
                display: "flex", flexDirection: "column", gap: 10,
              }}
            >
              <AnimatePresence mode="popLayout">
                {allPosts.map((post, i) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    index={i}
                    sentimentLabel={sentimentFor(post)}
                    isSaved={savedIds.has(post.id)}
                    onSave={handleSave}
                    onClick={() => setSelectedPost(post)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>

            {/* ── Infinite scroll loader ── */}
            <div ref={loaderRef} style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isFetchingNextPage && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#606068" }}>
                  <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 13 }}>Loading more…</span>
                </div>
              )}
              {!hasNextPage && allPosts.length > PAGE_SIZE && (
                <div style={{ fontSize: 12, color: "#606068" }}>
                  All {allPosts.length} posts loaded
                </div>
              )}
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #2a2a2d; border-radius: 99px; }
      `}</style>
    </div>
  );
}
