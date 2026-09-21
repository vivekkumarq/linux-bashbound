import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || "/",
  server: {
    host: "127.0.0.1",
    port: 4321,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4321,
    strictPort: true,
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) return "vendor";
          // The question bank is by far the largest dataset and is only needed
          // by the interview and quiz routes, so it gets its own chunk instead
          // of riding along with the lesson content.
          if (id.includes("/src/data/questions")) return "questions";
          if (id.includes("/src/data/")) return "content";
        },
      },
    },
  },
});
