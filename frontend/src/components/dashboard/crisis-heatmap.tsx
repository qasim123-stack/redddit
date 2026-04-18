"use client";

import { useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import * as d3 from "d3";

interface DayData {
  date: string; // "YYYY-MM-DD"
  severity: number; // 0–4
  count: number;
}

function generateSampleData(): DayData[] {
  const days: DayData[] = [];
  const today = new Date();
  for (let i = 181; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const r = Math.random();
    let severity = 0, count = 0;
    if (r > 0.75) { severity = 1; count = Math.floor(Math.random() * 3) + 1; }
    if (r > 0.88) { severity = 2; count = Math.floor(Math.random() * 4) + 2; }
    if (r > 0.95) { severity = 3; count = Math.floor(Math.random() * 5) + 3; }
    if (r > 0.99) { severity = 4; count = Math.floor(Math.random() * 6) + 5; }
    days.push({ date: dateStr, severity, count });
  }
  return days;
}

const SEV_COLORS = ["#232327", "#eab308", "#f97316", "#ef4444", "#dc2626"];
const SEV_LABELS = ["None", "Low", "Medium", "High", "Critical"];

interface Props { data?: DayData[] }

export function CrisisHeatmap({ data: rawData }: Props) {
  // Stable sample data — generated once
  const data = useMemo(() => rawData ?? generateSampleData(), [rawData]);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const CELL = 14;
    const GAP  = 3;
    const STEP = CELL + GAP;

    // Build a map date→data for fast lookup
    const byDate = new Map(data.map(d => [d.date, d]));

    // Start from the first date in data, aligned to Sunday
    const firstDate = new Date(data[0].date);
    const startDow = firstDate.getDay(); // 0=Sun
    // go back to the Sunday of that week
    const startDate = new Date(firstDate);
    startDate.setDate(firstDate.getDate() - startDow);

    const lastDate = new Date(data[data.length - 1].date);
    const endDow   = lastDate.getDay();
    const endDate  = new Date(lastDate);
    endDate.setDate(lastDate.getDate() + (6 - endDow)); // forward to Saturday

    // Total days from startDate to endDate
    const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
    const weeks = Math.ceil(totalDays / 7);

    const LEFT_PAD = 34;
    const TOP_PAD  = 22;
    const W = LEFT_PAD + weeks * STEP;
    const H = TOP_PAD + 7 * STEP;

    d3.select(svg).selectAll("*").remove();
    d3.select(svg).attr("width", W).attr("height", H);

    const g = d3.select(svg).append("g").attr("transform", `translate(${LEFT_PAD},${TOP_PAD})`);

    // Day-of-week labels (Sun→Sat, only show Mon/Wed/Fri)
    ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach((label, i) => {
      if (![1,3,5].includes(i)) return;
      g.append("text")
        .attr("x", -5).attr("y", i * STEP + CELL / 2)
        .attr("text-anchor", "end").attr("dominant-baseline", "central")
        .attr("font-size", 9).attr("fill", "#606068").attr("font-family", "Inter,sans-serif")
        .text(label);
    });

    // Month labels — only when month changes at the start of a week
    let lastMonth = -1;
    for (let w = 0; w < weeks; w++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + w * 7);
      if (weekStart.getMonth() !== lastMonth) {
        lastMonth = weekStart.getMonth();
        g.append("text")
          .attr("x", w * STEP).attr("y", -6)
          .attr("font-size", 9).attr("fill", "#808088").attr("font-family", "Inter,sans-serif")
          .text(weekStart.toLocaleString("default", { month: "short" }));
      }
    }

    // Draw cells
    for (let i = 0; i < totalDays; i++) {
      const cur = new Date(startDate);
      cur.setDate(startDate.getDate() + i);
      const dateStr = cur.toISOString().slice(0, 10);
      const d = byDate.get(dateStr) ?? { date: dateStr, severity: 0, count: 0 };

      const col = Math.floor(i / 7);
      const row = i % 7;

      const rect = g.append("rect")
        .attr("x", col * STEP).attr("y", row * STEP)
        .attr("width", CELL).attr("height", CELL)
        .attr("rx", 2.5)
        .attr("fill", SEV_COLORS[d.severity])
        .attr("opacity", 0);

      rect.transition().delay(i * 0.8).duration(180).attr("opacity", 1);

      if (d.severity > 0) {
        rect.style("cursor", "pointer")
          .on("mouseover", function (event) {
            d3.select(this).attr("stroke", "#fff").attr("stroke-width", 1.5);
            d3.select("#crisis-hm-tip")
              .style("opacity", 1)
              .style("left", `${(event as MouseEvent).pageX + 12}px`)
              .style("top", `${(event as MouseEvent).pageY - 32}px`)
              .html(`<b style="color:${SEV_COLORS[d.severity]}">${SEV_LABELS[d.severity]}</b>&nbsp;— ${d.count} alert${d.count !== 1 ? "s" : ""}<br/><span style="color:#606068;font-size:10px">${d.date}</span>`);
          })
          .on("mouseout", function () {
            d3.select(this).attr("stroke", "none");
            d3.select("#crisis-hm-tip").style("opacity", 0);
          });
      }
    }
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.45 }}
      style={{
        background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 18, padding: "24px",
      }}
    >
      <div style={{ marginBottom: 18, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0" }}>Crisis Severity Calendar</div>
          <div style={{ fontSize: 12, color: "#606068", marginTop: 3 }}>Last 6 months — hover for details</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10.5, color: "#606068" }}>Less</span>
          {SEV_COLORS.map((c, i) => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: 3, background: c, border: "1px solid rgba(255,255,255,0.06)" }} title={SEV_LABELS[i]} />
          ))}
          <span style={{ fontSize: 10.5, color: "#606068" }}>More</span>
        </div>
      </div>

      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <svg ref={svgRef} style={{ display: "block" }} />
      </div>

      <div
        id="crisis-hm-tip"
        style={{
          position: "fixed", zIndex: 9999, pointerEvents: "none",
          background: "#1c1c1f", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, padding: "8px 14px", fontSize: 12.5,
          color: "#e0e0e8", lineHeight: 1.6, opacity: 0,
          transition: "opacity 0.12s", fontFamily: "Inter,sans-serif",
        }}
      />
    </motion.div>
  );
}
