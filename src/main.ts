import { createApp } from 'vue'
import App from './App.vue'
import { router } from './routes/index'
import './styles.css'

import 'leaflet/dist/leaflet.css'

createApp(App)
    .use(router)
    .mount('#app')
