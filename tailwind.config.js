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
      animation: {
        in: "slideIn 0.2s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-in-from-top-1": "slideInFromTop 0.2s ease-out",
      },
      keyframes: {
        slideIn: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideInFromTop: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
