<script setup>
/**
 * ReviewView — 复习主页
 *
 * 流程：
 *   1. 页面挂载时调用 fetchTodayWords 获取今日任务
 *   2. 显示第一张 FlashCard，用户点击反馈按钮
 *   3. recordReview 后自动切换到下一张卡片
 *   4. 全部复习完成后显示"今日任务完成"和统计
 */
import { onMounted, computed, ref } from 'vue'
import { useVocabulary } from '../composables/useVocabulary'
import FlashCard from '../components/FlashCard.vue'
import StatsBar from '../components/StatsBar.vue'

const {
  todayWords,
  isLoading,
  error,
  stats,
  fetchTodayWords,
  recordReview
} = useVocabulary()

const isComplete = computed(() => {
  return !isLoading.value && todayWords.value.length === 0
})

const currentWord = computed(() => {
  return todayWords.value.length > 0 ? todayWords.value[0] : null
})

const reviewError = ref(null)

// 加载今日任务
onMounted(async () => {
  await fetchTodayWords()
})

// 处理复习反馈
async function handleReview(quality) {
  if (!currentWord.value) return
  reviewError.value = null

  try {
    await recordReview(currentWord.value.id, quality)
  } catch (err) {
    reviewError.value = '保存复习记录失败，请重试'
    console.error(err)
  }
}
</script>

<template>
  <div class="px-4 py-6 flex flex-col items-center">
    <h1 class="text-2xl font-bold text-indigo-600 mb-6">📖 单词复习</h1>

    <!-- 加载中 -->
    <div v-if="isLoading" class="flex items-center justify-center mt-20">
      <p class="text-gray-400">加载今日单词中...</p>
    </div>

    <!-- 加载出错 -->
    <div v-else-if="error" class="text-center mt-20">
      <p class="text-red-500 mb-4">{{ error }}</p>
      <button
        @click="fetchTodayWords"
        class="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
      >
        重试
      </button>
    </div>

    <!-- 今日任务完成 -->
    <div v-else-if="isComplete" class="text-center mt-10">
      <p class="text-6xl mb-4">🎉</p>
      <h2 class="text-xl font-bold text-gray-700 mb-2">今日任务完成</h2>
      <p class="text-gray-400 mb-8">干得漂亮！明天继续保持哦～</p>
      <StatsBar :stats="stats" />
    </div>

    <!-- 复习中 -->
    <template v-else>
      <!-- 进度提示 -->
      <p class="text-sm text-gray-400 mb-4">
        剩余 {{ todayWords.length }} 个单词
      </p>

      <!-- 复习错误提示 -->
      <p v-if="reviewError" class="text-sm text-red-500 mb-3">{{ reviewError }}</p>

      <!-- 单词卡片 -->
      <FlashCard
        :word="currentWord"
        @review="handleReview"
      />

      <!-- 统计栏 -->
      <div class="mt-8 w-full">
        <StatsBar :stats="stats" />
      </div>
    </template>
  </div>
</template>
