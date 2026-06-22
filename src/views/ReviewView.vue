<script setup>
/**
 * ReviewView — 复习主页
 *
 * 功能：
 *   1. 支持两种复习方向：英→汉 / 汉→英（顶部切换）
 *   2. 调用 fetchReviewWords 获取到期复习单词
 *   3. 卡片翻转 + "不认识/模糊/认识"反馈按钮
 *   4. SM-2 算法更新间隔
 *   5. 全部复习完后显示统计
 */
import { onMounted, computed, ref } from 'vue'
import { useVocabulary } from '../composables/useVocabulary'
import FlashCard from '../components/FlashCard.vue'
import StatsBar from '../components/StatsBar.vue'

const {
  reviewWords,
  isLoading,
  error,
  reviewStats,
  fetchReviewWords,
  recordReview
} = useVocabulary()

const direction = ref('en-zh') // 'en-zh' | 'zh-en'

const isComplete = computed(() => {
  return !isLoading.value && reviewWords.value.length === 0
})

const currentWord = computed(() => {
  return reviewWords.value.length > 0 ? reviewWords.value[0] : null
})

const reviewError = ref(null)

// 加载到期复习单词
onMounted(async () => {
  await fetchReviewWords()
})

// 切换复习方向
function switchDirection(dir) {
  direction.value = dir
}

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
    <h1 class="text-2xl font-bold text-indigo-600 mb-4">🔄 单词复习</h1>

    <!-- 加载中 -->
    <div v-if="isLoading" class="flex items-center justify-center mt-20">
      <p class="text-gray-400">加载复习单词中...</p>
    </div>

    <!-- 加载出错 -->
    <div v-else-if="error" class="text-center mt-20">
      <p class="text-red-500 mb-4">{{ error }}</p>
      <button
        @click="fetchReviewWords"
        class="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
      >
        重试
      </button>
    </div>

    <!-- 复习完成 -->
    <div v-else-if="isComplete" class="text-center mt-10">
      <p class="text-6xl mb-4">🎉</p>
      <h2 class="text-xl font-bold text-gray-700 mb-2">今日复习完成</h2>
      <p class="text-gray-400 mb-8">继续保持，记忆更牢固！</p>
      <StatsBar mode="reviewing" :stats="reviewStats" />
    </div>

    <!-- 复习中 -->
    <template v-else>
      <!-- 复习方向切换 -->
      <div class="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4 w-full max-w-sm">
        <button
          @click="switchDirection('en-zh')"
          class="flex-1 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px]"
          :class="direction === 'en-zh'
            ? 'bg-white text-indigo-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'"
        >
          英 → 汉
        </button>
        <button
          @click="switchDirection('zh-en')"
          class="flex-1 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px]"
          :class="direction === 'zh-en'
            ? 'bg-white text-indigo-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'"
        >
          汉 → 英
        </button>
      </div>

      <!-- 进度提示 -->
      <p class="text-sm text-gray-400 mb-4">
        剩余 {{ reviewWords.length }} 个单词待复习
      </p>

      <!-- 复习错误提示 -->
      <p v-if="reviewError" class="text-sm text-red-500 mb-3">{{ reviewError }}</p>

      <!-- 单词卡片 -->
      <FlashCard
        :word="currentWord"
        mode="reviewing"
        :direction="direction"
        @review="handleReview"
      />

      <!-- 统计栏 -->
      <div class="mt-8 w-full">
        <StatsBar mode="reviewing" :stats="reviewStats" />
      </div>
    </template>
  </div>
</template>
