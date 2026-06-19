import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        leaf: "#31634a",
        mist: "#eef4ef"
      }
    }
  },
  plugins: []
} satisfies Config;

