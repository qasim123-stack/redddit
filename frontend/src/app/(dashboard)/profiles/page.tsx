"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, RefreshCw,
  Users, CheckCircle2, PauseCircle, AlertCircle, X, FileText,
} from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/lib/store/auth-store";
import { profilesApi, type Profile } from "@/lib/api/profiles";
import { ProfileCard } from "@/components/profiles/profile-card";
import { CreateProfileModal } from "@/components/profiles/create-profile-modal";
import { AnimatedGradientBg } from "@/components/dashboard/animated-bg";

type FilterStatus = "all" | "active" | "paused";

export default function ProfilesPage() {
  const { token } = useAuthStore();

  const [profiles, setProfiles]       = useState<Profile[]>([]);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [deleting, setDeleting]       = useState<number | null>(null);

  const load = async () => {
    if (!token) { setLoading(false); return; }
    try {
      const data = await profilesApi.list(token);
      setProfiles(data);
    } catch {
      toast.error("Failed to load profiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    return profiles.filter(p => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase()) ||
        p.subreddits?.some(s => s.toLowerCase().includes(search.toLowerCase()));
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && p.is_active) ||
        (filterStatus === "paused" && !p.is_active);
      return matchSearch && matchStatus;
    });
  }, [profiles, search, filterStatus]);

  const activeCount = profiles.filter(p => p.is_active).length;
  const pausedCount = profiles.filter(p => !p.is_active).length;

  // ── Handlers ──
  const patchLocal = (id: number, patch: Partial<Profile>) =>
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));

  const handleActivate = async (id: number) => {
    if (!token) return;
    try { const p = await profilesApi.activate(id, token); patchLocal(id, p); toast.success("Profile activated"); }
    catch (e) { toast.error("Failed to activate", { description: e instanceof Error ? e.message : "" }); }
  };

  const handleDeactivate = async (id: number) => {
    if (!token) return;
    try { const p = await profilesApi.deactivate(id, token); patchLocal(id, p); toast.success("Profile paused"); }
    catch (e) { toast.error("Failed to pause", { description: e instanceof Error ? e.message : "" }); }
  };

  const handleRefresh = async (id: number) => {
    if (!token) return;
    try { await profilesApi.refresh(id, token); toast.success("Refresh started"); }
    catch (e) { toast.error("Failed to refresh", { description: e instanceof Error ? e.message : "" }); }
  };

  const handleClone = async (id: number) => {
    if (!token) return;
    try { const p = await profilesApi.clone(id, token); setProfiles(prev => [...prev, p]); toast.success("Profile cloned"); }
    catch (e) { toast.error("Failed to clone", { description: e instanceof Error ? e.message : "" }); }
  };

  const handleDelete = (id: number) => setDeleting(id);

  const confirmDelete = async () => {
    if (!deleting || !token) return;
    try { await profilesApi.delete(deleting, token); setProfiles(prev => prev.filter(p => p.id !== deleting)); toast.success("Profile deleted"); }
    catch (e) { toast.error("Failed to delete", { description: e instanceof Error ? e.message : "" }); }
    finally { setDeleting(null); }
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: "Inter, sans-serif" }}>
      <AnimatedGradientBg />

      <div style={{ position: "relative", zIndex: 1, padding: "24px 28px 40px" }}>

        {/* ── Page header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 14 }}
        >
          <div>
            <h1 style={{
              margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px",
              background: "linear-gradient(90deg,#FF4500,#ff8c69,#7c3aed)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Monitoring Profiles
            </h1>
            <p style={{ margin: "5px 0 0", fontSize: 13, color: "#606068" }}>
              {profiles.length} profiles · {activeCount} active · {pausedCount} paused
            </p>
          </div>

          <motion.button
            onClick={() => setModalOpen(true)}
            whileHover={{ scale: 1.03, boxShadow: "0 0 32px rgba(255,69,0,0.5)" }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 20px", borderRadius: 12,
              background: "#FF4500", color: "#fff",
              fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 0 22px rgba(255,69,0,0.4)",
              position: "relative", overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(255,255,255,0.12),transparent)", pointerEvents: "none" }} />
            <Plus size={16} />
            New Profile
          </motion.button>
        </motion.div>

        {/* ── Summary stat chips ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06 }}
          style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}
        >
          {[
            { icon: Users,        label: "Total",   value: profiles.length,  color: "#FF4500" },
            { icon: CheckCircle2, label: "Active",  value: activeCount,       color: "#22c55e" },
            { icon: PauseCircle,  label: "Paused",  value: pausedCount,       color: "#eab308" },
            { icon: FileText,     label: "Posts",   value: profiles.reduce((a,p)=>a+p.total_posts_fetched,0).toLocaleString(), color: "#7c3aed" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 16px", borderRadius: 10,
              background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={13} style={{ color }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#f0f0f0", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 10.5, color: "#606068", marginTop: 1 }}>{label}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── Search + Filter bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}
        >
          {/* Search */}
          <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#606068", pointerEvents: "none" }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search profiles, subreddits…"
              style={{
                width: "100%", height: 42, background: "#161618",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: 11,
                color: "#f0f0f0", fontSize: 13.5, fontFamily: "inherit",
                padding: "0 14px 0 40px", outline: "none", boxSizing: "border-box",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,69,0,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,69,0,0.08)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#606068", cursor: "pointer", display: "flex", padding: 0 }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status filter tabs */}
          <div style={{ display: "flex", gap: 4, background: "#161618", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 11, padding: 4 }}>
            {(["all", "active", "paused"] as FilterStatus[]).map(s => (
              <motion.button
                key={s}
                onClick={() => setFilterStatus(s)}
                whileHover={filterStatus !== s ? { background: "rgba(255,255,255,0.04)" } : {}}
                style={{
                  padding: "6px 16px", borderRadius: 8, cursor: "pointer", border: "none",
                  background: filterStatus === s ? (s === "active" ? "rgba(34,197,94,0.15)" : s === "paused" ? "rgba(234,179,8,0.15)" : "rgba(255,69,0,0.15)") : "transparent",
                  color: filterStatus === s ? (s === "active" ? "#4ade80" : s === "paused" ? "#fbbf24" : "#FF6534") : "#808088",
                  fontSize: 12.5, fontWeight: 700, fontFamily: "inherit",
                  textTransform: "capitalize",
                }}
              >
                {s === "all" ? `All (${profiles.length})` : s === "active" ? `Active (${activeCount})` : `Paused (${pausedCount})`}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── BentoGrid cards ── */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
            <RefreshCw size={20} style={{ color: "#FF4500", animation: "spin 1s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: "center", padding: "80px 0", color: "#606068" }}
          >
            <AlertCircle size={40} style={{ margin: "0 auto 14px", opacity: 0.4 }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: "#a0a0a8" }}>No profiles found</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              {search ? `No results for "${search}"` : "Create your first monitoring profile"}
            </div>
          </motion.div>
        ) : (
          <motion.div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 16,
            }}
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((profile, i) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  index={i}
                  onActivate={handleActivate}
                  onDeactivate={handleDeactivate}
                  onRefresh={handleRefresh}
                  onClone={handleClone}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ── Create modal ── */}
      <CreateProfileModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => { setModalOpen(false); load(); }}
      />

      {/* ── Delete confirm ── */}
      <AnimatePresence>
        {deleting !== null && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDeleting(null)}
              style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
              style={{
                position: "fixed", top: "50%", left: "50%", zIndex: 201,
                transform: "translate(-50%, -50%)",
                background: "#161618", border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 18, padding: 28, width: 360,
                boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
                fontFamily: "Inter, sans-serif",
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 800, color: "#f0f0f0", marginBottom: 8 }}>Delete profile?</div>
              <div style={{ fontSize: 13, color: "#808088", marginBottom: 22, lineHeight: 1.5 }}>
                This will permanently delete <strong style={{ color: "#f0f0f0" }}>{profiles.find(p => p.id === deleting)?.name}</strong> and all its data. This cannot be undone.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setDeleting(null)}
                  style={{ flex: 1, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#a0a0a8", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Cancel
                </button>
                <motion.button onClick={confirmDelete} whileHover={{ scale: 1.03 }}
                  style={{ flex: 1, height: 40, borderRadius: 10, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
