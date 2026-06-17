<script setup>
/**
 * SettingsView — 设置页
 *
 * 功能：
 *   1. 修改每日复习数量（localStorage 保存）
 *   2. 修改每日新学数量（localStorage 保存）
 *   3. 重置数据（清空 words + reviews 并重新初始化）
 *   4. 导入导出入口
 */
import { ref, onMounted } from 'vue'
import { useVocabulary } from '../composables/useVocabulary'
import db, { initDB } from '../db/index'
import ImportExport from '../components/ImportExport.vue'

const { getConfig, saveConfig } = useVocabulary()

const dailyReviewCount = ref(20)
const dailyNewWordCount = ref(10)
const isSaved = ref(false)
const resetConfirm = ref(false)
const resetMessage = ref('')
const resetMessageType = ref('success')

onMounted(() => {
  const config = getConfig()
  dailyReviewCount.value = config.dailyReviewCount
  dailyNewWordCount.value = config.dailyNewWordCount
})

// ==================== 保存配置 ====================
function handleSave() {
  saveConfig({
    dailyReviewCount: dailyReviewCount.value,
    dailyNewWordCount: dailyNewWordCount.value
  })
  isSaved.value = true
  setTimeout(() => {
    isSaved.value = false
  }, 2000)
}

// ==================== 重置数据 ====================
async function handleReset() {
  try {
    await db.transaction('rw', db.words, db.reviews, async () => {
      await db.words.clear()
      await db.reviews.clear()
    })
    // 重新初始化默认词库
    await initDB()
    resetConfirm.value = false
    resetMessage.value = '数据已重置，默认词库已重新导入'
    resetMessageType.value = 'success'
    setTimeout(() => {
      resetMessage.value = ''
    }, 4000)
  } catch (err) {
    console.error('重置失败：', err)
    resetMessage.value = '重置失败：' + (err.message || '未知错误')
    resetMessageType.value = 'error'
  }
}

function handleImported() {
  resetMessage.value = '数据导入成功，页面将在下次进入复习时更新'
  resetMessageType.value = 'success'
  setTimeout(() => {
    resetMessage.value = ''
  }, 4000)
}
</script>

<template>
  <div class="px-4 py-6">
    <h1 class="text-2xl font-bold text-indigo-600 mb-6">⚙️ 设置</h1>

    <!-- ===== 每日任务设置 ===== -->
    <section class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
      <h2 class="text-base font-semibold text-gray-700 mb-4">每日任务</h2>

      <div class="space-y-4">
        <!-- 每日复习数量 -->
        <div>
          <label class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-500">每日复习数量</span>
            <span class="text-sm font-bold text-indigo-600">{{ dailyReviewCount }} 个</span>
          </label>
          <input
            v-model.number="dailyReviewCount"
            type="range"
            min="5"
            max="50"
            step="5"
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div class="flex justify-between text-xs text-gray-300 mt-1">
            <span>5</span>
            <span>50</span>
          </div>
        </div>

        <!-- 每日新学数量 -->
        <div>
          <label class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-500">每日新学数量</span>
            <span class="text-sm font-bold text-indigo-600">{{ dailyNewWordCount }} 个</span>
          </label>
          <input
            v-model.number="dailyNewWordCount"
            type="range"
            min="5"
            max="30"
            step="5"
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div class="flex justify-between text-xs text-gray-300 mt-1">
            <span>5</span>
            <span>30</span>
          </div>
        </div>
      </div>

      <!-- 保存按钮 -->
      <button
        @click="handleSave"
        class="mt-4 w-full py-2.5 rounded-lg font-medium transition-all text-white"
        :class="isSaved
          ? 'bg-green-500'
          : 'bg-indigo-500 hover:bg-indigo-600 active:scale-95'"
      >
        {{ isSaved ? '✅ 已保存' : '💾 保存设置' }}
      </button>
    </section>

    <!-- ===== 数据管理 ===== -->
    <section class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
      <h2 class="text-base font-semibold text-gray-700 mb-4">数据管理</h2>
      <ImportExport @imported="handleImported" />
    </section>

    <!-- ===== 危险操作 ===== -->
    <section class="bg-white rounded-2xl shadow-sm border border-red-100 p-5">
      <h2 class="text-base font-semibold text-red-500 mb-2">危险操作</h2>
      <p class="text-sm text-gray-400 mb-4">重置将清空所有学习数据并重新导入默认词库</p>

      <!-- 未确认时显示按钮 -->
      <button
        v-if="!resetConfirm"
        @click="resetConfirm = true"
        class="w-full py-2.5 rounded-lg font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
      >
        🔄 重置所有数据
      </button>

      <!-- 确认步骤 -->
      <div v-else class="space-y-3">
        <p class="text-sm text-red-500 font-medium text-center">确定要重置所有数据吗？此操作不可撤销！</p>
        <div class="flex gap-3">
          <button
            @click="resetConfirm = false"
            class="flex-1 py-2 rounded-lg font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            @click="handleReset"
            class="flex-1 py-2 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            确认重置
          </button>
        </div>
      </div>

      <!-- 操作提示 -->
      <p
        v-if="resetMessage"
        class="mt-3 text-sm px-3 py-2 rounded-lg"
        :class="resetMessageType === 'error'
          ? 'bg-red-50 text-red-600'
          : 'bg-green-50 text-green-600'"
      >
        {{ resetMessage }}
      </p>
    </section>

    <!-- ===== 关于 ===== -->
    <section class="text-center mt-8 pb-4">
      <p class="text-xs text-gray-300">WordBook v1.0.0</p>
      <p class="text-xs text-gray-300">基于 Vue 3 + Vite + Dexie.js 构建</p>
    </section>
  </div>
</template>
