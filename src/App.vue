<template>
  <div id="app">
    <header class="app-header">
      <a href="/" class="logo-link">
        <img src="/src/public/wlm-az.png" alt="Wiki Loves Monuments Azerbaijan" class="logo" />
      </a>

      <nav class="nav-links">
        <router-link to="/about" class="nav-link">About</router-link>
      </nav>
    </header>

    <main id="main">
      <router-view />
    </main>
  </div>
</template>

<script lang="ts">
import MonumentMap from './components/MonumentMap.vue'

export default {
  components: { MonumentMap }
}
</script>

<style scoped>
.app-header {
  height: 48px;
  background-color: #fff;
  border-bottom: 1px solid #ddd;
  display: flex;
  align-items: center;
  padding: 0 16px;
  box-sizing: border-box;
  gap: 24px;
}

.logo-link {
  display: inline-flex;
  align-items: center;
  height: 100%;
}

.logo {
  height: 42px;
  width: auto;
}

.nav-links {
  display: flex;
  gap: 16px;
}

.nav-link {
  text-decoration: none;
  color: #333;
  font-weight: 500;
  font-size: 14px;
  transition: color 0.2s ease;
}

.nav-link.router-link-active {
  color: #0078d4;
}

.nav-link:hover {
  color: #005fa3;
}

#main {
  height: calc(100vh - 48px);
  width: 100%;
}
</style>
