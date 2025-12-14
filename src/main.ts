import { registerSW } from "virtual:pwa-register";
import { createApp } from "vue";
import { createPinia } from "pinia";
import { createHead } from "@vueuse/head";
import App from "./App.vue";
import { router } from "./routes/index";
import "./styles.css";
// Leaflet Core CSS
import "leaflet/dist/leaflet.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

registerSW({ immediate: true });

const head = createHead();
createApp(App).use(createPinia()).use(router).use(head).mount("#app");
