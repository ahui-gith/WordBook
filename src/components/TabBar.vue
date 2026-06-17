<script setup>
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

const tabs = [
  { path: '/', label: '复习', icon: '📖' },
  { path: '/story', label: '故事', icon: '📚' },
  { path: '/settings', label: '设置', icon: '⚙️' }
]

const isActive = (path) => {
  return route.path === path
}
</script>

<template>
  <nav class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 z-40"
    style="padding-bottom: env(safe-area-inset-bottom, 0px);">
    <div class="flex justify-around items-center h-16">
      <router-link
        v-for="tab in tabs"
        :key="tab.path"
        :to="tab.path"
        class="flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-colors select-none"
        active-class="text-indigo-600"
        :class="isActive(tab.path) ? 'text-indigo-600' : 'text-gray-400'"
      >
        <span class="text-xl">{{ tab.icon }}</span>
        <span class="text-xs mt-1">{{ tab.label }}</span>
      </router-link>
    </div>
  </nav>
</template>
