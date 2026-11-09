import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // "Warm Meridian" (docs/design/philosophy.md)
        ink: "#16202b",
        paper: "#f4efe6",
        surface: "#fffdf9",
        accent: {
          DEFAULT: "#2f6fb0",
          deep: "#235a91",
        },
        mist: "#e6ddd0",
        signal: "#b4472b",
        ember: "#c2643b",
        leaf: { DEFAULT: "#4a7a2e", soft: "#e4ecd9" },
        navy: "#16202b",
        // Legacy aliases used by older workspace screens
        moss: "#2f6fb0",
        clay: "#b4472b",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 0 rgba(22, 32, 43, 0.04), 0 12px 32px -24px rgba(22, 32, 43, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
