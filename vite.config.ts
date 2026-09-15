import path from "path";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
   plugins: [
      vue(),
      tailwindcss(),
      ViteImageOptimizer({
         png: { quality: 80 },
         jpeg: { quality: 80 },
         webp: { quality: 80 },
      }),
      VitePWA({
         registerType: "autoUpdate",
         includeAssets: ["favicon.ico", "favicon-32x32.png", "favicon-16x16.png", "wlm-az.svg"],
         manifest: {
            name: "Wiki Loves Monuments Azərbaycan",
            short_name: "WLM Az",
            description: "Azərbaycan tarixi abidələri xəritəsi",
            theme_color: "#3B82F6",
            background_color: "#f9fafb",
            display: "standalone",
            icons: [
               {
                  src: "android-chrome-192x192.png",
                  sizes: "192x192",
                  type: "image/png",
               },
               {
                  src: "android-chrome-512x512.png",
                  sizes: "512x512",
                  type: "image/png",
               },
               {
                  src: "android-chrome-512x512.png",
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "any maskable",
               },
            ],
         },
         workbox: {
            globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
            runtimeCaching: [
               {
                  urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
                  handler: "StaleWhileRevalidate",
                  options: {
                     cacheName: "osm-tiles",
                     expiration: {
                        maxEntries: 2000,
                        maxAgeSeconds: 60 * 60 * 24 * 30,
                     },
                  },
               },
               {
                  urlPattern: /^https:\/\/tiles\.gomap\.az\/.*/i,
                  handler: "StaleWhileRevalidate",
                  options: {
                     cacheName: "gomap-tiles",
                     expiration: {
                        maxEntries: 1000,
                        maxAgeSeconds: 60 * 60 * 24 * 30,
                     },
                  },
               },
               {
                  urlPattern: /^https:\/\/mt\d+\.google\.com\/vt\/.*/i,
                  handler: "StaleWhileRevalidate",
                  options: {
                     cacheName: "google-satellite-tiles",
                     expiration: {
                        maxEntries: 1000,
                        maxAgeSeconds: 60 * 60 * 24 * 30,
                     },
                  },
               },
            ],
         },
      }),
   ],

   optimizeDeps: {
      include: ["leaflet", "leaflet-minimap", "geobuf", "pbf"],
   },

   resolve: {
      alias: {
         "@": path.resolve(import.meta.dirname, "./src"),
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
