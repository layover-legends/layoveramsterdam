import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#F97316",
          navy: "#0F172A",
          cream: "#FFF7ED",
        },
      },
      fontFamily: {
        display: ["ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
