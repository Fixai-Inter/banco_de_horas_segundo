import path from "node:path";
import os from "node:os";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const cacheDir = path.join(os.tmpdir(), "projeto-banco-horas-vite");

export default defineConfig({
  cacheDir,
  plugins: [react()],

  build: {
    emptyOutDir: false,
  },

  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});