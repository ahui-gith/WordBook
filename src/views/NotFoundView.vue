<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen px-4">
    <h1 class="text-6xl font-bold text-indigo-300 mb-4">404</h1>
    <p class="text-gray-500 text-lg mb-8">页面不存在</p>
    <button
      @click="router.push('/')"
      class="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
    >
      返回首页
    </button>
  </div>
</template>
