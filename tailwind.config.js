/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-barlow)", "sans-serif"],
        serif: ["var(--font-merriweather)", "serif"],
        display: ["var(--font-anton)", "Impact", "sans-serif"],
        cormorant: ["var(--font-cormorant)", "Georgia", "serif"],
        karla: ["var(--font-karla)", "Helvetica Neue", "sans-serif"],
      },
      screens: {
        md: "768px",
        lg: "1024px",
        "2xl": "1536px",
      },
      maxWidth: {
        "screen-2xl": "1536px",
      },
    },
  },
  plugins: [],
};
