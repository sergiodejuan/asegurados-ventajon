import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Sistema visual Asegurados Ventajon (Estrategia §8)
        navy: {
          DEFAULT: "#1B2B6B", // azul marino dominante
          deep: "#12204F",
          soft: "#31418A",
        },
        brand: {
          red: "#C8312A", // acento e identidad
          "red-deep": "#A8261F",
        },
        ink: "#1C2333", // texto principal
        slate2: "#5A6473", // texto secundario
        mist: "#F5F7FB", // fondo
        hair: "#E4E8F0", // hairline / bordes
        mint: {
          DEFAULT: "#E4F3F0", // banner promo (estilo referencia)
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
        spin: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        "fade-up": "fade-up 260ms cubic-bezier(0.22,1,0.36,1)",
      },
    },
  },
  plugins: [],
};

export default config;
