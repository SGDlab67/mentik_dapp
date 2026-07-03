import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        mentik: {
          bg: "#0a0a0f",
          card: "#12121a",
          border: "#1e1e2e",
          accent: "#7c3aed",
          "accent-hover": "#6d28d9",
          green: "#22c55e",
          red: "#ef4444",
          muted: "#6b7280",
          text: "#e5e7eb",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
  corePlugins: {
    // Preflight resets element defaults globally; the existing PoolDashboard
    // uses hand-written CSS that relies on browser default spacing, so keep it off.
    preflight: false,
  },
};

export default config;
