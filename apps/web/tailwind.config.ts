/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#05001E",
          900: "#100030",
          800: "#1A0A3C",
          700: "#2D1258",
        },
        purple: {
          950: "#05001E",
          900: "#100030",
          800: "#1A0A3C",
          700: "#2D1258",
          600: "#651882",
          500: "#9B23C2",
          300: "#C77DFF",
          100: "#F3E8FF",
        },
        gold: {
          500: "#DFA622",
          400: "#F5C542",
          300: "#FFE56B",
          200: "#FFF3B0",
        },
        surface: {
          DEFAULT: "#F8F5FC",
          elevated: "#FFFFFF",
        },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["Source Sans 3", "system-ui", "sans-serif"],
      },
      transitionDuration: {
        rv: "280ms",
      },
    },
  },
  plugins: [],
};
