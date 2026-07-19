import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Sistema visual Asegurados Ventajon (Estrategia §8). Los valores son
        // variables CSS (ver app/layout.tsx + lib/theme.ts) para que sean
        // editables desde /admin/diseno sin tocar ninguna clase de Tailwind.
        navy: {
          DEFAULT: "var(--color-navy)",
          deep: "var(--color-navy-deep)",
          soft: "var(--color-navy-soft)",
        },
        brand: {
          red: "var(--color-brand-red)",
          "red-deep": "var(--color-brand-red-deep)",
        },
        ink: "var(--color-ink)",
        slate2: "var(--color-slate2)",
        mist: "var(--color-mist)",
        hair: "var(--color-hair)",
        mint: {
          DEFAULT: "#E4F3F0", // banner promo (estilo referencia) — no editable
          deep: "#0E5A4E",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "18px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(18,32,79,0.04), 0 12px 32px -12px rgba(18,32,79,0.16)",
        soft: "0 1px 2px rgba(18,32,79,0.05)",
      },
      maxWidth: {
        app: "460px", // contenedor mobile-first
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "loader-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.05)", opacity: "0.85" },
        },
        spin: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        "fade-up": "fade-up 260ms cubic-bezier(0.22,1,0.36,1)",
        "slide-in-left": "slide-in-left 300ms cubic-bezier(0.22,1,0.36,1)",
        "loader-pulse": "loader-pulse 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
