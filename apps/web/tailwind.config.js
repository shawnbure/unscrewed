/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1f7a4d",
          dark: "#155534",
          light: "#3aa770",
        },
      },
    },
  },
  plugins: [],
};
