"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import * as d3 from "d3";

interface Word {
  topic: string;
  count: number;
  sentiment_score?: number;
}

const SAMPLE_WORDS: Word[] = [
  { topic: "AI pricing",        count: 142, sentiment_score: -0.4 },
  { topic: "customer service",  count: 98,  sentiment_score: -0.6 },
  { topic: "subscription",      count: 87,  sentiment_score: -0.2 },
  { topic: "open source",       count: 76,  sentiment_score: 0.7 },
  { topic: "automation",        count: 65,  sentiment_score: 0.3 },
  { topic: "privacy",           count: 61,  sentiment_score: -0.35 },
  { topic: "GPT-4",             count: 59,  sentiment_score: 0.5 },
  { topic: "burnout",           count: 54,  sentiment_score: -0.7 },
  { topic: "startup funding",   count: 48,  sentiment_score: 0.2 },
  { topic: "layoffs",           count: 45,  sentiment_score: -0.8 },
  { topic: "remote work",       count: 42,  sentiment_score: 0.4 },
  { topic: "SaaS",              count: 38,  sentiment_score: 0.1 },
  { topic: "regulations",       count: 35,  sentiment_score: -0.3 },
  { topic: "product launch",    count: 31,  sentiment_score: 0.6 },
  { topic: "data breach",       count: 28,  sentiment_score: -0.9 },
  { topic: "user retention",    count: 25,  sentiment_score: -0.1 },
  { topic: "UX redesign",       count: 22,  sentiment_score: 0.3 },
  { topic: "community",         count: 19,  sentiment_score: 0.8 },
  { topic: "API limits",        count: 17,  sentiment_score: -0.5 },
  { topic: "growth hacking",    count: 14,  sentiment_score: 0.2 },
];

function sentimentColor(score: number): string {
  if (score > 0.3) return "#22c55e";
  if (score < -0.3) return "#ef4444";
  return "#eab308";
}

interface Props { words?: Word[] }

export function TopicWordCloud({ words = SAMPLE_WORDS }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const W = svg.clientWidth || 480;
    const H = 280;

    const sorted = [...words].sort((a, b) => b.count - a.count);
    const maxCount = sorted[0]?.count ?? 1;

    const fontScale = d3.scaleLinear()
      .domain([0, maxCount])
      .range([11, 34]);

    // Simple bin packing placement (spiral)
    const placed: { x: number; y: number; w: number; h: number }[] = [];

    function overlaps(x: number, y: number, w: number, h: number) {
      return placed.some(p =>
        Math.abs(x - p.x) < (w + p.w) / 2 + 10 &&
        Math.abs(y - p.y) < (h + p.h) / 2 + 8
      );
    }

    function spiral(attempt: number): { x: number; y: number } {
      const t = attempt * 0.28;
      const r = 8 + t * 6.5;
      return { x: W / 2 + r * Math.cos(t), y: H / 2 + r * Math.sin(t) * 0.7 };
    }

    d3.select(svg).selectAll("*").remove();

    const g = d3.select(svg)
      .attr("width", W)
      .attr("height", H)
      .append("g");

    sorted.forEach((word, idx) => {
      const fs = fontScale(word.count);
      const charW = fs * 0.6;
      const wordW = word.topic.length * charW;
      const wordH = fs * 1.3;
      const color = sentimentColor(word.sentiment_score ?? 0);

      let pos = spiral(0);
      let attempt = 0;
      while (overlaps(pos.x, pos.y, wordW, wordH) && attempt < 600) {
        pos = spiral(++attempt);
      }
      if (attempt >= 600) return;
      placed.push({ x: pos.x, y: pos.y, w: wordW, h: wordH });

      g.append("text")
        .attr("x", pos.x)
        .attr("y", pos.y)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("font-size", fs)
        .attr("font-weight", idx < 5 ? 800 : idx < 10 ? 700 : 600)
        .attr("fill", color)
        .attr("opacity", 0)
        .attr("font-family", "Inter, sans-serif")
        .text(word.topic)
        .transition()
        .delay(idx * 30)
        .duration(450)
        .attr("opacity", 0.75 + Math.min(word.count / maxCount, 1) * 0.25)
        .attr("cursor", "default")
        .on("end", function () {
          d3.select(this)
            .on("mouseover", function () { d3.select(this).attr("opacity", 1).attr("font-weight", 900); })
            .on("mouseout", function () { d3.select(this).attr("opacity", 0.75 + Math.min(word.count / maxCount, 1) * 0.25).attr("font-weight", idx < 5 ? 800 : idx < 10 ? 700 : 600); });
        });
    });
  }, [words]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.4 }}
      style={{
        background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 18, padding: "24px", height: "100%",
        display: "flex", flexDirection: "column",
      }}
    >
      <div style={{ marginBottom: 16, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0" }}>Trending Topics</div>
          <div style={{ fontSize: 12, color: "#606068", marginTop: 3 }}>Word cloud — color = sentiment</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {[["#22c55e", "Positive"], ["#eab308", "Neutral"], ["#ef4444", "Negative"]].map(([c, l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
              <span style={{ fontSize: 10.5, color: "#808088" }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", borderRadius: 10, background: "rgba(255,255,255,0.02)" }}>
        <svg ref={svgRef} style={{ width: "100%", height: "100%", minHeight: 280 }} />
      </div>
    </motion.div>
  );
}
