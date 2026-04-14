"use client";

import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from "recharts";

interface Props {
  positive?: number;
  negative?: number;
  neutral?: number;
}

const RADIAN = Math.PI / 180;

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: {
  cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number; name: string;
}) {
  if (percent < 0.06) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {(percent * 100).toFixed(0)}%
    </text>
  );
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={{
      background: "#1c1c1f", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10, padding: "8px 14px", fontSize: 13,
    }}>
      <span style={{ color: p.payload.color, fontWeight: 700 }}>{p.name}</span>
      <span style={{ color: "#a0a0a8", marginLeft: 8 }}>{p.value} posts</span>
    </div>
  );
}

export function SentimentDonut({ positive = 0, negative = 0, neutral = 0 }: Props) {
  const total = positive + negative + neutral;
  const hasData = total > 0;

  const DATA = hasData
    ? [
        { name: "Positive", value: positive, color: "#22c55e" },
        { name: "Neutral",  value: neutral,  color: "#eab308" },
        { name: "Negative", value: negative, color: "#ef4444" },
      ]
    : [
        { name: "Positive", value: 60, color: "#22c55e" },
        { name: "Neutral",  value: 25, color: "#eab308" },
        { name: "Negative", value: 15, color: "#ef4444" },
      ];

  const displayTotal = hasData
    ? total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total
    : "—";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      style={{
        background: "#161618", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 18, padding: "24px", height: "100%",
        display: "flex", flexDirection: "column",
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0" }}>Global Sentiment</div>
        <div style={{ fontSize: 12, color: "#606068", marginTop: 3 }}>
          {hasData ? `${total.toLocaleString()} posts analyzed` : "Sample data — connect a profile"}
        </div>
      </div>

      {/* Fixed-height wrapper so the center label aligns to the chart center */}
      <div style={{ position: "relative", height: 220, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={DATA}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              labelLine={false}
              label={CustomLabel as unknown as boolean}
              animationBegin={200}
              animationDuration={900}
            >
              {DATA.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label — sits exactly over the donut hole */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center", pointerEvents: "none",
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f0f0f0", lineHeight: 1 }}>{displayTotal}</div>
          <div style={{ fontSize: 10.5, color: "#606068", marginTop: 4 }}>total</div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 12, marginTop: 14, justifyContent: "center" }}>
        {DATA.map((d) => (
          <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
            <span style={{ fontSize: 12, color: "#a0a0a8" }}>{d.name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
