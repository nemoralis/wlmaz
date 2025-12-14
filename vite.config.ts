import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import viteCompression from "vite-plugin-compression";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import Sitemap from 'vite-plugin-sitemap';
import fs from 'fs';
import type { FeatureCollection } from 'geojson';

// Read monuments data for sitemap generation
const monumentsPath = path.resolve(process.cwd(), 'public/monuments.geojson');
let monumentRoutes: string[] = [];
let lastmodMap: Record<string, Date> = {};

// Static routes for SPA
const staticRoutes = ['/', '/stats', '/table', '/about'];
const buildTime = new Date();

try {
   const monumentsData = fs.readFileSync(monumentsPath, 'utf-8');
   const geoData: FeatureCollection = JSON.parse(monumentsData);
   
   geoData.features.forEach(f => {
      if (f.properties?.inventory) {
         const route = `/monument/${f.properties.inventory}`;
         monumentRoutes.push(route);
         
         // Store Wikidata's last modified date
         if (f.properties.lastModified) {
            lastmodMap[route] = new Date(f.properties.lastModified);
         }
      }
   });
   
   // Add build timestamp for static routes
   staticRoutes.forEach(route => {
      lastmodMap[route] = buildTime;
   });
   
   // Combine static and dynamic routes
   monumentRoutes = [...staticRoutes, ...monumentRoutes];
   
   console.log(`Loaded ${monumentRoutes.length} total routes for sitemap (${staticRoutes.length} static, ${monumentRoutes.length - staticRoutes.length} monuments)`);
} catch (error) {
   console.warn('Could not load monuments data for sitemap:', error);
}

export default defineConfig({
   plugins: [
      vue(),
      tailwindcss(),
      viteCompression({ algorithm: "brotliCompress" }),
      ViteImageOptimizer({
         png: { quality: 80 },
         jpeg: { quality: 80 },
         webp: { quality: 80 },
      }),
      VitePWA({
         registerType: "autoUpdate",
         // includeAssets: ["favicon.ico", "apple-touch-icon.png", "wlm-az.png"],

         // Only enable PWA in production
         devOptions: {
            enabled: false,
         },

         manifest: {
            name: "Viki Abidələri Sevir - Xəritə",
            short_name: "WLM Az",
            description: "Azərbaycanın irs abidələrinin interaktiv xəritəsi",
            theme_color: "#2a7ae2",
            background_color: "#ffffff",
            display: "standalone",
            start_url: "/",
            scope: "/",
            orientation: "any",
            categories: ["travel", "education", "photography"],
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
            // Quick action shortcuts
            shortcuts: [
               {
                  name: "Xəritə",
                  short_name: "Map",
                  description: "Abidələr xəritəsinə get",
                  url: "/",
                  icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
               },
               {
                  name: "Statistika",
                  short_name: "Stats",
                  description: "Statistikaya bax",
                  url: "/stats",
                  icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
               },
            ],
         },

         workbox: {
            globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
            // Increase max size for map chunks
            maximumFileSizeToCacheInBytes: 3000000, // 3MB
            runtimeCaching: [
               {
                  urlPattern: /\/monuments\.pbf$/,
                  handler: "StaleWhileRevalidate", // Load from cache immediately, update in background
                  options: {
                     cacheName: "api-data",
                     expiration: {
                        maxEntries: 5,
                        maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
                     },
                     // networkTimeoutSeconds not needed for StaleWhileRevalidate
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
      Sitemap({
         hostname: 'https://wikilovesmonuments.az',
         dynamicRoutes: monumentRoutes,
         changefreq: 'monthly',
         priority: {
            '/': 1.0,              // Homepage - highest priority
            '/stats': 0.8,         // Main sections
            '/table': 0.8,
            '/about': 0.5,
            '*': 0.6               // Default for monument pages
         },
         lastmod: lastmodMap,
         robots: [
            { userAgent: '*', allow: '/' }
         ]
      }),
   ],

   // Optimize dependency pre-bundling
   optimizeDeps: {
      include: ["leaflet", "leaflet.markercluster", "geobuf", "pbf"],
      exclude: ["workbox-window"], // Already bundled by PWA plugin
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
      },
   },
   esbuild: {
      drop: ["console", "debugger"],
   },
   build: {
      target: "esnext",
      minify: "terser",
      // Increase chunk size warning limit for map tiles
      chunkSizeWarningLimit: 600,
      // Better CSS code splitting
      cssCodeSplit: true,
      terserOptions: {
         format: { comments: false },
         compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ["console.log"], // Remove console.log specifically
         },
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
               // Separate Chart.js (only loaded on stats page)
               "chart-vendor": ["chart.js", "vue-chartjs"],
            }
         },
         external: ["sharp"],
      },
   },
});
