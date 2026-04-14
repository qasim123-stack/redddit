"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { loginUser, getCurrentUser } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/store/auth-store";
import { SnooIcon } from "@/components/icons/snoo";
import { signIn } from "next-auth/react";

const schema = z.object({
  email:    z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});
type FormData = z.infer<typeof schema>;

const INPUT: React.CSSProperties = {
  width: "100%", height: 48, background: "#1c1c1f",
  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
  color: "#f5f5f5", fontSize: 15, fontFamily: "inherit",
  padding: "0 14px 0 42px", outline: "none",
  transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
};
const LABEL: React.CSSProperties = {
  display: "block", fontSize: 13.5, fontWeight: 600,
  color: "#c0c0c8", marginBottom: 8,
};

/** Entrance animation variants — one child per stagger step */
const ITEM = {
  hidden: { opacity: 0, y: 22, filter: "blur(3px)" },
  show:   { opacity: 1, y: 0,  filter: "blur(0px)" },
};
const CONTAINER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.02 } },
};

export default function LoginPage() {
  const router      = useRouter();
  const { setAuth } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const [busy,   setBusy]   = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "rgba(255,69,0,0.55)";
    e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(255,69,0,0.12)";
    e.currentTarget.style.background  = "#242428";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
    e.currentTarget.style.boxShadow   = "none";
    e.currentTarget.style.background  = "#1c1c1f";
  };

  const onSubmit = async (data: FormData) => {
    setBusy(true);
    try {
      // const token = await loginUser(data);
      // const user  = await getCurrentUser(token.access_token);
      // setAuth(token.access_token, user);
      // toast.success(`Welcome back, ${user.full_name}!`);
      router.push("/dashboard");
    } catch (e) {
      toast.error("Sign in failed", { description: e instanceof Error ? e.message : "Check your credentials." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      variants={CONTAINER}
      initial="hidden"
      animate="show"
      style={{ fontFamily: "Inter, sans-serif", width: "100%" }}
    >
      {/* Heading */}
      <motion.div variants={ITEM} transition={{ duration: 0.3, ease: "easeOut" }}>
        <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-1px", color: "#fff", margin: 0, lineHeight: 1.1 }}>
          Welcome back
        </h2>
        <p style={{ marginTop: 8, marginBottom: 30, fontSize: 15.5, color: "#a0a0a8", lineHeight: 1.5 }}>
          Sign into your intelligence dashboard
        </p>
      </motion.div>

      {/* Card */}
      <motion.div
        variants={ITEM}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{ background: "#161618", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 30, boxShadow: "0 24px 72px rgba(0,0,0,0.5)" }}
      >
        {/* Tab switcher */}
        <motion.div
          variants={ITEM}
          transition={{ duration: 0.28, ease: "easeOut" }}
          style={{ display: "flex", gap: 4, marginBottom: 26, background: "#1c1c1f", padding: 4, borderRadius: 12 }}
        >
          <div style={{ flex: 1, height: 38, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, background: "#FF4500", color: "#fff", boxShadow: "0 0 18px rgba(255,69,0,0.4)", cursor: "default" }}>
            Sign in
          </div>
          <Link href="/register" style={{ flex: 1, textDecoration: "none" }}>
            <div style={{ height: 38, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "#808088", transition: "color 0.15s" }}>
              Create account
            </div>
          </Link>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Email */}
          <motion.div
            variants={ITEM}
            transition={{ duration: 0.28, ease: "easeOut" }}
            style={{ marginBottom: 20 }}
          >
            <label style={LABEL}>Email address</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#606068", display: "flex" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </span>
              <input type="email" placeholder="you@company.com" autoComplete="email" disabled={busy}
                {...register("email")} style={INPUT} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <AnimatePresence mode="wait">
              {errors.email && <FieldErr key="em" msg={errors.email.message!} />}
            </AnimatePresence>
          </motion.div>

          {/* Password */}
          <motion.div
            variants={ITEM}
            transition={{ duration: 0.28, ease: "easeOut" }}
            style={{ marginBottom: 20 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ ...LABEL, margin: 0 }}>Password</label>
              <button type="button" style={{ fontSize: 12.5, color: "#FF4500", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                Forgot password?
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#606068", display: "flex" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
              <input type={showPw ? "text" : "password"} placeholder="••••••••" autoComplete="current-password"
                disabled={busy} {...register("password")}
                style={{ ...INPUT, paddingRight: 42 }} onFocus={onFocus} onBlur={onBlur} />
              <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#606068", display: "flex", padding: 0 }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <AnimatePresence mode="wait">
              {errors.password && <FieldErr key="pw" msg={errors.password.message!} />}
            </AnimatePresence>
          </motion.div>

          {/* Remember me */}
          <motion.div
            variants={ITEM}
            transition={{ duration: 0.28, ease: "easeOut" }}
            style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}
          >
            <input type="checkbox" id="rem" style={{ width: 16, height: 16, accentColor: "#FF4500", cursor: "pointer" }} />
            <label htmlFor="rem" style={{ fontSize: 13.5, color: "#a0a0a8", cursor: "pointer" }}>
              Remember me for 30 days
            </label>
          </motion.div>

          {/* CTA Button */}
          <motion.div variants={ITEM} transition={{ duration: 0.28, ease: "easeOut" }}>
            <motion.button
              type="submit" disabled={busy}
              whileHover={{ scale: 1.02, y: -2, boxShadow: "0 0 40px rgba(255,69,0,0.6), 0 8px 24px rgba(255,69,0,0.35)" }}
              whileTap={{ scale: 0.975 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              style={{
                width: "100%", height: 48, background: "#FF4500", color: "#fff",
                fontSize: 15, fontWeight: 700, fontFamily: "inherit",
                border: "none", borderRadius: 12, cursor: busy ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 0 28px rgba(255,69,0,0.45), 0 4px 16px rgba(255,69,0,0.25)",
                opacity: busy ? 0.7 : 1,
                position: "relative", overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(255,255,255,0.1),transparent)", pointerEvents: "none" }} />
              {busy
                ? <><Loader2 size={17} className="animate-spin" /> Signing in…</>
                : <>Sign in <span style={{ marginLeft: 4, fontSize: 18 }}>→</span></>
              }
            </motion.button>
          </motion.div>
        </form>

        {/* Divider */}
        <motion.div
          variants={ITEM}
          transition={{ duration: 0.28, ease: "easeOut" }}
          style={{ position: "relative", margin: "22px 0", display: "flex", alignItems: "center" }}
        >
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          <span style={{ padding: "0 14px", fontSize: 12.5, color: "#606068", background: "#161618" }}>or continue with</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
        </motion.div>

        {/* Google button */}
        <motion.div variants={ITEM} transition={{ duration: 0.28, ease: "easeOut" }}>
          <motion.button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            whileHover={{ scale: 1.015, y: -1, borderColor: "rgba(255,255,255,0.3)" }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            style={{
              width: "100%", height: 48, background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
              color: "#f0f0f0", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              cursor: "pointer", marginBottom: 12,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </motion.button>
        </motion.div>

        {/* Reddit button */}
        <motion.div variants={ITEM} transition={{ duration: 0.28, ease: "easeOut" }}>
          <motion.button
            whileHover={{ scale: 1.015, y: -1, borderColor: "rgba(255,69,0,0.35)" }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            style={{
              width: "100%", height: 48, background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
              color: "#f0f0f0", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              cursor: "pointer",
            }}
          >
            <SnooIcon style={{ width: 19, height: 19, fill: "#FF4500" }} />
            Continue with Reddit account
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Sign up */}
      <motion.p
        variants={ITEM}
        transition={{ duration: 0.28, ease: "easeOut" }}
        style={{ marginTop: 24, textAlign: "center", fontSize: 14, color: "#a0a0a8" }}
      >
        Don&apos;t have an account?{" "}
        <Link href="/register" style={{ color: "#FF4500", fontWeight: 700, textDecoration: "none" }}>
          Sign up free →
        </Link>
      </motion.p>
    </motion.div>
  );
}

function FieldErr({ msg }: { msg: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -6, height: 0 }}
      animate={{ opacity: 1, y: 0,  height: "auto" }}
      exit={{    opacity: 0, y: -6, height: 0 }}
      transition={{ duration: 0.18 }}
      style={{ fontSize: 12, color: "#f87171", margin: "6px 0 0 0", display: "flex", alignItems: "center", gap: 5, overflow: "hidden" }}
    >
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#f87171", flexShrink: 0, display: "inline-block" }} />
      {msg}
    </motion.p>
  );
}
