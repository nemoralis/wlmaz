/**
 * Frontend display type for a leaderboard entry.
 * reg is a Date (converted from the API's YYYYMMDDHHmmss number).
 */
export interface LeaderboardUser {
   username: string;
   count: number;
   usage: number;
   reg: Date;
   rank: number;
}