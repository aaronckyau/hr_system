import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15202b",
        brand: "#0f766e",
        mist: "#f4f7f7",
      },
    },
  },
  plugins: [],
};

export default config;

