import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";

const routes: Array<RouteRecordRaw> = [
   {
      path: "/",
      name: "Home",
      // Change this to point to the new wrapper page
      component: () => import("../pages/Home.vue"),
   },
   {
      path: "/about",
      name: "About",
      component: () => import("../pages/About.vue"),
   },
   {
      path: "/stats",
      name: "Stats",
      component: () => import("../pages/StatsPage.vue"),
   },
   {
      path: "/leaderboard",
      name: "Leaderboard",
      component: () => import("../pages/LeaderboardPage.vue"),
   },
   {
      path: "/profile",
      name: "Profile",
      component: () => import("../pages/ProfilePage.vue"),
   },
   {
      path: "/table",
      name: "Table",
      component: () => import("../pages/TablePage.vue"),
   },
   {
      path: "/monument/:id",
      name: "Monument",
      component: () => import("../pages/MonumentPage.vue"),
   },
   {
      path: "/:pathMatch(.*)*",
      redirect: "/",
   },
];

export const router = createRouter({
   history: createWebHistory(),
   routes,
   scrollBehavior(_to, _from, savedPosition) {
      if (savedPosition) {
         return savedPosition;
      } else {
         return { top: 0 };
      }
   },
});
