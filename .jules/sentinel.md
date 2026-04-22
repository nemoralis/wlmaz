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
