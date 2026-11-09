import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { writeFileAtomic } from "../atomicWrite";

let directory: string | null = null;

const makeDirectory = () => fs.mkdtemp(path.join(os.tmpdir(), "wlmaz-atomic-"));

afterEach(async () => {
   if (directory) {
      await fs.rm(directory, { recursive: true, force: true });
      directory = null;
   }
});

describe("writeFileAtomic", () => {
   it("replaces a file's contents without leaving temp files behind", async () => {
      directory = await makeDirectory();
      const target = path.join(directory, "data.json");

      await fs.writeFile(target, "old");
      await writeFileAtomic(target, "new");

      expect(await fs.readFile(target, "utf-8")).toBe("new");
      expect((await fs.readdir(directory)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
   });

   it("cleans up the temp file when the final rename fails", async () => {
      directory = await makeDirectory();
      // A directory at the target path makes the final rename fail, which
      // simulates a publishing error after the temp bytes were written.
      const target = path.join(directory, "target");
      await fs.mkdir(target);

      await expect(writeFileAtomic(target, "data")).rejects.toThrow();

      expect((await fs.stat(target)).isDirectory()).toBe(true);
      expect((await fs.readdir(directory)).filter((name) => name.includes(".tmp"))).toEqual([]);
   });

   it("writes into a missing parent directory", async () => {
      directory = await makeDirectory();
      const target = path.join(directory, "nested", "output.txt");

      await writeFileAtomic(target, "content");

      expect(await fs.readFile(target, "utf-8")).toBe("content");
   });
});
