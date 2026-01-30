import { createApp } from "vue";
import { createPinia } from "pinia";
import { createHead } from "@vueuse/head";
import App from "./App.vue";
import { router } from "./routes/index";
import "./styles.css";
// Leaflet Core CSS
import "leaflet/dist/leaflet.css";
import "leaflet.locatecontrol/dist/L.Control.Locate.css";
import "leaflet-sidebar-v2/css/leaflet-sidebar.css";
// FontAwesome configuration
import { FontAwesomeIcon } from "./plugins/fontawesome";
// Wikimedia Codex Design System
import "@wikimedia/codex/dist/codex.style.css";

const head = createHead();
createApp(App)
   .use(createPinia())
   .use(router)
   .use(head)
   .component("font-awesome-icon", FontAwesomeIcon)
   .mount("#app");
