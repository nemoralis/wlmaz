<template>
   <div id="app" class="flex h-dvh w-screen flex-col overflow-hidden">
      <!-- Skip to main content link for keyboard users -->
      <a
         href="#main-content"
         class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[10000] focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
         Əsas məzmuna keç
      </a>

      <header
         role="banner"
         class="relative z-50 flex h-14 flex-none items-center gap-4 border-b border-gray-200 bg-white px-4"
      >
         <!-- Logo -->
         <a
            href="/"
            class="flex h-full flex-none shrink-0 items-center"
            aria-label="Ana səhifəyə qayıt"
         >
            <img
               src="/wlm-az.svg"
               alt="Wiki Loves Monuments Azerbaijan"
               class="h-10 w-auto"
               width="40"
               height="40"
            />
         </a>

         <!-- Desktop Nav -->
         <nav role="navigation" aria-label="Əsas naviqasiya" class="ml-6 hidden gap-4 md:flex">
            <router-link
               to="/stats"
               class="text-sm font-medium text-gray-700 transition-colors hover:text-[#3366cc]"
               aria-label="Statistika səhifəsinə get"
            >
               Statistika
            </router-link>
            <router-link
               to="/leaderboard"
               class="text-sm font-medium text-gray-700 transition-colors hover:text-[#3366cc]"
               aria-label="Liderlik cədvəlinə get"
            >
               İştirakçılar
            </router-link>
            <router-link
               to="/table"
               class="text-sm font-medium text-gray-700 transition-colors hover:text-[#3366cc]"
               aria-label="Siyahı səhifəsinə get"
            >
               Siyahı
            </router-link>
            <router-link
               to="/about"
               class="text-sm font-medium text-gray-700 transition-colors hover:text-[#3366cc]"
               aria-label="Haqqında səhifəsinə get"
            >
               Haqqında
            </router-link>
         </nav>

         <div class="ml-auto flex items-center gap-4">
            <!-- User Dropdown (Always Visible or Collapsed?) - Keeping Visible for utility -->
            <div ref="dropdownContainer" class="relative flex items-center gap-4">
               <div v-if="auth.user" class="relative">
                  <button
                     :aria-expanded="menuOpen"
                     aria-haspopup="true"
                     aria-label="İstifadəçi menyusu"
                     class="flex items-center gap-2 font-medium text-gray-800 transition-colors hover:text-[#3366cc] focus:outline-none"
                     @click="toggleMenu"
                     @keydown="handleDropdownKeydown"
                  >
                     <font-awesome-icon :icon="['fas', 'user-circle']" class="text-lg" />
                     <span class="hidden sm:inline">{{ auth.user.username || "İstifadəçi" }}</span>
                     <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4 transition-transform duration-200"
                        :class="{ 'rotate-180': menuOpen }"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
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
                        role="menu"
                        aria-label="İstifadəçi menyusu"
                        class="absolute right-0 z-[9999] mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
                     >
                        <div class="block px-4 py-2 text-xs font-semibold text-gray-500 sm:hidden">
                           {{ auth.user.username }}
                        </div>
                        <router-link
                           to="/profile"
                           role="menuitem"
                           class="block px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                           @click="menuOpen = false"
                        >
                           Mənim profilim
                        </router-link>
                        <a
                           :href="commonsUrl"
                           target="_blank"
                           rel="noopener"
                           role="menuitem"
                           class="block px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                        >
                           Mənim yükləmələrim ↗
                        </a>
                        <div class="my-1 border-t border-gray-100" role="separator"></div>
                        <button
                           role="menuitem"
                           class="block w-full px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                           @click="logout"
                        >
                           Çıxış
                        </button>
                     </div>
                  </transition>
               </div>

               <button
                  v-else
                  aria-label="Wikimedia hesabınızla daxil olun"
                  class="rounded-md bg-[#3366cc] px-5 py-1.5 text-sm font-semibold whitespace-nowrap text-white shadow-sm transition-colors hover:bg-[#2a4b8d]"
                  @click="auth.login"
               >
                  Daxil ol
               </button>
            </div>

            <!-- Hamburger Button (Mobile Only) -->
            <button
               class="rounded-md p-2 text-gray-600 hover:bg-gray-100 focus:outline-none md:hidden"
               :aria-expanded="mobileNavOpen"
               aria-label="Mobil menyunu aç"
               aria-controls="mobile-nav"
               @click="mobileNavOpen = !mobileNavOpen"
               @keydown.escape="mobileNavOpen = false"
            >
               <font-awesome-icon :icon="['fas', 'bars']" class="text-xl" aria-hidden="true" />
            </button>
         </div>
      </header>

      <!-- Mobile Navigation Drawer -->
      <transition
         enter-active-class="transition ease-out duration-200"
         enter-from-class="transform -translate-y-full opacity-0"
         enter-to-class="transform translate-y-0 opacity-100"
         leave-active-class="transition ease-in duration-150"
         leave-from-class="transform translate-y-0 opacity-100"
         leave-to-class="transform -translate-y-full opacity-0"
      >
         <div
            v-if="mobileNavOpen"
            id="mobile-nav"
            role="navigation"
            aria-label="Mobil naviqasiya"
            class="absolute top-14 left-0 z-40 flex w-full flex-col space-y-3 border-b border-gray-200 bg-white p-4 shadow-xl md:hidden"
         >
            <router-link
               to="/stats"
               class="flex items-center gap-3 rounded-md px-3 py-2 font-medium text-gray-800 hover:bg-gray-50"
               aria-label="Statistika səhifəsinə get"
               @click="mobileNavOpen = false"
            >
               <font-awesome-icon
                  :icon="['fas', 'chart-pie']"
                  class="w-5 text-gray-400"
                  aria-hidden="true"
               />
               Statistika
            </router-link>
            <router-link
               to="/leaderboard"
               class="flex items-center gap-3 rounded-md px-3 py-2 font-medium text-gray-800 hover:bg-gray-50"
               aria-label="Liderlik cədvəlinə get"
               @click="mobileNavOpen = false"
            >
               <font-awesome-icon
                  :icon="['fas', 'trophy']"
                  class="w-5 text-amber-500"
                  aria-hidden="true"
               />
               İştirakçılar
            </router-link>
            <router-link
               to="/table"
               class="flex items-center gap-3 rounded-md px-3 py-2 font-medium text-gray-800 hover:bg-gray-50"
               aria-label="Siyahı səhifəsinə get"
               @click="mobileNavOpen = false"
            >
               <font-awesome-icon
                  :icon="['fas', 'list']"
                  class="w-5 text-gray-400"
                  aria-hidden="true"
               />
               Siyahı
            </router-link>
            <router-link
               to="/about"
               class="flex items-center gap-3 rounded-md px-3 py-2 font-medium text-gray-800 hover:bg-gray-50"
               aria-label="Haqqında səhifəsinə get"
               @click="mobileNavOpen = false"
            >
               <font-awesome-icon
                  :icon="['fas', 'circle-info']"
                  class="w-5 text-gray-400"
                  aria-hidden="true"
               />
               Haqqında
            </router-link>
         </div>
      </transition>

      <main
         id="main-content"
         role="main"
         class="relative min-h-0 w-full flex-1 overflow-y-auto"
         tabindex="-1"
      >
         <router-view />
      </main>
   </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useAuthStore } from "./stores/auth";

const auth = useAuthStore();
const menuOpen = ref(false);
const mobileNavOpen = ref(false);
const dropdownContainer = ref<HTMLElement | null>(null);

const toggleMenu = () => {
   menuOpen.value = !menuOpen.value;
};

const handleDropdownKeydown = (event: KeyboardEvent) => {
   // Close dropdown with Escape key
   if (event.key === "Escape" && menuOpen.value) {
      menuOpen.value = false;
      event.preventDefault();
   }
   // Open dropdown with Enter or Space
   if ((event.key === "Enter" || event.key === " ") && !menuOpen.value) {
      menuOpen.value = true;
      event.preventDefault();
   }
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
