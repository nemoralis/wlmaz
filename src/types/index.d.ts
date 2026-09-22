/**
 * Public type barrel.
 *
 * Domain/session types are split across focused modules; this file just
 * re-exports them so existing `import type { ... } from "@/types"` sites keep
 * working:
 *
 * - Monument/GeoJSON types: ./monuments.ts
 * - OAuth/session user type: ./users.ts
 * - Leaderboard display type: ./leaderboard.ts
 * - API response types (HTTP contract): ./api.ts
 * - Module shims (`.vue`, `?raw`): ./vite-shims.d.ts
 * - Express `req.user` augmentation: ./express.d.ts
 */

export type { MonumentFeature, MonumentProps } from "./monuments.ts";
export type { WikiUser } from "./users.ts";
export type { LeaderboardUser } from "./leaderboard.ts";
