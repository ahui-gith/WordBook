<script setup>
/**
 * StatsBar — 每日进度统计栏
 *
 * 显示：今日已复习数、剩余数量、新学进度
 */
import { computed } from 'vue'

const props = defineProps({
  stats: {
    type: Object,
    required: true
  }
})

const newWordProgress = computed(() => {
  return `${props.stats.newWordCount} / ${props.stats.dailyNewWordTarget}`
})

const totalProgress = computed(() => {
  const done = props.stats.reviewedCount
  const total = props.stats.reviewedCount + props.stats.remainingCount
  if (total === 0) return 0
  return Math.round((done / total) * 100)
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 w-full max-w-sm mx-auto">
    <!-- 总进度条 -->
    <div class="mb-3">
      <div class="flex justify-between text-sm text-gray-500 mb-1">
        <span>今日进度</span>
        <span>{{ totalProgress }}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div
          class="bg-indigo-500 h-2 rounded-full transition-all duration-300"
          :style="{ width: `${totalProgress}%` }"
        ></div>
      </div>
    </div>

    <!-- 统计数字 -->
    <div class="flex justify-around text-center">
      <div class="flex-1">
        <p class="text-2xl font-bold text-indigo-600">{{ stats.reviewedCount }}</p>
        <p class="text-xs text-gray-400">已复习</p>
      </div>
      <div class="flex-1 border-x border-gray-100">
        <p class="text-2xl font-bold text-gray-700">{{ stats.remainingCount }}</p>
        <p class="text-xs text-gray-400">剩余</p>
      </div>
      <div class="flex-1">
        <p class="text-2xl font-bold text-green-500">{{ newWordProgress }}</p>
        <p class="text-xs text-gray-400">新学</p>
      </div>
    </div>
  </div>
</template>
