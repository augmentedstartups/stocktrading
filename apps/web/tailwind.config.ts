import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        ink: "var(--ink)",
        steel: "var(--steel)",
        whisper: "var(--whisper)",
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
          ink: "var(--accent-ink)",
        },
        caution: "var(--caution)",
        risk: "var(--risk)",
        muted: "var(--muted)",
        ring: "var(--ring)",
        border: "var(--border)",
        input: "var(--input)",
        background: "var(--canvas)",
        foreground: "var(--ink)",
        card: "var(--surface)",
        "card-foreground": "var(--ink)",
        popover: "var(--surface)",
        "popover-foreground": "var(--ink)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-cabinet)", "var(--font-geist-sans)", "sans-serif"],
      },
      borderRadius: {
        bento: "2.5rem",
        chip: "1rem",
      },
      boxShadow: {
        diffuse: "0 20px 40px -15px rgba(0,0,0,0.05)",
        "inset-line": "inset 0 1px 0 rgba(255,255,255,0.6)",
      },
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.85)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
