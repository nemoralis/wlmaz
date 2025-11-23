import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

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
      path: "/:pathMatch(.*)*",
      redirect: "/",
   },
];

export const router = createRouter({
   history: createWebHistory(),
   routes,
   scrollBehavior(to, from, savedPosition) {
      if (savedPosition) {
         return savedPosition;
      } else {
         return { top: 0 };
      }
   },
});
