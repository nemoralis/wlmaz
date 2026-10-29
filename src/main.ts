import { createApp } from "vue";
import { createPinia } from "pinia";
import { createHead } from "@unhead/vue/client";
import App from "@/App.vue";
import { router } from "@/routes/index.ts";
import "./styles.css";
// Leaflet Core CSS
import "leaflet/dist/leaflet.css";
import "leaflet.locatecontrol/dist/L.Control.Locate.css";
import "leaflet-sidebar-v2/css/leaflet-sidebar.css";
// FontAwesome configuration
import { FontAwesomeIcon } from "@/plugins/fontawesome.ts";
// Wikimedia Codex Design System
import "@wikimedia/codex/dist/codex.style.css";

const head = createHead();
const app = createApp(App);

// The prerendered home and monument pages inject a scroll override for their
// static content; the runtime shell manages its own scrolling. Removing it
// before mount keeps #app's height:100% resolving against the viewport-sized
// body (a leaked override collapses the map page on client-side navigation).
document.querySelector("style[data-prerender-scroll-override]")?.remove();

app.config.errorHandler = (err, instance, info) => {
   console.error(
      "[Vue Error]",
      err,
      "\nComponent:",
      instance?.$options?.name || "Unknown",
      "\nInfo:",
      info,
   );
};

app.use(createPinia())
   .use(router)
   .use(head)
   .component("font-awesome-icon", FontAwesomeIcon)
   .mount("#app");
