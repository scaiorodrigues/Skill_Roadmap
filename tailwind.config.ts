import type { Config } from "tailwindcss";

// Branco e a escala slate vêm de variáveis CSS (app/globals.css), que mudam entre tema claro e escuro.
const themed = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
const SLATE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        white: themed("white"),
        slate: Object.fromEntries(SLATE_STEPS.map((s) => [s, themed(`slate-${s}`)])),
      },
    },
  },
  plugins: [],
};

export default config;
