import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/auth": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  esbuild: {
    drop: ["console", "debugger"],
  },
  build: {
    minify: "terser",
    terserOptions: {
      format: {
        comments: false, 
      },
      compress: {
        drop_console: true, 
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'leaflet-vendor': [
            'leaflet',
            'leaflet.markercluster',
            'leaflet.locatecontrol',
          ],
        },
      },
    },
  },
});