<script setup>
/**
 * FlashCard — 单词卡片组件
 *
 * mode="learning"（学习模式）：
 *   正面：英文单词，点击翻转
 *   背面：中文释义、词性、音标
 *   操作栏：发音按钮 + "下一个"按钮并列
 *
 * mode="reviewing"（复习模式）：
 *   direction="en-zh"：正面英文，背面中文 + 词性 + 音标 + 发音
 *   direction="zh-en"：正面中文，背面英文 + 词性 + 音标 + 发音
 *   操作栏："不认识" / "模糊" / "认识" 三个按钮
 */
import { ref, watch, computed } from 'vue'

const props = defineProps({
  word: {
    type: Object,
    required: true
  },
  mode: {
    type: String,
    default: 'reviewing', // 'learning' | 'reviewing'
    validator: v => ['learning', 'reviewing'].includes(v)
  },
  direction: {
    type: String,
    default: 'en-zh', // 'en-zh' | 'zh-en'（仅 reviewing 模式生效）
    validator: v => ['en-zh', 'zh-en'].includes(v)
  }
})

const emit = defineEmits(['review', 'next'])

const isFlipped = ref(false)
const isSpeaking = ref(false)

// 切换单词时自动翻回正面
watch(() => props.word?.id, () => {
  isFlipped.value = false
})

// 正面显示内容
const frontText = computed(() => {
  if (props.mode === 'learning') {
    return props.word.word          // 学习模式正面：英文
  }
  // 复习模式
  if (props.direction === 'zh-en') {
    return props.word.meaning       // 汉→英：正面显示中文
  }
  return props.word.word            // 英→汉：正面显示英文
})

// 背面显示内容
const backMain = computed(() => {
  if (props.mode === 'learning') {
    return props.word.meaning       // 学习模式背面：中文释义
  }
  // 复习模式
  if (props.direction === 'zh-en') {
    return props.word.word          // 汉→英：背面显示英文
  }
  return props.word.meaning         // 英→汉：背面显示中文
})

const backSub = computed(() => {
  if (props.direction === 'zh-en') {
    // 汉→英：背面显示词性 + 音标
    return [
      props.word.pos ? props.word.pos : '',
      props.word.phonetic ? props.word.phonetic : ''
    ].filter(Boolean).join(' · ')
  }
  // 英→汉 / 学习：背面显示词性 + 音标
  return [
    props.word.pos ? props.word.pos : '',
    props.word.phonetic ? props.word.phonetic : ''
  ].filter(Boolean).join(' · ')
})

// 正面提示文字
const frontHint = computed(() => {
  if (props.mode === 'learning') return '点击翻转查看释义'
  if (props.direction === 'zh-en') return '点击翻转查看英文'
  return '点击翻转查看释义'
})

// 翻转卡片
function flip() {
  isFlipped.value = !isFlipped.value
}

// 发音 (Web Speech API)
function speak() {
  if (!('speechSynthesis' in window)) return
  if (isSpeaking.value) return

  // 始终朗读英文单词
  const textToSpeak = props.word.word
  const utterance = new SpeechSynthesisUtterance(textToSpeak)
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

// 复习反馈按钮点击
function handleReview(quality) {
  emit('review', quality)
}

// 学习"下一个"按钮点击
function handleNext() {
  emit('next')
}
</script>

<template>
  <div class="flex flex-col items-center w-full">
    <!-- 卡片区域 -->
    <div class="card-container w-full max-w-sm h-64 mb-6" @click="flip">
      <div class="card-inner cursor-pointer select-none" :class="{ flipped: isFlipped }">
        <!-- 正面 -->
        <div class="card-front flex items-center justify-center bg-white rounded-2xl shadow-lg border border-gray-100">
          <div class="text-center px-4">
            <p class="text-3xl font-bold text-gray-800 mb-2"
              :class="{ 'text-2xl': mode === 'reviewing' && direction === 'zh-en' }">
              {{ frontText }}
            </p>
            <p class="text-sm text-gray-400">{{ frontHint }}</p>
          </div>
        </div>
        <!-- 背面 -->
        <div class="card-back flex flex-col items-center justify-center bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <p class="text-2xl font-bold text-indigo-600 mb-2"
            :class="{ 'text-xl': mode === 'reviewing' && direction === 'zh-en' && backMain.length > 20 }">
            {{ backMain }}
          </p>
          <p v-if="backSub" class="text-sm text-gray-500 mb-1">{{ backSub }}</p>
          <!-- 复习模式下发音按钮在背面 -->
          <button
            v-if="mode === 'reviewing'"
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

    <!-- 学习模式操作栏：发音 + 下一个 -->
    <div v-if="mode === 'learning'" class="flex gap-3 w-full max-w-sm">
      <button
        @click.stop="speak"
        :disabled="isSpeaking"
        class="flex-1 py-3.5 rounded-xl font-medium transition-all min-h-[48px]"
        :class="isSpeaking
          ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed'
          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:bg-indigo-200 active:scale-95'"
      >
        {{ isSpeaking ? '🔊 播放中...' : '🔊 发音' }}
      </button>
      <button
        @click="handleNext"
        class="flex-1 py-3.5 rounded-xl font-medium text-white bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 active:scale-95 transition-all min-h-[48px]"
      >
        下一个
      </button>
    </div>

    <!-- 复习模式操作栏：不认识 / 模糊 / 认识 -->
    <div v-if="mode === 'reviewing'" class="flex gap-3 w-full max-w-sm">
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
