## 2026-04-17 - Table search performance optimization
**Learning:** In pages with large data sets (>500 items), complex sorting logic in computed properties can cause main-thread lag when triggered on every keystroke. Regex instantiation inside sort loops is also a significant bottleneck.
**Action:** Always debounce search inputs that trigger expensive re-sorts and hoist regex definitions outside of frequently executed loops.
