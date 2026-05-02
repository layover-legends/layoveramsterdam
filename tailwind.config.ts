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
    },
  },
  plugins: [],
};

export default config;
