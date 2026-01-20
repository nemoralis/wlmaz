import fs from "fs";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import type { FeatureCollection } from "geojson";
import { defineConfig } from "vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import Sitemap from "vite-plugin-sitemap";

// Read monuments data for sitemap generation
const monumentsPath = path.resolve(process.cwd(), "public/monuments.geojson");
let monumentRoutes: string[] = [];
let lastmodMap: Record<string, Date> = {};

// Static routes for SPA
const staticRoutes = ["/", "/stats", "/table", "/about"];
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

         // Store Wikidata's last modified date
         if (f.properties.lastModified) {
            lastmodMap[route] = new Date(f.properties.lastModified);
         }
      }
   });

   // Add build timestamp for static routes
   staticRoutes.forEach((route) => {
      lastmodMap[route] = buildTime;
   });

   // Combine static and dynamic routes, removing duplicates
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
            "/table": 0.8,
            "/about": 0.5,
            "*": 0.6, // Default for monument pages
         },
         lastmod: lastmodMap,
         robots: [{ userAgent: "*", allow: "/" }],
      }),
   ],

   // Optimize dependency pre-bundling
   optimizeDeps: {
      include: ["leaflet", "leaflet.markercluster", "geobuf", "pbf"],
   },

   resolve: {
      alias: {
         "@": path.resolve(__dirname, "./src"),
      },
   },
   server: {
      proxy: {
         "/auth": {
            target: "http://localhost:3001",
            changeOrigin: true,
         },
         "/upload": {
            target: "http://localhost:3001",
            changeOrigin: true,
         },
      },
   },
   css: {
      devSourcemap: false, // Suppress leaflet.locatecontrol missing sourcemap warning
   },
   esbuild: process.env.NODE_ENV === 'production' ? { drop: ["console", "debugger"] } : {},
   build: {
      target: "esnext",
      // Increase chunk size warning limit for map tiles
      chunkSizeWarningLimit: 600,
      // Better CSS code splitting
      cssCodeSplit: true,
      // Enable tree-shaking
      rollupOptions: {
         output: {
            // Improved manual chunks for better code splitting
            manualChunks: {
                     "leaflet-vendor": [
                        "leaflet",
                        "leaflet.markercluster",
                        "leaflet.locatecontrol",
                        "leaflet-sidebar-v2",
                     ],
                     "vue-vendor": ["vue", "vue-router", "pinia"],
                     "utils-vendor": ["fuse.js", "geobuf", "pbf"],
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
