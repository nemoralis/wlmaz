## 2026-04-17 - Table search performance optimization
**Learning:** In pages with large data sets (>500 items), complex sorting logic in computed properties can cause main-thread lag when triggered on every keystroke. Regex instantiation inside sort loops is also a significant bottleneck.
**Action:** Always debounce search inputs that trigger expensive re-sorts and hoist regex definitions outside of frequently executed loops.
## 2026-04-26 - Wikimedia metadata caching and fetch resilience
**Learning:** Repetitive external API calls (like fetching image credits on every marker selection) can be eliminated by using a global in-memory Map as a cache. Additionally, browser `fetch` has restrictions: setting a `User-Agent` header is forbidden and will be ignored, and `AbortSignal.timeout` requires feature detection for compatibility with older browsers (e.g., Safari < 16).
**Action:** Implement global Map-based caching for frequent external lookups and always use feature detection when using modern AbortSignal features in the frontend.
