import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // This is the key fix for the 12s waterfall
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-dev-runtime",
      "lucide-react",
      "clsx",
      "tailwind-merge"
    ]
  },

  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },

      "/simulate": {
        target: "http://localhost:8001",
        changeOrigin: true,
        secure: false,
      },

      "/health": {
        target: "http://localhost:8001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
