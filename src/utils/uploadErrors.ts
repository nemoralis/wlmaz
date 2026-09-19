/**
 * Upload error classification and user-facing error messages.
 *
 * Pure, static, zero dependencies — safe to import from any context.
 */

// Commons API error codes that are safe to auto-retry (transient/server-side).
const TRANSIENT_ERROR_CODES = new Set([
   "http_error",
   "stashfailed",
   "internalerror",
   "uploaddisabled",
   "sessionlost",
]);

// Friendly Azerbaijani messages for known Commons upload error codes.
const UPLOAD_ERROR_MESSAGES: Record<string, string> = {
   fileexists: "Bu adda fayl artıq Vikianbarda mövcuddur.",
   "fileexists-shared-forbidden": "Bu adda fayl artıq mövcuddur və yenidən yüklənə bilməz.",
   "duplicate-archive": "Bu fayl artıq Vikianbarda başqa adda mövcuddur.",
   duplicate: "Bu fayl artıq Vikianbarda başqa adda mövcuddur.",
   duplicateversions:
      "Bu fayl artıq eyni məzmunla Vikianbarda mövcuddur. Başlığı dəyişdirin.",
   "no-change": "Bu adda eyni fayl artıq mövcuddur. Başlığı dəyişdirin.",
   "was-deleted": "Bu adda fayl əvvəllər silinib. Başlığı dəyişdirin.",
   "verify-error": "Fayl doğrulama müddəti bitdi. Yenidən cəhd edin.",
   "empty-file": "Fayl boşdur və yüklənə bilməz.",
   badfilename: "Bu fayl adı etibarsızdır.",
   "filename-too-short": "Fayl adı çox qısadır.",
   "title_check_failed":
      "Başlıqların mövcudluğunu yoxlamaq mümkün olmadı. İnternet bağlantınızı yoxlayıb yenidən cəhd edin.",
   "external-session-invalid": "Vikianbar sessiyası etibarsızdır. Səhifəni yeniləyib yenidən cəhd edin.",
   badtoken: "Təhlükəsizlik tokeni köhnəlmişdir. Səhifəni yeniləyib yenidən cəhd edin.",
   uploaddisabled: "Vikianbar yükləmələri müvəqqəti olaraq dayandırılıb.",
   stashfailed: "Vikianbar yükləmə xidməti xəta verdi. Yenidən cəhd edin.",
   internalerror: "Vikianbar daxili xəta verdi. Yenidən cəhd edin.",
   http_error: "Vikianbara qoşulma xətası. İnternet bağlantınızı yoxlayın.",
   timeout: "Yükləmə müddəti bitdi. Yenidən cəhd edin.",
};

export const messageFor = (code: string | undefined, fallback: string): string =>
   (code && UPLOAD_ERROR_MESSAGES[code]) || fallback;

export const isTransientError = (code: string | undefined, httpStatus?: number): boolean =>
   (!!code && TRANSIENT_ERROR_CODES.has(code)) || (httpStatus !== undefined && httpStatus >= 500);
