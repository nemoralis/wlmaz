import path from "path";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";

export default defineConfig({
   plugins: [
      vue(),
      tailwindcss(),
      ViteImageOptimizer({
         png: { quality: 80 },
         jpeg: { quality: 80 },
         webp: { quality: 80 },
      }),
   ],

   optimizeDeps: {
      include: ["leaflet", "leaflet-minimap", "geobuf", "pbf"],
   },

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
         "/upload": {
            target: "http://localhost:3000",
            changeOrigin: true,
         },
         "/api": {
            target: "http://localhost:3000",
            changeOrigin: true,
         },
      },
   },
   build: {
      target: "es2020",
      chunkSizeWarningLimit: 600,
      cssCodeSplit: true,
      rolldownOptions: {
         output: {
            // Better file naming for caching
            chunkFileNames: "assets/[name]-[hash].js",
            entryFileNames: "assets/[name]-[hash].js",
            assetFileNames: "assets/[name]-[hash][extname]",
            manualChunks(id) {
               if (id.includes('node_modules/leaflet') || id.includes('node_modules/leaflet-minimap')) {
                  return 'vendor-map';
               }
               if (id.includes('node_modules/geobuf') || id.includes('node_modules/pbf') || id.includes('node_modules/fuse.js')) {
                  return 'vendor-data';
               }
            }
         },
         external: ["sharp"],
      }
   },
});
