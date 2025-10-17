import { createRouter, createWebHistory } from 'vue-router'
import MonumentMap from '../components/MonumentMap.vue'
import AboutPage from '../pages/About.vue'

const routes = [
    { path: '/', component: MonumentMap },
    { path: '/about', component: AboutPage },
]

export const router = createRouter({
    history: createWebHistory(),
    routes
})
