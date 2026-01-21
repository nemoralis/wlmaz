import { defineStore } from "pinia";
import type { WikiUser as User } from "../types";

interface AuthState {
   user: User | null;
   loading: boolean;
}

export const useAuthStore = defineStore("auth", {
   state: (): AuthState => ({
      user: null,
      loading: false,
   }),

   getters: {
      displayName: (state) => state.user?.username || "İstifadəçi",
      isAuthenticated: (state) => !!state.user,
   },

   actions: {
      async fetchUser() {
         this.loading = true;
         try {
            const res = await fetch("/auth/me");

            if (res.ok) {
               const data = await res.json();
               this.user = data;
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
            await fetch("/auth/logout", { method: "GET" });
            this.user = null;
            window.location.reload();
         } catch (err) {
            console.error("Logout failed", err);
         }
      },
   },
});
