<template>
  <div id="app" class="flex flex-col h-screen w-screen overflow-hidden">

    <header class="flex-none h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-6 z-50 relative">
      <a href="/" class="flex items-center h-full">
        <img src="/wlm-az.png" alt="Wiki Loves Monuments Azerbaijan" class="h-10 w-auto" />
      </a>

      <nav class="flex gap-4">
        <router-link to="/about" class="text-gray-700 hover:text-blue-600 font-medium text-sm transition-colors">
          Haqqında
        </router-link>
      </nav>

      <div class="ml-auto flex items-center gap-4 relative" ref="dropdownContainer">
        <div v-if="auth.user" class="relative">
          <button @click="toggleMenu"
            class="flex items-center gap-2 text-gray-800 font-medium hover:text-blue-600 transition-colors focus:outline-none">
            <span>{{ auth.user.username || "İstifadəçi" }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform duration-200"
              :class="{ 'rotate-180': menuOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <transition enter-active-class="transition ease-out duration-100"
            enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95">
            <div v-if="menuOpen"
              class="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-[9999]">
              <a :href="commonsUrl" target="_blank" rel="noopener"
                class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                Mənim yükləmələrim ↗
              </a>
              <div class="border-t border-gray-100 my-1"></div>
              <button @click="logout"
                class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                Çıxış
              </button>
            </div>
          </transition>
        </div>

        <button v-else @click="auth.login"
          class="bg-[#3366cc] text-white px-5 py-1.5 rounded-md text-sm font-semibold hover:bg-[#2a4b8d] transition-colors shadow-sm">
          Daxil ol (Wiki)
        </button>
      </div>
    </header>

    <main class="flex-1 relative w-full">
      <router-view />
    </main>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAuthStore } from "./stores/auth";

const auth = useAuthStore();
const menuOpen = ref(false);
const dropdownContainer = ref<HTMLElement | null>(null);

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value;
};

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownContainer.value && !dropdownContainer.value.contains(event.target as Node)) {
    menuOpen.value = false;
  }
};

function logout() {
  auth.logout();
  menuOpen.value = false;
}

const commonsUrl = computed(() => {
  const username = auth.user?.username;
  return username
    ? `https://commons.wikimedia.org/wiki/Special:ListFiles/${username}`
    : "https://commons.wikimedia.org/wiki/Special:ListFiles";
});

onMounted(() => {
  auth.fetchUser();
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>