<template>
   <div id="app" class="flex h-screen w-screen flex-col overflow-hidden">
      <header
         class="relative z-50 flex h-14 flex-none items-center gap-6 border-b border-gray-200 bg-white px-4"
      >
         <a href="/" class="flex h-full items-center">
            <img src="/wlm-az.png" alt="Wiki Loves Monuments Azerbaijan" class="h-10 w-auto" />
         </a>

         <nav class="flex gap-4">
            <router-link
               to="/about"
               class="text-sm font-medium text-gray-700 transition-colors hover:text-blue-600"
            >
               Haqqında
            </router-link>
         </nav>

         <div class="relative ml-auto flex items-center gap-4" ref="dropdownContainer">
            <div v-if="auth.user" class="relative">
               <button
                  @click="toggleMenu"
                  class="flex items-center gap-2 font-medium text-gray-800 transition-colors hover:text-blue-600 focus:outline-none"
               >
                  <span>{{ auth.user.username || "İstifadəçi" }}</span>
                  <svg
                     xmlns="http://www.w3.org/2000/svg"
                     class="h-4 w-4 transition-transform duration-200"
                     :class="{ 'rotate-180': menuOpen }"
                     fill="none"
                     viewBox="0 0 24 24"
                     stroke="currentColor"
                  >
                     <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                     />
                  </svg>
               </button>

               <transition
                  enter-active-class="transition ease-out duration-100"
                  enter-from-class="transform opacity-0 scale-95"
                  enter-to-class="transform opacity-100 scale-100"
                  leave-active-class="transition ease-in duration-75"
                  leave-from-class="transform opacity-100 scale-100"
                  leave-to-class="transform opacity-0 scale-95"
               >
                  <div
                     v-if="menuOpen"
                     class="absolute right-0 z-9999 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
                  >
                     <a
                        :href="commonsUrl"
                        target="_blank"
                        rel="noopener"
                        class="block px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                     >
                        Mənim yükləmələrim ↗
                     </a>
                     <div class="my-1 border-t border-gray-100"></div>
                     <button
                        @click="logout"
                        class="block w-full px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                     >
                        Çıxış
                     </button>
                  </div>
               </transition>
            </div>

            <button
               v-else
               @click="auth.login"
               class="rounded-md bg-[#3366cc] px-5 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2a4b8d]"
            >
               Daxil ol
            </button>
         </div>
      </header>

      <main class="relative w-full flex-1">
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
   document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
   document.removeEventListener("click", handleClickOutside);
});
</script>
