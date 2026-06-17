<script setup>
/**
 * ImportExport — 数据导入导出组件
 *
 * 导出格式（按开发文档）：
 *   { version: 1, exportedAt: timestamp, words: [...], reviews: [...] }
 *
 * 导入：校验 version/words/reviews 合法性，清空旧数据后批量写入
 */
import { ref } from 'vue'
import db from '../db/index'

const emit = defineEmits(['imported'])

const isExporting = ref(false)
const isImporting = ref(false)
const message = ref('')
const messageType = ref('success') // 'success' | 'error'

function showMsg(text, type = 'success') {
  message.value = text
  messageType.value = type
  setTimeout(() => {
    message.value = ''
  }, 4000)
}

// ==================== 导出 ====================
async function handleExport() {
  isExporting.value = true
  try {
    const words = await db.words.toArray()
    const reviews = await db.reviews.toArray()

    const data = {
      version: 1,
      exportedAt: Date.now(),
      words: words.map(w => ({
        id: w.id,
        word: w.word,
        pos: w.pos || '',
        meaning: w.meaning || '',
        phonetic: w.phonetic || ''
      })),
      reviews: reviews.map(r => ({
        wordId: r.wordId,
        nextReviewAt: r.nextReviewAt,
        interval: r.interval,
        ease: r.ease,
        repetitions: r.repetitions
      }))
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vocab-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    showMsg(`导出成功！${data.words.length} 个单词，${data.reviews.length} 条复习记录`, 'success')
  } catch (err) {
    console.error('导出失败：', err)
    showMsg('导出失败：' + (err.message || '未知错误'), 'error')
  } finally {
    isExporting.value = false
  }
}

// ==================== 导入 ====================
const fileInput = ref(null)

function triggerImport() {
  fileInput.value?.click()
}

async function handleFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  isImporting.value = true
  try {
    const text = await file.text()
    const data = JSON.parse(text)

    // 校验格式
    if (!data || typeof data !== 'object') {
      throw new Error('无效的 JSON 格式')
    }
    if (data.version !== 1) {
      throw new Error(`不支持的备份版本: ${data.version}`)
    }
    if (!Array.isArray(data.words)) {
      throw new Error('备份文件缺少 words 字段或格式不正确')
    }
    if (!Array.isArray(data.reviews)) {
      throw new Error('备份文件缺少 reviews 字段或格式不正确')
    }

    // 校验 words 数组元素
    for (const w of data.words) {
      if (!w.id || !w.word) {
        throw new Error(`单词数据格式不正确: ${JSON.stringify(w)}`)
      }
    }

    // 清空旧数据并写入
    await db.transaction('rw', db.words, db.reviews, async () => {
      await db.words.clear()
      await db.reviews.clear()
      await db.words.bulkPut(data.words)
      await db.reviews.bulkPut(data.reviews.map(r => ({
        wordId: r.wordId,
        nextReviewAt: r.nextReviewAt || Date.now(),
        interval: r.interval || 1,
        ease: r.ease || 2.5,
        repetitions: r.repetitions || 0
      })))
    })

    showMsg(`导入成功！${data.words.length} 个单词，${data.reviews.length} 条复习记录`, 'success')
    emit('imported')
  } catch (err) {
    console.error('导入失败：', err)
    showMsg('导入失败：' + (err.message || '未知错误'), 'error')
  } finally {
    isImporting.value = false
    // 重置 input 以便重新选择同一文件
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}
</script>

<template>
  <div class="space-y-3">
    <!-- 操作按钮 -->
    <div class="flex gap-3">
      <button
        @click="handleExport"
        :disabled="isExporting"
        class="flex-1 py-2.5 rounded-lg font-medium transition-all text-white bg-indigo-500 hover:bg-indigo-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isExporting ? '导出中...' : '📤 导出数据' }}
      </button>
      <button
        @click="triggerImport"
        :disabled="isImporting"
        class="flex-1 py-2.5 rounded-lg font-medium transition-all text-white bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isImporting ? '导入中...' : '📥 导入数据' }}
      </button>
    </div>

    <!-- 隐藏的文件选择器 -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      class="hidden"
      @change="handleFileChange"
    />

    <!-- 提示消息 -->
    <p
      v-if="message"
      class="text-sm px-3 py-2 rounded-lg"
      :class="messageType === 'error'
        ? 'bg-red-50 text-red-600'
        : 'bg-green-50 text-green-600'"
    >
      {{ message }}
    </p>
  </div>
</template>
