import { defineConfig } from "vitest/config";

export default defineConfig({
   test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
      setupFiles: ["./vitest.setup.ts"],
   },
   resolve: {
      alias: {
         "@": new URL("./src", import.meta.url).pathname,
      },
   },
});
