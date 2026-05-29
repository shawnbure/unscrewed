/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Marketplace-warm palette. Brand is a confident teal-green; the
        // surface scale is warmer (gray with a sand tint) so cards feel like
        // a marketplace, not a SaaS dashboard.
        brand: {
          50: "#ecfbf3",
          100: "#d2f3e0",
          200: "#a6e6c1",
          300: "#6fd29a",
          400: "#3aba74",
          500: "#1f9d57",
          600: "#157d44",
          700: "#106437",
          800: "#0d4e2c",
          900: "#0a3e23",
          DEFAULT: "#1f9d57",
          dark: "#157d44",
        },
        sand: {
          50: "#fbfaf7",
          100: "#f5f3ec",
          200: "#ebe7da",
          300: "#dcd6c2",
          400: "#bdb59a",
          500: "#8a8164",
        },
        ink: {
          900: "#101418",
          700: "#252b32",
          500: "#5b6470",
          400: "#7a8593",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,20,24,0.04), 0 4px 14px rgba(16,20,24,0.06)",
        pop: "0 4px 24px rgba(16,20,24,0.10)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "ui-sans-serif",
          "Inter",
          "system-ui",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
