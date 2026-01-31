import fs from "fs";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import type { FeatureCollection } from "geojson";
import { defineConfig } from "vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import Sitemap from "vite-plugin-sitemap";

const monumentsPath = path.resolve(process.cwd(), "public/monuments.geojson");
let monumentRoutes: string[] = [];
let lastmodMap: Record<string, Date> = {};

const staticRoutes = ["/", "/stats", "/leaderboard", "/table", "/about"];
const buildTime = new Date();

try {
   const monumentsData = fs.readFileSync(monumentsPath, "utf-8");
   const geoData: FeatureCollection = JSON.parse(monumentsData);

   geoData.features.forEach((f) => {
      if (f.properties?.inventory) {
         // URL-encode dots in inventory IDs (e.g., "3.2" becomes "3%2E2")
         // This fixes sitemap generation which treats dots as file extensions
         const encodedInventory = f.properties.inventory.replace(/\./g, "%2E");
         const route = `/monument/${encodedInventory}`;
         monumentRoutes.push(route);

         if (f.properties.lastModified) {
            lastmodMap[route] = new Date(f.properties.lastModified);
         }
      }
   });

   staticRoutes.forEach((route) => {
      lastmodMap[route] = buildTime;
   });
   monumentRoutes = Array.from(new Set([...staticRoutes, ...monumentRoutes]));

   console.log(
      `Loaded ${monumentRoutes.length} total routes for sitemap (${staticRoutes.length} static, ${monumentRoutes.length - staticRoutes.length} monuments)`,
   );
} catch (error) {
   console.warn("Could not load monuments data for sitemap:", error);
}

export default defineConfig({
   plugins: [
      vue(),
      tailwindcss(),
      ViteImageOptimizer({
         png: { quality: 80 },
         jpeg: { quality: 80 },
         webp: { quality: 80 },
      }),
      Sitemap({
         hostname: "https://wikilovesmonuments.az",
         dynamicRoutes: monumentRoutes,
         changefreq: "monthly",
         priority: {
            "/": 1.0, // Homepage - highest priority
            "/stats": 0.8, // Main sections
            "/leaderboard": 0.8,
            "/table": 0.8,
            "/about": 0.5,
            "*": 0.6, // Default for monument pages
         },
         lastmod: lastmodMap,
         robots: [{ userAgent: "*", allow: "/" }],
      }),
   ],

   optimizeDeps: {
      include: ["leaflet", "leaflet.markercluster", "leaflet-minimap", "geobuf", "pbf"],
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
      rollupOptions: {
         output: {
            manualChunks: {
               "leaflet-vendor": [
                  "leaflet",
                  "leaflet.markercluster",
                  "leaflet.locatecontrol",
                  "leaflet-sidebar-v2",
                  "leaflet-minimap",
               ],
               "vue-vendor": ["vue", "vue-router", "pinia"],
               "chart-vendor": ["chart.js", "vue-chartjs"],
            },

            // Better file naming for caching
            chunkFileNames: "assets/[name]-[hash].js",
            entryFileNames: "assets/[name]-[hash].js",
            assetFileNames: "assets/[name]-[hash][extname]",
         },
         external: ["sharp"],
      }
   },
});
