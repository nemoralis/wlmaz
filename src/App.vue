<template>
  <MonumentMap />
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import MonumentMap from './components/MonumentMap.vue'

export default defineComponent({
  name: 'App',
  components: { MonumentMap }
})
</script>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
