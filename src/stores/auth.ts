import { defineStore } from "pinia";

interface MediaWikiProfile {
  username: string;
  [key: string]: any;
}

interface AuthState {
  user: {
    profile: MediaWikiProfile;
  } | null;
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    user: null,
  }),

  actions: {
    async fetchUser() {
      try {
        const res = await fetch("http://localhost:3000/auth/me", {
          credentials: "include",
        });
        if (!res.ok) {
          this.user = null;
          return;
        }
        const data = await res.json();
        this.user = data;
      } catch (err) {
        console.error("Failed to fetch user:", err);
        this.user = null;
      }
    },

    login() {
      window.location.href = "http://localhost:3000/auth/login";
    },

    async logout() {
      try {
        const res = await fetch("http://localhost:3000/auth/logout", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Logout failed");
        this.user = null;
      } catch (err) {
        console.error(err);
      }
    },
  },
});
