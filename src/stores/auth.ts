import { defineStore } from "pinia";
import type { PublicWikiUser, UploadConfigResponse, UserStats } from "../types/api.ts";

interface AuthState {
   user: PublicWikiUser | null;
   loading: boolean;
   localUploadEnabled: boolean;
}

export const useAuthStore = defineStore("auth", {
   state: (): AuthState => ({
      user: null,
      loading: false,
      localUploadEnabled: false,
   }),

   getters: {
      isAuthenticated: (state) => !!state.user,
      // True when uploads may proceed without a Commons login (local dev mode).
      canUpload: (state) => state.localUploadEnabled || !!state.user,
      isBlocked: (state) => !!state.user?.blocked,
   },

    actions: {
      async fetchUser() {
         this.loading = true;
         try {
            // Server-driven config and auth check are independent — run them in
            // parallel to avoid a sequential ~100ms penalty on every page load.
            const [cfgRes, res] = await Promise.all([
               fetch("/upload/config"),
               fetch("/auth/me", {
                  headers: { "X-Requested-With": "XMLHttpRequest" },
               }),
            ]);

            // Process local-upload config (non-critical)
            if (cfgRes.ok) {
               const cfg: UploadConfigResponse = await cfgRes.json();
               this.localUploadEnabled = !!cfg.localUploadEnabled;
            } else {
               this.localUploadEnabled = false;
            }

            // Process authentication state
            if (res.ok) {
               const data: PublicWikiUser = await res.json();
               this.user = data;

               // Fire-and-forget: fetch block status in the background so the
               // page renders immediately. The upload button may briefly appear
               // enabled; it updates reactively when this completes.
               if (this.user?.username) {
                  this.fetchBlockStatus(this.user.username);
               }
            } else {
               this.user = null;
            }
         } catch (err) {
            console.error("Failed to fetch user:", err);
            this.user = null;
            this.localUploadEnabled = false;
         } finally {
            this.loading = false;
         }
      },

      /**
       * Non-blocking check for the user's Commons block status.  Called after
       * authentication succeeds; updates `user.blocked` / `user.blockreason`
       * reactively so the upload button disables itself if needed.
       */
      async fetchBlockStatus(username: string) {
         try {
            const statsRes = await fetch(
               `/api/leaderboard/user/${encodeURIComponent(username)}`,
               { signal: AbortSignal.timeout(10000) },
            );
            if (statsRes.ok && this.user?.username === username) {
               const statsData: UserStats = await statsRes.json();
               if (statsData.commons) {
                  this.user.blocked = !!statsData.commons.blocked;
                  this.user.blockreason = statsData.commons.blockreason;
               }
            }
         } catch (e) {
            console.error("Failed to fetch block status:", e);
         }
      },

      login() {
         window.location.href = "/auth/login";
      },

      async logout() {
         try {
            await fetch("/auth/logout", {
               method: "POST",
               headers: { "X-Requested-With": "XMLHttpRequest" },
            });
            this.user = null;
            window.location.reload();
         } catch (err) {
            console.error("Logout failed", err);
         }
      },
   },
});
