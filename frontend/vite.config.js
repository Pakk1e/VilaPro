import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      "/api/weather": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false, // Set to false since local development is usually HTTP
      },

      "/api": {
        target: "https://api.vadovsky-tech.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
