<script setup>
/**
 * StoryView — 故事阅读页
 *
 * 功能：
 *   1. 故事选择器
 *   2. 英文段落（单词可点击查词）
 *   3. 点击查词弹窗（单词、词性、音标、释义）
 *   4. 全文朗读（SpeechSynthesis）
 *   5. 显示/隐藏中文译文
 */
import { ref, computed, onMounted } from 'vue'
import storiesData from '../data/stories.json'
import { lookupWord } from '../lib/dictionary.js'

// ==================== 故事列表 ====================
const stories = ref(storiesData)
const selectedStoryId = ref(storiesData.length > 0 ? storiesData[0].id : null)

const currentStory = computed(() => {
  return stories.value.find(s => s.id === selectedStoryId.value) || null
})

// ==================== 内容分词（按空格和标点拆分） ====================
const contentWords = computed(() => {
  if (!currentStory.value) return []
  // 使用正则拆分，保留单词和标点
  const tokens = currentStory.value.content.match(/[\w']+|[^\w\s]+/g) || []
  return tokens.map((token, index) => ({
    text: token,
    index,
    isWord: /^[\w']+$/.test(token) // 只有字母和撇号才算"单词"
  }))
})

// ==================== 查词弹窗 ====================
const popoverVisible = ref(false)
const popoverWord = ref('')
const popoverResult = ref(null)
const popoverLoading = ref(false)
const popoverPosition = ref({ x: 0, y: 0 })

async function handleWordClick(wordText, event) {
  // 非单词不处理
  if (!/^[\w']+$/.test(wordText)) {
    popoverVisible.value = false
    return
  }

  // 设置弹窗位置（移动端适配：限制在屏幕范围内）
  const rect = event.target.getBoundingClientRect()
  let x = rect.left + rect.width / 2
  const y = rect.top - 8

  // 防弹窗溢出屏幕左右边界
  const popoverWidth = 260
  const padding = 12
  if (x - popoverWidth / 2 < padding) {
    x = popoverWidth / 2 + padding
  } else if (x + popoverWidth / 2 > window.innerWidth - padding) {
    x = window.innerWidth - popoverWidth / 2 - padding
  }

  popoverPosition.value = { x, y }

  popoverWord.value = wordText
  popoverLoading.value = true
  popoverVisible.value = true

  try {
    const result = await lookupWord(wordText)
    popoverResult.value = result
  } catch (err) {
    console.error('查词失败：', err)
    popoverResult.value = { found: false, word: null, message: '查询失败' }
  } finally {
    popoverLoading.value = false
  }
}

function closePopover() {
  popoverVisible.value = false
  popoverResult.value = null
}

// ==================== 全文朗读 ====================
const isReading = ref(false)
const showTranslation = ref(false)

function readFullText() {
  if (!('speechSynthesis' in window) || !currentStory.value) return
  if (isReading.value) {
    speechSynthesis.cancel()
    isReading.value = false
    return
  }

  const utterance = new SpeechSynthesisUtterance(currentStory.value.content)
  utterance.lang = 'en-US'
  utterance.rate = 0.9
  isReading.value = true

  utterance.onend = () => {
    isReading.value = false
  }
  utterance.onerror = () => {
    isReading.value = false
  }

  speechSynthesis.cancel()
  speechSynthesis.speak(utterance)
}

// ==================== 切换故事 ====================
function selectStory(id) {
  selectedStoryId.value = id
  closePopover()
}

// ==================== 全局点击关闭弹窗 ====================
function onPageClick(event) {
  // 如果点击的不是单词，关闭弹窗
  if (popoverVisible.value && !event.target.closest('.word-token') && !event.target.closest('.word-popover')) {
    closePopover()
  }
}
</script>

<template>
  <div class="px-4 py-6" @click="onPageClick">
    <h1 class="text-2xl font-bold text-indigo-600 mb-4">📚 故事阅读</h1>

    <!-- 故事选择器 -->
    <div v-if="stories.length > 1" class="mb-4 flex gap-2 overflow-x-auto pb-2">
      <button
        v-for="story in stories"
        :key="story.id"
        @click="selectStory(story.id)"
        class="whitespace-nowrap px-3 py-1.5 rounded-full text-sm transition-colors"
        :class="selectedStoryId === story.id
          ? 'bg-indigo-500 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
      >
        {{ story.title }}
      </button>
    </div>

    <!-- 没有故事 -->
    <div v-if="!currentStory" class="text-center text-gray-400 mt-20">
      <p class="text-4xl mb-4">📭</p>
      <p>暂无故事，请在 stories.json 中添加内容</p>
    </div>

    <!-- 故事内容 -->
    <template v-if="currentStory">
      <!-- 操作栏 -->
      <div class="flex items-center gap-3 mb-6">
        <button
          @click="readFullText"
          class="flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors"
          :class="isReading
            ? 'bg-red-100 text-red-600 hover:bg-red-200'
            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'"
        >
          {{ isReading ? '⏹ 停止' : '🔊 朗读全文' }}
        </button>
        <button
          @click="showTranslation = !showTranslation"
          class="flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors"
          :class="showTranslation
            ? 'bg-emerald-100 text-emerald-600'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
        >
          {{ showTranslation ? '🙈 隐藏译文' : '📝 显示译文' }}
        </button>
      </div>

      <!-- 英文内容（可点击单词） -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4 leading-loose text-lg">
        <span
          v-for="token in contentWords"
          :key="token.index"
          :class="token.isWord ? 'word-token cursor-pointer hover:text-indigo-600 hover:underline decoration-indigo-300 underline-offset-4 transition-colors inline-block px-0.5 py-0.5 min-w-[24px] text-center' : ''"
          @click="token.isWord ? handleWordClick(token.text, $event) : undefined"
        >{{ token.text }}{{ token.isWord || contentWords[token.index + 1]?.isWord ? ' ' : '' }}</span>
      </div>

      <!-- 中文译文 -->
      <div
        v-if="showTranslation"
        class="bg-indigo-50 rounded-2xl border border-indigo-100 p-5 leading-loose text-gray-700"
      >
        <p class="text-xs text-indigo-400 mb-2">中文译文</p>
        {{ currentStory.translation }}
      </div>
    </template>

    <!-- ========== 查词弹窗 ========== -->
    <Teleport to="body">
      <div
        v-if="popoverVisible"
        class="word-popover fixed z-50 transform -translate-x-1/2 -translate-y-full"
        :style="{ left: popoverPosition.x + 'px', top: popoverPosition.y + 'px' }"
      >
        <div class="bg-white rounded-xl shadow-xl border border-gray-200 p-4 min-w-[200px] max-w-[280px]">
          <!-- 加载中 -->
          <div v-if="popoverLoading" class="text-center text-gray-400 text-sm py-2">
            查询中...
          </div>

          <!-- 查询结果 -->
          <template v-else-if="popoverResult">
            <!-- 找到了 -->
            <template v-if="popoverResult.found && popoverResult.word">
              <div class="flex items-center justify-between mb-2">
                <span class="text-lg font-bold text-gray-800">{{ popoverResult.word.word }}</span>
                <button
                  @click="closePopover"
                  class="text-gray-300 hover:text-gray-500 text-sm leading-none"
                >✕</button>
              </div>
              <div class="text-sm space-y-1">
                <p v-if="popoverResult.word.pos" class="text-gray-400">
                  <span class="text-indigo-500 font-medium">{{ popoverResult.word.pos }}</span>
                </p>
                <p v-if="popoverResult.word.phonetic" class="text-gray-400 font-mono">
                  {{ popoverResult.word.phonetic }}
                </p>
                <p class="text-gray-700 font-medium text-base">
                  {{ popoverResult.word.meaning }}
                </p>
              </div>
              <p v-if="popoverResult.message" class="text-xs text-gray-300 mt-2">{{ popoverResult.message }}</p>
            </template>

            <!-- 未收录 -->
            <template v-else>
              <div class="flex items-center justify-between mb-1">
                <span class="font-bold text-gray-700">{{ popoverWord }}</span>
                <button
                  @click="closePopover"
                  class="text-gray-300 hover:text-gray-500 text-sm leading-none"
                >✕</button>
              </div>
              <p class="text-sm text-gray-400">词库未收录</p>
            </template>
          </template>
        </div>
        <!-- 小三角箭头 -->
        <div class="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
      </div>
    </Teleport>
  </div>
</template>
