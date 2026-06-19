import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["tinctura.local", "tinctura.localhost"],
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000"
    }
  }
});
