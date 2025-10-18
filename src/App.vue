<template>
  <div id="app">
    <header class="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-6">
      <!-- Logo -->
      <a href="/" class="flex items-center h-full">
        <img src="/src/public/wlm-az.png" alt="Wiki Loves Monuments Azerbaijan" class="h-10 w-auto" />
      </a>

      <!-- Navigation -->
      <nav class="flex gap-4">
        <router-link to="/about" class="text-gray-700 hover:text-blue-600 font-medium text-sm">
          Haqqında
        </router-link>
      </nav>

      <!-- Spacer -->
      <div class="ml-auto flex items-center gap-4 relative">
        <!-- User Menu -->
        <div v-if="auth.user" class="relative">
          <button @click="menuOpen = !menuOpen"
            class="flex items-center gap-2 text-gray-800 font-medium hover:text-blue-600">
            <span>{{ auth.user.profile.displayName || 'İstifadəçi adı' }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div v-if="menuOpen"
            class="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-md z-[9999] py-1">
            <a :href="commonsUrl" target="_blank" rel="noopener"
              class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              Mənim yükləmələrim
            </a>
            <button @click="logout" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              Çıxış
            </button>
          </div>
        </div>

        <!-- Login Button -->
        <button v-else @click="auth.login"
          class="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700">
          Daxil ol
        </button>
      </div>
    </header>

    <main class="h-[calc(100vh-48px)] w-full">
      <router-view />
    </main>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
const menuOpen = ref(false)

function logout() {
  auth.logout()
  menuOpen.value = false
}

const commonsUrl = computed(() => {
  const username = auth.user?.profile?.displayName
  return username
    ? `https://commons.wikimedia.org/wiki/Special:ListFiles/${username}`
    : 'https://commons.wikimedia.org/wiki/Special:ListFiles'
})

onMounted(() => {
  auth.fetchUser()
})
</script>