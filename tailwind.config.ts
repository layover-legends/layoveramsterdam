import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "ink-black":   "#0D0D0D",  // primary bg, dark text on light
        "legend-gold": "#C9963A",  // accent, CTAs, logo
        "gold-light":  "#E0AA45",  // hover states, highlights
        "gold-dark":   "#A07828",  // pressed, on light bg
        "warm-cream":  "#F7F3EC",  // light bg, text on dark
        "canal-blue":  "#1B4F72",  // secondary, Amsterdam identity
        "canal-light": "#2E86C1",  // links, info states
        "muted":       "#888888",  // secondary text, labels
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "Garamond", "serif"],
        sans:    ["var(--font-outfit)", "system-ui", "sans-serif"],
        mono:    ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      // Blueprint+ B3 — motion language tokens
      animation: {
        "fade-in-up":      "fadeInUp 0.5s ease-out both",
        "price-shimmer":   "priceShimmer 0.4s ease-out both",
        "cta-pulse":       "ctaPulse 2s ease-in-out infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        priceShimmer: {
          "0%":   { opacity: "0.4" },
          "100%": { opacity: "1" },
        },
        ctaPulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(201,150,58,0)" },
          "50%":      { boxShadow: "0 0 0 8px rgba(201,150,58,0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
