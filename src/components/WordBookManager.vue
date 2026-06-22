<script setup>
/**
 * WordBookManager — 单词本管理组件
 *
 * 功能：
 *   1. 列举所有单词本（名称 + 单词数量）
 *   2. 左滑露出删除按钮
 *   3. 导入单词本（弹窗提示格式 → 选择 JSON 文件）
 */
import { ref, onMounted } from 'vue'
import db, { getWordBooksWithCount, deleteWordBook, importWordBook } from '../db/index'

const emit = defineEmits(['changed'])

const books = ref([])
const isLoading = ref(true)
const message = ref('')
const messageType = ref('success')

// 左滑状态
const swipedBookId = ref(null)
const touchStartX = ref(0)
const touchCurrentX = ref(0)

// 删除确认
const deleteConfirmId = ref(null)

// 导入弹窗
const showFormatDialog = ref(false)
const importFileInput = ref(null)

// ==================== 加载单词本列表 ====================
async function loadBooks() {
  isLoading.value = true
  try {
    books.value = await getWordBooksWithCount()
  } catch (err) {
    console.error('加载单词本失败：', err)
    showMsg('加载单词本失败', 'error')
  } finally {
    isLoading.value = false
  }
}

onMounted(loadBooks)

// ==================== 消息提示 ====================
function showMsg(text, type = 'success') {
  message.value = text
  messageType.value = type
  setTimeout(() => { message.value = '' }, 4000)
}

// ==================== 左滑手势 ====================
function onTouchStart(bookId, e) {
  touchStartX.value = e.touches[0].clientX
  touchCurrentX.value = 0
}

function onTouchMove(bookId, e) {
  const deltaX = e.touches[0].clientX - touchStartX.value
  // 只允许左滑（负值），限制最大偏移
  if (deltaX < 0) {
    touchCurrentX.value = Math.max(deltaX, -80)
  }
}

function onTouchEnd(bookId) {
  if (touchCurrentX.value < -40) {
    // 超过阈值，显示删除按钮
    swipedBookId.value = bookId
  } else {
    // 未达阈值，回弹
    swipedBookId.value = null
  }
  touchCurrentX.value = 0
}

function closeSwipe() {
  swipedBookId.value = null
}

// ==================== 删除单词本 ====================
function confirmDelete(bookId) {
  deleteConfirmId.value = bookId
}

async function handleDelete() {
  const bookId = deleteConfirmId.value
  if (!bookId) return

  try {
    await deleteWordBook(bookId)
    deleteConfirmId.value = null
    swipedBookId.value = null
    showMsg('单词本已删除', 'success')
    await loadBooks()
    emit('changed')
  } catch (err) {
    showMsg(err.message || '删除失败', 'error')
    deleteConfirmId.value = null
  }
}

// ==================== 导入单词本 ====================
function showImportFormat() {
  showFormatDialog.value = true
}

function confirmImport() {
  showFormatDialog.value = false
  importFileInput.value?.click()
}

async function handleImportFile(event) {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (!Array.isArray(data)) {
      throw new Error('文件格式不正确：需要一个 JSON 数组')
    }

    // 用文件名（去掉扩展名）作为单词本名称
    const bookName = file.name.replace(/\.json$/i, '') || '导入的单词本'

    const result = await importWordBook(bookName, data)
    showMsg(`"${bookName}"导入成功！共 ${result.count} 个单词`, 'success')
    await loadBooks()
    emit('changed')
  } catch (err) {
    console.error('导入单词本失败：', err)
    showMsg('导入失败：' + (err.message || '格式错误'), 'error')
  } finally {
    // 重置 input
    if (importFileInput.value) {
      importFileInput.value.value = ''
    }
  }
}
</script>

<template>
  <div class="space-y-3">
    <!-- 加载中 -->
    <p v-if="isLoading" class="text-sm text-gray-400 text-center py-4">加载中...</p>

    <!-- 单词本列表 -->
    <ul v-else class="space-y-2">
      <li
        v-for="book in books"
        :key="book.id"
        class="relative overflow-hidden rounded-xl"
      >
        <!-- 背景删除按钮（左滑露出） -->
        <div class="absolute right-0 top-0 bottom-0 flex items-center">
          <button
            @click="confirmDelete(book.id)"
            class="h-full px-5 bg-red-500 text-white text-sm font-medium rounded-r-xl hover:bg-red-600 transition-colors min-h-[56px]"
          >
            删除
          </button>
        </div>

        <!-- 单词本内容（可左滑） -->
        <div
          class="relative bg-white border border-gray-100 rounded-xl px-4 py-3.5 flex items-center justify-between transition-transform duration-200 z-10"
          :class="{ 'shadow-sm': swipedBookId === book.id }"
          :style="swipedBookId === book.id
            ? { transform: 'translateX(-64px)' }
            : { transform: 'translateX(0)' }"
          @touchstart="onTouchStart(book.id, $event)"
          @touchmove="onTouchMove(book.id, $event)"
          @touchend="onTouchEnd(book.id)"
          @click="closeSwipe"
        >
          <div class="flex items-center gap-3 min-w-0">
            <span class="text-lg">📖</span>
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-700 truncate">{{ book.name }}</p>
              <p class="text-xs text-gray-400">{{ book.wordCount }} 个单词</p>
            </div>
          </div>
          <span class="text-xs text-gray-300 shrink-0 ml-2">← 左滑删除</span>
        </div>
      </li>
    </ul>

    <!-- 空状态 -->
    <p v-if="!isLoading && books.length === 0" class="text-sm text-gray-400 text-center py-4">
      暂无单词本
    </p>

    <!-- 导入按钮 -->
    <button
      @click="showImportFormat"
      class="w-full py-2.5 rounded-lg font-medium text-indigo-500 border border-dashed border-indigo-300 hover:bg-indigo-50 active:bg-indigo-100 transition-colors"
    >
      📥 导入单词本
    </button>

    <!-- 隐藏的文件选择器 -->
    <input
      ref="importFileInput"
      type="file"
      accept=".json"
      class="hidden"
      @change="handleImportFile"
    />

    <!-- 提示消息 -->
    <p
      v-if="message"
      class="text-sm px-3 py-2 rounded-lg"
      :class="messageType === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'"
    >
      {{ message }}
    </p>

    <!-- ========== 删除确认弹窗 ========== -->
    <Teleport to="body">
      <div
        v-if="deleteConfirmId"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="deleteConfirmId = null"
      >
        <div class="bg-white rounded-2xl mx-4 p-6 shadow-xl max-w-sm w-full">
          <p class="text-lg font-semibold text-gray-800 mb-2">确认删除</p>
          <p class="text-sm text-gray-500 mb-6">
            将删除该单词本及其下所有单词和学习记录，此操作不可撤销。
          </p>
          <div class="flex gap-3">
            <button
              @click="deleteConfirmId = null"
              class="flex-1 py-2.5 rounded-lg font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              @click="handleDelete"
              class="flex-1 py-2.5 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              确认删除
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ========== 导入格式提示弹窗 ========== -->
    <Teleport to="body">
      <div
        v-if="showFormatDialog"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="showFormatDialog = false"
      >
        <div class="bg-white rounded-2xl mx-4 p-6 shadow-xl max-w-sm w-full max-h-[80vh] overflow-y-auto">
          <p class="text-lg font-semibold text-gray-800 mb-3">📋 单词本格式说明</p>
          <div class="text-sm text-gray-600 space-y-2 mb-4">
            <p>支持 <strong>JSON 数组</strong>格式，每个单词包含以下字段：</p>
            <ul class="list-disc list-inside space-y-1 text-gray-500 ml-2">
              <li><strong>id</strong>：数字，单词编号（选填，自动生成）</li>
              <li><strong>word</strong>：字符串，英文单词（<span class="text-red-400">必填</span>）</li>
              <li><strong>pos</strong>：字符串，词性，如 "v."（选填）</li>
              <li><strong>meaning</strong>：字符串，中文释义（选填）</li>
              <li><strong>phonetic</strong>：字符串，音标（选填）</li>
            </ul>
            <p class="text-gray-400 pt-2">示例：</p>
            <pre class="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 overflow-x-auto"><code>[
  {
    "id": 1,
    "word": "hello",
    "pos": "int.",
    "meaning": "你好",
    "phonetic": "/həˈloʊ/"
  },
  {
    "id": 2,
    "word": "world",
    "pos": "n.",
    "meaning": "世界",
    "phonetic": "/wɜːrld/"
  }
]</code></pre>
            <p class="text-gray-400 text-xs">文件名将作为单词本名称</p>
          </div>
          <div class="flex gap-3">
            <button
              @click="showFormatDialog = false"
              class="flex-1 py-2.5 rounded-lg font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              @click="confirmImport"
              class="flex-1 py-2.5 rounded-lg font-medium text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
            >
              选择文件
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
