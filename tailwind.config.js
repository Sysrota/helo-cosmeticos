export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        helo: {
          background: "#FFF8FA",
          rose: "#EAA9B8",
          dark: "#D9536F",
          text: "#2B2B2B",
        },
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
