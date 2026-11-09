import { defineStore } from "pinia";
import type {
   AuthLogoutResponse,
   PublicWikiUser,
   UploadConfigResponse,
   UserStats,
} from "@/types/api.ts";
import { ApiError, apiFetch } from "@/utils/apiClient.ts";
import {
   parseAuthLogoutResponse,
   parsePublicWikiUser,
   parseUploadConfigResponse,
   parseUserStats,
} from "@/utils/apiGuards.ts";

export type AuthStatus = "unknown" | "loading" | "authenticated" | "anonymous" | "error";

interface AuthState {
   user: PublicWikiUser | null;
   loading: boolean;
   status: AuthStatus;
   localUploadEnabled: boolean;
}

export const useAuthStore = defineStore("auth", {
   state: (): AuthState => ({
      user: null,
      loading: false,
      status: "unknown",
      localUploadEnabled: false,
   }),

   getters: {
      isAuthenticated: (state) => state.status === "authenticated" && !!state.user,
      // True when uploads may proceed without a Commons login (local dev mode).
      canUpload: (state) => state.localUploadEnabled || !!state.user,
      isBlocked: (state) => !!state.user?.blocked,
      /** False until the first auth check has settled, successfully or not. */
      isResolved: (state) => state.status !== "unknown" && state.status !== "loading",
   },

   actions: {
      async fetchUser() {
         if (this.loading) return;

         this.loading = true;
         this.status = "loading";
         try {
            // Server-driven config and auth check are independent — run them in
            // parallel to avoid a sequential ~100ms penalty on every page load.
            const [cfgResult, authResult] = await Promise.allSettled([
               apiFetch<UploadConfigResponse>("/upload/config", {
                  parse: parseUploadConfigResponse,
                  label: "upload config",
               }),
               apiFetch<PublicWikiUser>("/auth/me", {
                  headers: { "X-Requested-With": "XMLHttpRequest" },
                  parse: parsePublicWikiUser,
                  label: "auth user",
               }),
            ]);

            // Process local-upload config (non-critical)
            if (cfgResult.status === "fulfilled") {
               this.localUploadEnabled = cfgResult.value.localUploadEnabled;
            } else {
               this.localUploadEnabled = false;
               console.error("Failed to fetch upload config:", cfgResult.reason);
            }

            // Process authentication state
            if (authResult.status === "fulfilled") {
               this.user = authResult.value;
               this.status = "authenticated";

               // Fire-and-forget: fetch block status in the background so the
               // page renders immediately. The upload button may briefly appear
               // enabled; it updates reactively when this completes.
               if (this.user.username) {
                  this.fetchBlockStatus(this.user.username);
               }
            } else {
               this.user = null;
               // 401 is the normal signed-out response, not an error.
               if (authResult.reason instanceof ApiError && authResult.reason.status === 401) {
                  this.status = "anonymous";
               } else {
                  this.status = "error";
                  console.error("Failed to fetch user:", authResult.reason);
               }
            }
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
            const statsData = await apiFetch<UserStats>(
               `/api/leaderboard/user/${encodeURIComponent(username)}`,
               { parse: parseUserStats, timeoutMs: 10_000, label: "block status" },
            );
            if (this.user?.username === username && statsData.commons) {
               this.user.blocked = !!statsData.commons.blocked;
               this.user.blockreason = statsData.commons.blockreason;
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
            await apiFetch<AuthLogoutResponse>("/auth/logout", {
               method: "POST",
               headers: { "X-Requested-With": "XMLHttpRequest" },
               parse: parseAuthLogoutResponse,
               label: "logout",
            });
            this.user = null;
            this.status = "anonymous";
            window.location.reload();
         } catch (err) {
            console.error("Logout failed", err);
         }
      },
   },
});
