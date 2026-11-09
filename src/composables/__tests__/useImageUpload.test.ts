import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type { FileItem } from "@/utils/uploadService.ts";

vi.mock("@/utils/uploadService.ts", () => ({
   isHeicFile: () => false,
   uploadSingleFile: vi.fn(),
}));

/**
 * Regression guard for the title-check deadlock: the pre-flight
 * `/upload/titles-exist` request used to sit outside the try/finally that
 * settled the upload state, so a failure there left the modal permanently
 * "uploading" and impossible to close.
 */
const fileItem = (name: string): FileItem => ({
   id: name,
   file: { name } as File,
   preview: "",
   title: "",
   description: "",
});

afterEach(() => {
   vi.unstubAllGlobals();
   vi.restoreAllMocks();
});

describe("useImageUpload", () => {
   it("settles after a title-check failure instead of staying busy", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.stubGlobal("window", {
         addEventListener: vi.fn(),
         removeEventListener: vi.fn(),
      });
      vi.stubGlobal(
         "fetch",
         vi.fn(async () => {
            throw new Error("offline");
         }),
      );

      const { useImageUpload } = await import("@/composables/useImageUpload.ts");
      const upload = useImageUpload(ref(null));

      upload.files.value = [fileItem("a.jpg"), fileItem("b.jpg")];
      upload.bulkForm.title = "Abidə";
      upload.bulkForm.description = "Təsvir";

      await upload.handleUpload();

      expect(upload.uploadFailures.value).toHaveLength(2);
      expect(upload.uploadFailures.value.every((f) => f.code === "title_check_failed")).toBe(true);
      expect(upload.phase.value).toBe("complete");
      expect(upload.isUploading.value).toBe(false);
      expect(upload.isBusy.value).toBe(false);
   });

   it("fails closed when the upload status cannot be checked", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.stubGlobal(
         "fetch",
         vi.fn(async () => {
            throw new Error("offline");
         }),
      );

      const { useImageUpload } = await import("@/composables/useImageUpload.ts");
      const upload = useImageUpload(ref(null));

      // Until the server answers, the upload action is not offered.
      expect(upload.uploadAvailability.value).toBe("checking");
      expect(upload.uploadsEnabled.value).toBe(false);

      await upload.checkStatus();

      expect(upload.uploadAvailability.value).toBe("error");
      expect(upload.uploadsEnabled.value).toBe(false);
   });
});
