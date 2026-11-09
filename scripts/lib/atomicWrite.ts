import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

/**
 * Writes a file through a sibling temporary file and an atomic rename.
 *
 * Readers (the build verifier, nginx serving `public/`, the next pipeline
 * step) either see the complete previous file or the complete new one, never a
 * half-written document. The temp file lives in the target directory so the
 * rename stays on one filesystem.
 */
export async function writeFileAtomic(filePath: string, data: string | Uint8Array): Promise<void> {
   const directory = path.dirname(filePath);
   const tempPath = path.join(
      directory,
      `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`,
   );

   await fs.mkdir(directory, { recursive: true });
   try {
      await fs.writeFile(tempPath, data);
      await fs.rename(tempPath, filePath);
   } catch (error) {
      await fs.rm(tempPath, { force: true }).catch(() => undefined);
      throw error;
   }
}
