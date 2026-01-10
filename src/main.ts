import { createApp } from "vue";
import { createPinia } from "pinia";
import { createHead } from "@vueuse/head";
import App from "./App.vue";
import { router } from "./routes/index";
import "./styles.css";
// Leaflet Core CSS
import "leaflet/dist/leaflet.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
// Wikimedia Codex Design System
import "@wikimedia/codex/dist/codex.style.css";

const head = createHead();
createApp(App).use(createPinia()).use(router).use(head).mount("#app");

// Force unregister any stale service workers from previous PWA configuration
if ("serviceWorker" in navigator) {
   navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
         registration.unregister();
         console.log("Stale Service Worker unregistered");
      }
   });
}
