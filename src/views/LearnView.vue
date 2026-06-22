<script setup>
/**
 * LearnView — 学习主页
 *
 * 流程：
 *   1. 页面挂载时调用 fetchNewWords 获取所有未学单词（无数量限制）
 *   2. 显示第一张 FlashCard（learning 模式），用户点击"下一个"
 *   3. recordLearning 后自动切换到下一张卡片
 *   4. 全部学完后显示"今日学习完成"和统计
 */
import { onMounted, computed, ref } from 'vue'
import { useVocabulary } from '../composables/useVocabulary'
import FlashCard from '../components/FlashCard.vue'
import StatsBar from '../components/StatsBar.vue'

const {
  newWords,
  isLoading,
  error,
  learnStats,
  fetchNewWords,
  recordLearning
} = useVocabulary()

const isComplete = computed(() => {
  return !isLoading.value && newWords.value.length === 0
})

const currentWord = computed(() => {
  return newWords.value.length > 0 ? newWords.value[0] : null
})

const learnError = ref(null)

// 加载新词
onMounted(async () => {
  await fetchNewWords()
})

// 处理"下一个"
async function handleNext() {
  if (!currentWord.value) return
  learnError.value = null

  try {
    await recordLearning(currentWord.value.id)
  } catch (err) {
    learnError.value = '保存学习记录失败，请重试'
    console.error(err)
  }
}
</script>

<template>
  <div class="px-4 py-6 flex flex-col items-center">
    <h1 class="text-2xl font-bold text-emerald-600 mb-6">📖 单词学习</h1>

    <!-- 加载中 -->
    <div v-if="isLoading" class="flex items-center justify-center mt-20">
      <p class="text-gray-400">加载新词中...</p>
    </div>

    <!-- 加载出错 -->
    <div v-else-if="error" class="text-center mt-20">
      <p class="text-red-500 mb-4">{{ error }}</p>
      <button
        @click="fetchNewWords"
        class="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
      >
        重试
      </button>
    </div>

    <!-- 学习完成 -->
    <div v-else-if="isComplete" class="text-center mt-10">
      <p class="text-6xl mb-4">🎉</p>
      <h2 class="text-xl font-bold text-gray-700 mb-2">今日学习完成</h2>
      <p class="text-gray-400 mb-8">干得漂亮！所有新词都已学完～</p>
      <StatsBar mode="learning" :stats="learnStats" />
    </div>

    <!-- 学习中 -->
    <template v-else>
      <!-- 进度提示 -->
      <p class="text-sm text-gray-400 mb-4">
        剩余 {{ newWords.length }} 个新词
      </p>

      <!-- 错误提示 -->
      <p v-if="learnError" class="text-sm text-red-500 mb-3">{{ learnError }}</p>

      <!-- 单词卡片 -->
      <FlashCard
        :word="currentWord"
        mode="learning"
        @next="handleNext"
      />

      <!-- 统计栏 -->
      <div class="mt-8 w-full">
        <StatsBar mode="learning" :stats="learnStats" />
      </div>
    </template>
  </div>
</template>
