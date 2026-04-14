import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Redddit AI — Reddit Marketing Intelligence",
  description: "Monitor Reddit, detect crises, and surface trends with AI-powered analysis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body
        className="min-h-full flex flex-col antialiased"
        style={{ fontFamily: "var(--font-inter), Inter, sans-serif", background: "#111113", color: "#f0f0f0" }}
      >
        <Providers>
          {children}
          <Toaster
            position="top-right"
            theme="dark"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: "#161618",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#f0f0f0",
                fontFamily: "var(--font-inter), Inter, sans-serif",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
