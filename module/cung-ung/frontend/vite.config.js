import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Docker uses the backend service name; local development keeps 127.0.0.1.
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": process.env.VITE_API_TARGET || "http://127.0.0.1:8010",
      "/docs": process.env.VITE_API_TARGET || "http://127.0.0.1:8010",
      "/openapi.json": process.env.VITE_API_TARGET || "http://127.0.0.1:8010",
    },
  },
});
