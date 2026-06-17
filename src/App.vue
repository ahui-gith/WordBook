<script setup>
import TabBar from './components/TabBar.vue'
</script>

<template>
  <div id="app-container" class="flex flex-col min-h-screen min-h-dvh bg-gray-50">
    <main class="page-content">
      <router-view />
    </main>
    <TabBar />
  </div>
</template>
