import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const queryPath = path.join(
   path.dirname(fileURLToPath(import.meta.url)),
   "..",
   "queries",
   "monuments.rq",
);

describe("monuments.rq", () => {
   it("uses deterministic aggregates so unchanged data stays unchanged", () => {
      const query = readFileSync(queryPath, "utf-8");
      expect(query).not.toContain("SAMPLE(");
      expect(query).toContain("(MIN(?img)");
   });
});
