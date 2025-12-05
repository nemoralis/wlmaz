import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import viteCompression from "vite-plugin-compression";

export default defineConfig({
   plugins: [
      vue(),
      tailwindcss(),
      viteCompression({ algorithm: "brotliCompress" }),
      VitePWA({
         registerType: "autoUpdate",
         includeAssets: ["favicon.ico", "apple-touch-icon.png", "wlm-az.png"],

         manifest: {
            name: "Viki Abidələri Sevir - Xəritə",
            short_name: "WLM Az",
            description: "Azərbaycanın irs abidələrinin interaktiv xəritəsi",
            theme_color: "#2a7ae2",
            background_color: "#ffffff",
            display: "standalone",
            icons: [
               {
                  src: "pwa-192x192.png",
                  sizes: "192x192",
                  type: "image/png",
               },
               {
                  src: "pwa-512x512.png",
                  sizes: "512x512",
                  type: "image/png",
               },
               {
                  src: "pwa-512x512.png",
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "any",
               },
               {
                  src: "maskable-icon-512x512.png",
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "maskable",
               },
            ],
         },

         workbox: {
            globPatterns: ["**/*.{js,css,html,ico,png,svg}"], // Cache all build assets
            runtimeCaching: [
               {
                  urlPattern: /\/monuments\.pbf$/,
                  handler: "StaleWhileRevalidate",
                  options: {
                     cacheName: "api-data",
                     expiration: {
                        maxEntries: 1,
                        maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
                     },
                  },
               },
               {
                  urlPattern: /^https:\/\/(.*\.tile\.openstreetmap\.org|mt0\.google\.com)\/.*$/,
                  handler: "CacheFirst",
                  options: {
                     cacheName: "map-tiles",
                     expiration: {
                        maxEntries: 500,
                        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
                     },
                     cacheableResponse: {
                        statuses: [0, 200],
                     },
                  },
               },
               {
                  urlPattern: /^https:\/\/commons\.wikimedia\.org\/.*$/,
                  handler: "CacheFirst",
                  options: {
                     cacheName: "wiki-images",
                     expiration: {
                        maxEntries: 100,
                        maxAgeSeconds: 60 * 60 * 24, // 1 Day
                     },
                  },
               },
            ],
         },
      }),
   ],

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
      target: "esnext",
      minify: "terser",
      terserOptions: {
         format: { comments: false },
         compress: { drop_console: true, drop_debugger: true },
      },
      rollupOptions: {
         output: {
            manualChunks: {
               "leaflet-vendor": [
                  "leaflet",
                  "leaflet.markercluster",
                  "leaflet.locatecontrol",
                  "leaflet-sidebar-v2",
               ],
               "vue-vendor": ["vue", "vue-router", "pinia"],
               "utils-vendor": ["fuse.js", "geobuf", "pbf"],
            },
         },
      },
   },
});
