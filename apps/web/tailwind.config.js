/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Modern marketplace palette. Brand is a deeper, less neon teal-green;
        // surfaces are a soft warm-gray that reads as paper rather than dashboard.
        brand: {
          50: "#eef9f3",
          100: "#d6f1e3",
          200: "#aee2c5",
          300: "#76cd9f",
          400: "#41b178",
          500: "#1f9255",
          600: "#137442",
          700: "#0f5c35",
          800: "#0d4929",
          900: "#0a3a21",
          DEFAULT: "#1f9255",
          dark: "#137442",
        },
        // Warm neutral surface scale
        surface: {
          0: "#ffffff",
          50: "#fafaf7",
          100: "#f3f2ed",
          200: "#e8e6df",
          300: "#d3d0c4",
          400: "#a8a496",
          500: "#7b776a",
        },
        ink: {
          900: "#0e1116",
          800: "#1a1f26",
          700: "#2b323b",
          500: "#5a6470",
          400: "#7e8794",
          300: "#a8b0bb",
        },
        accent: {
          peach: "#fff1e6",
          lemon: "#fff7d6",
          sky: "#e6f1ff",
          mint: "#e3f7ed",
          lilac: "#f0ebff",
          blush: "#ffe6ec",
        },
      },
      boxShadow: {
        card: "0 1px 1px rgba(14,17,22,0.04), 0 6px 18px rgba(14,17,22,0.06)",
        pop: "0 6px 30px rgba(14,17,22,0.10)",
        ring: "0 0 0 4px rgba(31,146,85,0.12)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Instrument Serif",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "Times",
          "serif",
        ],
      },
      letterSpacing: {
        tightish: "-0.02em",
      },
    },
  },
  plugins: [],
};
