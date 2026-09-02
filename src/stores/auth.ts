import { defineStore } from "pinia";
import type { WikiUser as User } from "../types";

interface AuthState {
   user: User | null;
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
      displayName: (state) => state.user?.username || "İstifadəçi",
      isAuthenticated: (state) => !!state.user,
      // True when uploads may proceed without a Commons login (local dev mode).
      canUpload: (state) => state.localUploadEnabled || !!state.user,
      isBlocked: (state) => !!state.user?.blocked,
      blockReason: (state) => state.user?.blockreason || "",
   },

   actions: {
      async fetchUser() {
         this.loading = true;
         // Server-driven: reflects whether the backend runs in local MediaWiki
         // dev mode. Never includes credentials. In production always false.
         try {
            const cfgRes = await fetch("/upload/config");
            if (cfgRes.ok) {
               const cfg = await cfgRes.json();
               this.localUploadEnabled = !!cfg.localUploadEnabled;
            }
         } catch (e) {
            console.error("Failed to check local upload config", e);
            this.localUploadEnabled = false;
         }

         try {
            const res = await fetch("/auth/me", {
               headers: { "X-Requested-With": "XMLHttpRequest" },
            });

            if (res.ok) {
               const data = await res.json();
               this.user = data;

               // After getting basic user info, fetch block status/extra stats
               if (this.user?.username) {
                  try {
                     const statsRes = await fetch(
                        `/api/leaderboard/user/${encodeURIComponent(this.user.username)}`,
                        { signal: AbortSignal.timeout(10000) },
                     );
                     if (statsRes.ok) {
                        const statsData = await statsRes.json();
                        if (statsData.commons) {
                           this.user.blocked = !!statsData.commons.blocked;
                           this.user.blockreason = statsData.commons.blockreason;
                        }
                     }
                  } catch (e) {
                     console.error("Failed to fetch extended user stats:", e);
                  }
               }
            } else {
               this.user = null;
            }
         } catch (err) {
            console.error("Failed to fetch user:", err);
            this.user = null;
         } finally {
            this.loading = false;
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
