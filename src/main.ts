import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./routes/index";
import { createPinia } from "pinia";
import "./styles.css";
import "./assets/tailwind.css";

import "leaflet/dist/leaflet.css";

createApp(App).use(createPinia()).use(router).mount("#app");
