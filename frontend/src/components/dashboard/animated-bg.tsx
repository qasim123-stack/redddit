"use client";

import { useEffect, useRef } from "react";

export function AnimatedGradientBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let rafId: number;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Particles
    const PARTICLES = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      color: Math.random() > 0.55 ? "#FF4500" : "#7c3aed",
      opacity: Math.random() * 0.45 + 0.1,
    }));

    const tick = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle radial orbs
      const cx = canvas.width * 0.72;
      const cy = canvas.height * 0.3;
      const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 420);
      g1.addColorStop(0, "rgba(255,69,0,0.04)");
      g1.addColorStop(1, "transparent");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx2 = canvas.width * 0.15;
      const cy2 = canvas.height * 0.75;
      const g2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, 340);
      g2.addColorStop(0, "rgba(124,58,237,0.05)");
      g2.addColorStop(1, "transparent");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Move + draw particles
      for (const p of PARTICLES) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity * (0.6 + 0.4 * Math.sin(frame * 0.015 + p.x));
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Connection lines between nearby orange particles
      for (let i = 0; i < PARTICLES.length; i++) {
        for (let j = i + 1; j < PARTICLES.length; j++) {
          const dx = PARTICLES[i].x - PARTICLES[j].x;
          const dy = PARTICLES[i].y - PARTICLES[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(PARTICLES[i].x, PARTICLES[i].y);
            ctx.lineTo(PARTICLES[j].x, PARTICLES[j].y);
            ctx.strokeStyle = PARTICLES[i].color === "#FF4500" ? "#FF4500" : "#7c3aed";
            ctx.globalAlpha = (1 - dist / 110) * 0.06;
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0, zIndex: 0,
        pointerEvents: "none", opacity: 0.9,
      }}
    />
  );
}
