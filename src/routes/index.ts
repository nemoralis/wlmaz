import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";

const routes: Array<RouteRecordRaw> = [
   {
      path: "/",
      name: "Home",
      component: () => import("../pages/Home.vue"),
   },
   {
      path: "/map",
      name: "Map",
      component: () => import("../pages/MapPage.vue"),
   },
   {
      path: "/about",
      name: "About",
      component: () => import("../pages/About.vue"),
   },
   {
      // WMCS ToU §7.3.2: projects collecting Wikimedia Usernames must publish
      // a Privacy Statement. Linked conspicuously from the footer strip in App.vue.
      path: "/privacy",
      name: "Privacy",
      component: () => import("../pages/PrivacyPage.vue"),
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
      // Region names are Azerbaijani and percent-encoded in the path
      // (see regionPath in utils/regions.ts). `/regions` must be declared
      // before this one or it would be read as a region named "regions".
      path: "/regions",
      name: "Regions",
      component: () => import("../pages/RegionsPage.vue"),
   },
   {
      path: "/region/:name",
      name: "Region",
      component: () => import("../pages/RegionPage.vue"),
   },
   {
      path: "/monument/:id",
      name: "Monument",
      component: () => import("../pages/MonumentPage.vue"),
   },
   {
      path: "/:pathMatch(.*)*",
      name: "NotFound",
      component: () => import("../pages/NotFound.vue"),
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
