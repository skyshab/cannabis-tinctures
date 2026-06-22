import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        leaf: "rgb(108 159 133)",
        mist: "#eef4ef"
      }
    }
  },
  plugins: []
} satisfies Config;
