"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string; // e.g. "#FF4500"
  suffix?: string;
  delay?: number;
}

function useCountUp(target: number, duration = 1400, start = false) {
  const [current, setCurrent] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!start) return;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration, start]);

  return current;
}

export function StatCard({ label, value, icon: Icon, color, suffix = "", delay = 0 }: StatCardProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const count = useCountUp(value, 1600, visible);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      animate={visible ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.45, ease: "easeOut", delay }}
      whileHover={{ y: -3, boxShadow: `0 8px 32px ${color}22, 0 0 0 1px ${color}22` }}
      style={{
        flex: 1, minWidth: 0,
        background: "#161618",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 18, padding: "22px 24px",
        cursor: "default", position: "relative", overflow: "hidden",
        transition: "box-shadow 0.25s",
      }}
    >
      {/* Glow accent top-right */}
      <div style={{
        position: "absolute", top: -30, right: -30,
        width: 100, height: 100, borderRadius: "50%",
        background: color, opacity: 0.07, filter: "blur(30px)",
        pointerEvents: "none",
      }} />

      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: `${color}18`, border: `1px solid ${color}28`,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 14,
      }}>
        <Icon size={18} style={{ color }} strokeWidth={2} />
      </div>

      {/* Number */}
      <div style={{ fontSize: 34, fontWeight: 800, color: "#f0f0f0", letterSpacing: "-1px", lineHeight: 1, marginBottom: 6 }}>
        {count.toLocaleString()}{suffix}
      </div>

      {/* Label */}
      <div style={{ fontSize: 13, color: "#808088", fontWeight: 500 }}>{label}</div>

      {/* Bottom accent line */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${color}00, ${color}60, ${color}00)`,
      }} />
    </motion.div>
  );
}
