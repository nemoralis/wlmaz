import { execFileSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, "../dist");
const MONUMENT_DIR = path.join(DIST_DIR, "monument");
const HTML_VALIDATE_BIN = path.join(__dirname, "../node_modules/.bin/html-validate");

const STATIC_FILES = ["index.html", "stats.html", "leaderboard.html", "table.html", "about.html"];
const SAMPLE_SIZE = 50;

const main = async (): Promise<void> => {
   try {
      const staticFiles = STATIC_FILES.map((file) => path.join(DIST_DIR, file));

      const monumentFiles = (await fs.readdir(MONUMENT_DIR))
         .filter((file) => file.endsWith(".html"))
         .sort()
         .map((file) => path.join(MONUMENT_DIR, file));

      if (!monumentFiles.length) {
         console.error("validate-html: no monument pages found — run the prerender step first");
         process.exit(1);
      }

      // All monument pages share the same template, so a deterministic stride
      // sample catches template-level regressions without re-validating all of
      // them. First and last are always included as boundary coverage.
      const indices = new Set<number>([0, monumentFiles.length - 1]);
      const stride = Math.max(1, Math.floor(monumentFiles.length / SAMPLE_SIZE));
      for (let i = stride; i < monumentFiles.length - 1; i += stride) {
         indices.add(i);
      }
      const sampled = [...indices].sort((a, b) => a - b).map((i) => monumentFiles[i]);

      const files = [...staticFiles, ...sampled];
      const args = [`--max-warnings=0`, ...files];
      console.log(
         `validate-html: validating ${staticFiles.length} static + ${sampled.length} sampled of ${monumentFiles.length} monument pages`,
      );
      execFileSync(HTML_VALIDATE_BIN, args, { stdio: "inherit" });
   } catch (error) {
      console.error("validate-html: html-validate failed", error);
      process.exit(1);
   }
};

main();
