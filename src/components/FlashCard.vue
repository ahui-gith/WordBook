<script setup>
/**
 * FlashCard — 单词卡片组件
 *
 * 正面：英文单词
 * 背面：中文释义、词性、音标、发音按钮
 * 底部三个反馈按钮：不认识(red)、模糊(yellow)、认识(green)
 */
import { ref, watch } from 'vue'

const props = defineProps({
  word: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['review'])

const isFlipped = ref(false)
const isSpeaking = ref(false)

// 切换单词时自动翻回正面
watch(() => props.word?.id, () => {
  isFlipped.value = false
})

// 翻转卡片
function flip() {
  isFlipped.value = !isFlipped.value
}

// 发音 (Web Speech API)
function speak() {
  if (!('speechSynthesis' in window)) return
  if (isSpeaking.value) return

  const utterance = new SpeechSynthesisUtterance(props.word.word)
  utterance.lang = 'en-US'
  utterance.rate = 0.85
  isSpeaking.value = true

  utterance.onend = () => {
    isSpeaking.value = false
  }
  utterance.onerror = () => {
    isSpeaking.value = false
  }

  speechSynthesis.cancel()
  speechSynthesis.speak(utterance)
}

// 反馈按钮点击
function handleReview(quality) {
  emit('review', quality)
}
</script>

<template>
  <div class="flex flex-col items-center w-full">
    <!-- 卡片区域 -->
    <div class="card-container w-full max-w-sm h-64 mb-6" @click="flip">
      <div class="card-inner cursor-pointer select-none" :class="{ flipped: isFlipped }">
        <!-- 正面：英文单词 -->
        <div class="card-front flex items-center justify-center bg-white rounded-2xl shadow-lg border border-gray-100">
          <div class="text-center">
            <p class="text-3xl font-bold text-gray-800 mb-2">{{ word.word }}</p>
            <p class="text-sm text-gray-400">点击翻转查看释义</p>
          </div>
        </div>
        <!-- 背面：中文释义 + 词性 + 音标 + 发音 -->
        <div class="card-back flex flex-col items-center justify-center bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <p class="text-2xl font-bold text-indigo-600 mb-2">{{ word.meaning }}</p>
          <p class="text-sm text-gray-500 mb-1">
            <span v-if="word.pos" class="mr-2">{{ word.pos }}</span>
            <span v-if="word.phonetic">{{ word.phonetic }}</span>
          </p>
          <button
            @click.stop="speak"
            :disabled="isSpeaking"
            class="mt-3 px-5 py-2.5 rounded-full text-sm transition-colors min-h-[44px]"
            :class="isSpeaking
              ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed'
              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:bg-indigo-200'"
          >
            {{ isSpeaking ? '🔊 播放中...' : '🔊 发音' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 反馈按钮 -->
    <div class="flex gap-3 w-full max-w-sm">
      <button
        @click="handleReview(0)"
        class="flex-1 py-3.5 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 active:bg-red-700 active:scale-95 transition-all min-h-[48px]"
      >
        不认识
      </button>
      <button
        @click="handleReview(1)"
        class="flex-1 py-3.5 rounded-xl font-medium text-white bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 active:scale-95 transition-all min-h-[48px]"
      >
        模糊
      </button>
      <button
        @click="handleReview(2)"
        class="flex-1 py-3.5 rounded-xl font-medium text-white bg-green-500 hover:bg-green-600 active:bg-green-700 active:scale-95 transition-all min-h-[48px]"
      >
        认识
      </button>
    </div>
  </div>
</template>
