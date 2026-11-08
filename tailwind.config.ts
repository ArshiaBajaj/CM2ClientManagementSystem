import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0f1a",
        paper: "#eef2f8",
        surface: "#ffffff",
        accent: {
          DEFAULT: "#3b7fc4",
          deep: "#245f9a",
        },
        mist: "#d7e3f2",
        signal: "#c2410c",
        // Keep legacy aliases so any missed class still resolves during migration
        moss: "#3b7fc4",
        clay: "#c2410c",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 50px -28px rgba(10, 15, 26, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
