import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Verdict tones — see globals.css. Not additional accents: they tint
        // verdict surfaces only. Actions stay on --primary.
        positive: {
          DEFAULT: "hsl(var(--positive))",
          foreground: "hsl(var(--positive-foreground))",
          soft: "hsl(var(--positive-soft))",
          border: "hsl(var(--positive-border))",
        },
        attention: {
          DEFAULT: "hsl(var(--attention))",
          foreground: "hsl(var(--attention-foreground))",
          soft: "hsl(var(--attention-soft))",
          border: "hsl(var(--attention-border))",
        },
        neutral: {
          DEFAULT: "hsl(var(--neutral))",
          foreground: "hsl(var(--neutral-foreground))",
          soft: "hsl(var(--neutral-soft))",
          border: "hsl(var(--neutral-border))",
        },
        // --- Eligent merge: the "Clay" design system's palette, copied in
        // alongside ours (unused by any page yet — see MERGE REPORT). Literal
        // hex, not hsl(var(--x)): these are a second, independent token set,
        // not additions to our own --positive/--attention/--neutral scale.
        ink: "#171525",
        muted2: "#6b6476",
        soft2: "#8b8398",
        line: { DEFAULT: "#e9dfcf", strong: "#d9ccb6" },
        cobalt: {
          DEFAULT: "#5146f5", dark: "#4238dd", deep: "#2f27a5", tint: "#efedff", "tint-2": "#e2dfff",
        },
        coral: {
          DEFAULT: "#ff5c7a", dark: "#ee4a68", deep: "#b22b43", tint: "#ffe9ee", "tint-2": "#ffd6df",
        },
        lime: { DEFAULT: "#c7f36b", dark: "#a9da41", ink: "#263608", tint: "#f2ffd9" },
        sand: { DEFAULT: "#fbf3e7", deep: "#f3e7d3" },
        bg: "#fff8f0",
        surface: "#ffffff",
      },
      fontFamily: {
        // --- Eligent merge: Space Grotesk, for anything built with the Clay
        // components. Our own pages keep using the default (Inter) sans stack.
        display: ["var(--font-space-grotesk)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "clay-sm":
          "0 1px 2px rgba(23,21,37,0.05), 0 8px 20px -12px rgba(23,21,37,0.16), inset 0 1px 0 rgba(255,255,255,0.95)",
        clay: "0 1px 2px rgba(23,21,37,0.05), 0 18px 44px -22px rgba(23,21,37,0.2), inset 0 1px 0 rgba(255,255,255,0.95)",
        "clay-hover":
          "0 2px 4px rgba(23,21,37,0.05), 0 28px 54px -20px rgba(23,21,37,0.26), inset 0 1px 0 rgba(255,255,255,0.98)",
        "clay-inset": "inset 0 2px 5px rgba(23,21,37,0.055), inset 0 -1px 0 rgba(255,255,255,0.85)",
        cobalt: "0 2px 0 rgba(36,28,130,0.35), 0 12px 22px -10px rgba(81,70,245,0.55), inset 0 1px 0 rgba(255,255,255,0.2)",
        coral: "0 2px 0 rgba(150,24,55,0.35), 0 12px 22px -10px rgba(255,92,122,0.55), inset 0 1px 0 rgba(255,255,255,0.2)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Eligent merge.
        clay: "22px",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;