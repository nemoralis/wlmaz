import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./routes/index";
import { createPinia } from "pinia";
import "./styles.css";
// Leaflet Core CSS
import "leaflet/dist/leaflet.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

import { configure } from "vue-gtag";

configure({
   tagId: process.env.VITE_GA_MEASUREMENT_ID!,
   pageTracker: { router },
   initMode: process.env.NODE_ENV === "production" ? "auto" : "manual",
});

createApp(App)
   .use(createPinia())
   .use(router)
   .mount("#app");
