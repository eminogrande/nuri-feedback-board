import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#111827",
        muted: "#6b7280",
        border: "#e5e7eb",
        accent: "#beaaff",
        "accent-foreground": "#381b6a",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
