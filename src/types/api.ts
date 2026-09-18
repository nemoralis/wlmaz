// ========================================================
// SHARED API RESPONSE TYPES
//
// Single source of truth for all frontend ↔ backend
// contracts. Backend routes construct these; frontend
// composables consume them.
// ========================================================

// --- Auth ---

/** The public user profile returned by GET /auth/me (token/tokenSecret stripped). */
export interface PublicWikiUser {
   id: string;
   username: string;
   profile?: Record<string, unknown>;
   blocked?: boolean;
   blockreason?: string;
}

export interface AuthUnauthenticatedResponse {
   authenticated: false;
}

export interface AuthLogoutResponse {
   success: true;
}

// --- Upload ---

export interface UploadStatusResponse {
   enabled: boolean;
}

export interface UploadConfigResponse {
   localUploadEnabled: boolean;
   mediaWikiUrl: string;
}

export interface TitlesExistResponse {
   existing: string[];
}

export interface UploadSuccessResponse {
   filename: string | undefined;
   url: string;
}

export interface UploadErrorResponse {
   error: string;
   code?: string;
   details?: string;
}

// --- Leaderboard ---

export interface WikiLovesYearData {
   count: number;
   usercount: number;
   usage: number;
}

export interface WikiLovesUserData {
   count: number;
   usage: number;
   reg: number; // YYYYMMDDHHmmss timestamp
   yearly?: Record<number, { count: number; usage: number }>;
}

export interface WikiLovesCountryData {
   category: string;
   count: number;
   usercount: number;
   userreg: number;
   usage: number;
   start: number;
   end: number;
   data: Record<string, { images: number; joiners: number; newbie_joiners: number }>;
   users: Record<string, WikiLovesUserData>;
   years?: Record<number, WikiLovesYearData>;
}

export type LeaderboardResponse = Record<string, WikiLovesCountryData>;

export interface UserStats {
   username: string;
   total: {
      count: number;
      usage: number;
      reg: number;
      yearly?: Record<number, { count: number; usage: number }>;
   };
   commons?: {
      editcount: number;
      registration: string;
      groups: string[];
      blocked?: boolean;
      blockreason?: string;
      blockexpiry?: string;
   };
   country: string;
}

export interface EventStats {
   totalPhotos: number;
   totalUsers: number;
   photosUsed: number;
}
