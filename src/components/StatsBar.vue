<script setup>
/**
 * StatsBar — 统计栏
 *
 * mode="learning"：显示今日新学数量 + 剩余新词
 * mode="reviewing"：显示今日已复习数量 + 剩余数量
 */
import { computed } from 'vue'

const props = defineProps({
  mode: {
    type: String,
    default: 'reviewing',
    validator: v => ['learning', 'reviewing'].includes(v)
  },
  stats: {
    type: Object,
    required: true
    // learning: { newWordCount, remainingCount }
    // reviewing: { reviewCount, remainingCount }
  }
})

const progressPercent = computed(() => {
  const done = props.mode === 'learning'
    ? props.stats.newWordCount
    : props.stats.reviewCount
  const total = done + props.stats.remainingCount
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
        <span>{{ progressPercent }}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div
          class="h-2 rounded-full transition-all duration-300"
          :class="mode === 'learning' ? 'bg-emerald-500' : 'bg-indigo-500'"
          :style="{ width: `${progressPercent}%` }"
        ></div>
      </div>
    </div>

    <!-- 统计数字 -->
    <div class="flex justify-around text-center">
      <!-- 学习模式：今日新学 -->
      <div v-if="mode === 'learning'" class="flex-1">
        <p class="text-2xl font-bold text-emerald-500">{{ stats.newWordCount }}</p>
        <p class="text-xs text-gray-400">今日新学</p>
      </div>

      <!-- 复习模式：已复习 -->
      <div v-if="mode === 'reviewing'" class="flex-1">
        <p class="text-2xl font-bold text-indigo-600">{{ stats.reviewCount }}</p>
        <p class="text-xs text-gray-400">已复习</p>
      </div>

      <div class="flex-1 border-x border-gray-100">
        <p class="text-2xl font-bold text-gray-700">{{ stats.remainingCount }}</p>
        <p class="text-xs text-gray-400">剩余</p>
      </div>

      <!-- 学习模式：空占位保持布局 -->
      <div v-if="mode === 'learning'" class="flex-1">
        <p class="text-2xl font-bold text-gray-300">{{ stats.newWordCount + stats.remainingCount }}</p>
        <p class="text-xs text-gray-400">总计</p>
      </div>

      <!-- 复习模式：空占位保持布局 -->
      <div v-if="mode === 'reviewing'" class="flex-1">
        <p class="text-2xl font-bold text-gray-300">{{ stats.reviewCount + stats.remainingCount }}</p>
        <p class="text-xs text-gray-400">总计</p>
      </div>
    </div>
  </div>
</template>
