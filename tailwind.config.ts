import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#000000",
          900: "#000000",
          850: "#000000",
          800: "#16181c",
          700: "#2f3336",
          600: "#3e4144",
        },
        ink: {
          50: "#ffffff",
          100: "#e7e9ea",
          200: "#d0d3d5",
          300: "#a0a6ab",
          400: "#71767b",
          500: "#536471",
        },
        mint: {
          300: "#4fe0a8",
          400: "#2ed19a",
          500: "#00ba7c",
          600: "#00a56e",
        },
        warn: "#ffd400",
        danger: "#f4212e",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Noto Sans",
          "Noto Sans Bengali",
          "Kalpurush",
          "Nikosh",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
