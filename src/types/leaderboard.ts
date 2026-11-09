/**
 * Frontend display type for a leaderboard entry.
 * `reg` is a Date converted from the API's YYYYMMDDHHmmss number, or null
 * when the upstream timestamp is malformed and cannot be displayed safely.
 */
export interface LeaderboardUser {
   username: string;
   count: number;
   usage: number;
   reg: Date | null;
   rank: number;
}
