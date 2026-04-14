"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  FileText,
  Brain,
  Flame,
  TrendingUp,
  Settings,
  LogOut,
  Zap,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { SnooIcon } from "@/components/icons/snoo";

const NAV = [
  { href: "/dashboard",   icon: LayoutDashboard, label: "Dashboard" },
  { href: "/profiles",    icon: Users,            label: "Profiles" },
  { href: "/posts",       icon: FileText,         label: "Posts" },
  { href: "/analysis",    icon: Brain,            label: "Analysis" },
  { href: "/crisis",      icon: Flame,            label: "Crisis" },
  { href: "/trends",      icon: TrendingUp,       label: "Trends" },
  { href: "/settings",    icon: Settings,         label: "Settings" },
];

export function DashboardSidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <aside style={{
      width: 220, minHeight: "100vh", flexShrink: 0,
      background: "#0d0d0f",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      display: "flex", flexDirection: "column",
      position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 40,
    }}>
      {/* Logo */}
      <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, #FF4500 0%, #7c3aed 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 18px rgba(255,69,0,0.35)",
          }}>
            <SnooIcon style={{ width: 20, height: 20, fill: "#fff" }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#f0f0f0", letterSpacing: "-0.3px", lineHeight: 1 }}>
              Redddit
            </div>
            <div style={{ fontSize: 10.5, color: "#FF4500", fontWeight: 600, marginTop: 2 }}>
              AI Intelligence
            </div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname != null && (pathname === href || (href !== "/dashboard" && pathname.startsWith(href)));
          return (
            <Link key={href} href={href} style={{ textDecoration: "none", display: "block", marginBottom: 3 }}>
              <motion.div
                whileHover={{ x: 3 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 10,
                  background: active ? "rgba(255,69,0,0.12)" : "transparent",
                  border: `1px solid ${active ? "rgba(255,69,0,0.2)" : "transparent"}`,
                  color: active ? "#FF4500" : "#808088",
                  fontSize: 13.5, fontWeight: active ? 600 : 500,
                  transition: "all 0.15s",
                  cursor: "pointer",
                }}
              >
                <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                {label}
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    style={{
                      marginLeft: "auto", width: 6, height: 6,
                      borderRadius: "50%", background: "#FF4500",
                      boxShadow: "0 0 8px rgba(255,69,0,0.7)",
                    }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user + logout */}
      <div style={{ padding: "12px 10px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {/* Plan badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)",
          borderRadius: 8, padding: "6px 10px", marginBottom: 10,
        }}>
          <Zap size={12} style={{ color: "#7c3aed" }} />
          <span style={{ fontSize: 11.5, color: "#a070f0", fontWeight: 600 }}>
            {user?.subscription_tier?.toUpperCase() ?? "FREE"} PLAN
          </span>
        </div>

        {/* User row */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 2px", marginBottom: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "linear-gradient(135deg, #FF4500, #7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
          }}>
            {(user?.full_name?.[0] ?? user?.email?.[0] ?? "U").toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#e0e0e8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.full_name ?? "User"}
            </div>
            <div style={{ fontSize: 10.5, color: "#606068", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.email}
            </div>
          </div>
        </div>

        {/* Logout */}
        <motion.button
          onClick={handleLogout}
          whileHover={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#f87171" }}
          transition={{ duration: 0.15 }}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8,
            padding: "8px 12px", borderRadius: 9,
            background: "transparent", border: "1px solid transparent",
            color: "#606068", fontSize: 13, fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <LogOut size={14} />
          Sign out
        </motion.button>
      </div>
    </aside>
  );
}
