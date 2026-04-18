"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { AnimatedBeam } from "./animated-beam";
import { cn } from "@/lib/utils";

const Circle = React.forwardRef<
  HTMLDivElement,
  {
    className?: string;
    children?: React.ReactNode;
  }
>(({ className, children }, ref) => (
  <div
    ref={ref}
    className={cn(
      "z-10 flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-sm shadow-lg",
      className,
    )}
  >
    {children}
  </div>
));
Circle.displayName = "Circle";

export function AuthBeamScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const redditRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const trendRef = useRef<HTMLDivElement>(null);
  const crisisRef = useRef<HTMLDivElement>(null);
  const insightRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
    >
      {/* Node grid */}
      <div className="flex flex-col items-center gap-10 z-10">
        {/* Row 1 */}
        <div className="flex gap-16 items-center">
          <Circle ref={redditRef} className="size-14">
            <RedditIcon />
          </Circle>
          <Circle ref={aiRef} className="size-14">
            <BrainIcon />
          </Circle>
        </div>

        {/* Center hub */}
        <Circle
          ref={centerRef}
          className="size-20 border-primary/40 bg-primary/10 glow-brand"
        >
          <LogoIcon />
        </Circle>

        {/* Row 2 */}
        <div className="flex gap-16 items-center">
          <Circle ref={trendRef} className="size-14">
            <TrendIcon />
          </Circle>
          <Circle ref={crisisRef} className="size-14">
            <AlertIcon />
          </Circle>
        </div>

        {/* Row 3 */}
        <Circle ref={insightRef} className="size-14">
          <InsightIcon />
        </Circle>
      </div>

      {/* Beams */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={redditRef}
        toRef={centerRef}
        curvature={-30}
        gradientStartColor="#ff4500"
        gradientStopColor="#ff6534"
        duration={4}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={aiRef}
        toRef={centerRef}
        curvature={30}
        gradientStartColor="#7c3aed"
        gradientStopColor="#a855f7"
        duration={5}
        delay={0.5}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={centerRef}
        toRef={trendRef}
        curvature={-30}
        gradientStartColor="#6366f1"
        gradientStopColor="#22d3ee"
        duration={4.5}
        delay={1}
        reverse
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={centerRef}
        toRef={crisisRef}
        curvature={30}
        gradientStartColor="#f43f5e"
        gradientStopColor="#fb923c"
        duration={5}
        delay={1.5}
        reverse
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={centerRef}
        toRef={insightRef}
        gradientStartColor="#10b981"
        gradientStopColor="#6366f1"
        duration={6}
        delay={0.8}
        reverse
      />
    </div>
  );
}

/* ── Inline SVG icons ── */
function RedditIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-6 fill-[#ff4500]">
      <circle cx="10" cy="10" r="10" fill="#ff4500" />
      <path
        fill="white"
        d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.08 2.13.45a1 1 0 1 0 1-.95 1 1 0 0 0-.95.68l-2.38-.5a.14.14 0 0 0-.17.1l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .61-1.53ZM7.27 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1Zm5.58 2.71a3.58 3.58 0 0 1-2.85.71 3.58 3.58 0 0 1-2.85-.71.22.22 0 0 1 .31-.31 3.15 3.15 0 0 0 2.54.56 3.15 3.15 0 0 0 2.54-.56.22.22 0 0 1 .31.31Zm-.17-1.71a1 1 0 1 1 1-1 1 1 0 0 1-1 1Z"
      />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="#a855f7" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  );
}

function LogoIcon() {
  return (
    <svg viewBox="0 0 32 32" className="size-9" fill="none">
      <circle cx="16" cy="16" r="14" fill="url(#logoGrad)" />
      <path d="M10 16l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff4500"/>
          <stop offset="1" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="#22d3ee" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="#f43f5e" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}

function InsightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="#10b981" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
    </svg>
  );
}
