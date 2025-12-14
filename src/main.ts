import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./routes/index";
import { createPinia } from "pinia";
import { createHead } from "@vueuse/head";
import "./styles.css";
// Leaflet Core CSS
import "leaflet/dist/leaflet.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

const head = createHead();
createApp(App).use(createPinia()).use(router).use(head).mount("#app");
