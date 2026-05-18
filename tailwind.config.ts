import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#15131a",
        coral: "#f45d48",
        mint: "#2fbf9b",
        gold: "#f4b942",
        sky: "#3096dc",
      },
      boxShadow: {
        panel: "0 18px 50px rgba(21, 19, 26, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
