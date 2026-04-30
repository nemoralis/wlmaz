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

## 2025-05-16 - [Disabled Content Security Policy]
**Vulnerability:** Content Security Policy (CSP) was explicitly disabled, leaving the application without an important layer of defense against XSS and injection attacks.
**Learning:** Security headers might be disabled during development for convenience and forgotten.
**Prevention:** Always enable CSP, even with a permissive initial policy, and refine it by whitelisting specific trusted domains used for external assets like map tiles.

## 2025-05-22 - [Missing Rate Limiting on Sensitive Endpoints]
**Vulnerability:** The application lacked rate limiting on critical endpoints such as `/auth` and `/upload`, making it susceptible to brute-force attacks and resource exhaustion.
**Learning:** Even with authentication and CSP, an application can be vulnerable to automated abuse if request rates are not controlled at the infrastructure or application level.
**Prevention:** Implement tiered rate limiting for all public and authenticated endpoints. Use a shared store like Redis to ensure limits are consistent across server restarts and multiple instances. In TypeScript projects, ensure the Redis command wrapper handles type casting correctly to avoid build failures.

## 2025-05-23 - [Prototype Pollution in Leaderboard Aggregation]
**Vulnerability:** Usernames from external APIs (Toolforge/Wikimedia) were used as object keys without validation. This allowed an attacker to provide a malicious username like `__proto__` to pollute the global `Object.prototype`.
**Learning:** Standard JavaScript objects are vulnerable to prototype pollution when using unsanitized external strings as keys. Even "read-only" aggregation can be dangerous if it modifies object properties based on user input.
**Prevention:** Use `Object.create(null)` for all maps/dictionaries that use external data as keys. Additionally, explicitly filter out `__proto__`, `constructor`, and `prototype` before property assignment.

## 2025-05-24 - [Outbound Request Resource Exhaustion]
**Vulnerability:** External `fetch` calls lacked timeouts, allowing a slow or malicious upstream server to hang backend worker processes indefinitely by keeping connections open.
**Learning:** Default `fetch` in Node.js does not have a timeout. In a proxy-like architecture, this can lead to resource exhaustion on the backend if multiple requests are waiting for unresponsive external APIs.
**Prevention:** Always use `AbortSignal.timeout()` with `fetch` for all outbound requests. Additionally, validate the length of user-provided parameters that are used in external API calls to prevent resource abuse and comply with upstream policies.

## 2026-04-26 - [Unsafe Input Length Validation]
**Vulnerability:** Adding length checks like `title.length` on `req.body` fields without null-checks or casting can cause the server to crash with a `TypeError` if the field is missing.
**Learning:** In Express, `req.body` properties are `undefined` if not provided. Accessing properties on them is a common source of stability regressions when implementing security validation.
**Prevention:** Always cast user-provided inputs to `String()` or use optional chaining/null-checks before accessing properties like `length`.

## 2024-05-27 - [Middleware Order and CORS Hardening]
**Vulnerability:** The HTTP Parameter Pollution (HPP) middleware was placed before body-parsers, leaving POST/PUT bodies unprotected. Additionally, the CORS middleware only set the 'Vary: Origin' header when an origin was present, which could lead to cache poisoning.
**Learning:** HPP requires a parsed body to function effectively. 'Vary: Origin' is essential for correct caching behavior across different origins and must be set consistently.
**Prevention:** Always place HPP middleware after body-parsers. Consistently set 'Vary: Origin' for all CORS-affected routes. Enforce minimum length requirements for critical environment variables like 'SESSION_SECRET' at startup to prevent weak configuration.

## 2024-05-28 - [Insecure Temporary Directory Permissions]
**Vulnerability:** Temporary upload directories in shared locations like `/tmp` could be accessed or manipulated by other local users if created with default permissions or if the cleanup routine followed malicious symbolic links.
**Learning:** `fs.mkdir` without a mode uses default permissions, and `fs.stat` follows symlinks, which can be exploited in shared directories.
**Prevention:** Always use restricted permissions (e.g., `0o700`) for sensitive temporary directories and use `fs.lstat` when traversing or cleaning up files in shared locations to avoid following symbolic links.
