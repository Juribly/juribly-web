import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite dev config
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5174,
    proxy: {
      // REST API
      "/api": "http://localhost:3000",
      // (optional) if you ever fetch without /api
      "/fyp": "http://localhost:3000",
      "/court": "http://localhost:3000",
      // Socket.IO (only needed if you ever connect to /socket.io via the frontend origin)
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true,
      },
    },
  },

  // IMPORTANT: avoid pre-bundling these so esbuild doesn't touch SSR files inside the package
  optimizeDeps: {
    exclude: ["@react-three/postprocessing", "postprocessing"],
  },

  test: {
    environment: "node",
  },
});
