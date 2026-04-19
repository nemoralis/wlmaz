## 2025-05-15 - [Upload Resource Exhaustion]
**Vulnerability:** Unauthenticated users could consume server disk space/resources by sending files to the `/upload` endpoint, because `multer` middleware processed the file before authentication checks.
**Learning:** Middleware order is critical; `multer` saves files to disk immediately when called.
**Prevention:** Always place authentication and feature-flag middlewares before `multer` or similar resource-intensive middlewares.

## 2025-05-15 - [Information Leakage in Error Responses]
**Vulnerability:** The backend returned detailed error strings and stack traces to the client on upload failure.
**Learning:** Default error objects can contain sensitive path or environment information.
**Prevention:** Sanitize error responses in production to return generic messages while logging details internally.

## 2025-05-15 - [XSS in Profile Stats]
**Vulnerability:** `v-html` was used to render `blockreason` from MediaWiki API, which could contain malicious scripts.
**Learning:** Even "trusted" upstream APIs can be a source of XSS if the data they provide is not properly sanitized or if it's rendered as HTML.
**Prevention:** Use standard text interpolation `{{ }}` instead of `v-html` unless HTML rendering is strictly required and properly sanitized.

## 2025-05-16 - [Wikitext Injection in Upload Metadata]
**Vulnerability:** User-provided `title`, `description`, and `categories` were used to construct wikitext for Wikimedia Commons without sanitization. This allowed injecting malicious wikitext (e.g., categories, templates) or breaking the file description structure.
**Learning:** External APIs that consume formatted text (like Wikitext) are vulnerable to injection if the input isn't sanitized for that specific format's control characters.
**Prevention:** Always sanitize inputs before embedding them into structured formats like Wikitext. For MediaWiki, stripping `[` and `]` prevents link/category injection, and stripping `{` and `}` prevents template injection. Additionally, sanitize filenames against target platform restrictions.
