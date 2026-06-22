<script setup>
/**
 * ImportExport — 个人数据管理组件
 *
 * 导出全量备份（v2 格式）：
 *   { version: 2, type: "full-backup", exportedAt, wordBooks, words, reviews, config }
 *
 * 导入：校验格式 → 清空旧数据 → 批量写入 → 恢复配置
 */
import { ref } from 'vue'
import db from '../db/index'
import { useVocabulary } from '../composables/useVocabulary'

const emit = defineEmits(['imported'])

const { getConfig, saveConfig } = useVocabulary()

const isExporting = ref(false)
const isImporting = ref(false)
const message = ref('')
const messageType = ref('success')

function showMsg(text, type = 'success') {
  message.value = text
  messageType.value = type
  setTimeout(() => { message.value = '' }, 5000)
}

// ==================== 导出 ====================
async function handleExport() {
  isExporting.value = true
  try {
    const [wordBooks, words, reviews] = await Promise.all([
      db.wordBooks.toArray(),
      db.words.toArray(),
      db.reviews.toArray()
    ])

    const config = getConfig()

    const data = {
      version: 2,
      type: 'full-backup',
      exportedAt: Date.now(),
      wordBooks: wordBooks.map(b => ({
        id: b.id,
        name: b.name,
        createdAt: b.createdAt
      })),
      words: words.map(w => ({
        id: w.id,
        word: w.word,
        pos: w.pos || '',
        meaning: w.meaning || '',
        phonetic: w.phonetic || '',
        bookId: w.bookId
      })),
      reviews: reviews.map(r => ({
        wordId: r.wordId,
        nextReviewAt: r.nextReviewAt,
        interval: r.interval,
        ease: r.ease,
        repetitions: r.repetitions
      })),
      config: {
        dailyReviewCount: config.dailyReviewCount ?? 0
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wordbook-full-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    showMsg(
      `导出成功！${data.wordBooks.length} 个单词本、${data.words.length} 个单词、${data.reviews.length} 条记录`,
      'success'
    )
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
    if (data.version !== 1 && data.version !== 2) {
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
    await db.transaction('rw', db.wordBooks, db.words, db.reviews, async () => {
      await db.wordBooks.clear()
      await db.words.clear()
      await db.reviews.clear()

      // 写入单词本（v2 格式）
      if (data.wordBooks && data.wordBooks.length > 0) {
        await db.wordBooks.bulkPut(data.wordBooks)
      } else {
        // 兼容 v1 格式：没有 wordBooks，创建默认单词本
        const defaultBookId = await db.wordBooks.put({
          name: '默认单词本',
          createdAt: Date.now()
        })
        // 确保所有单词有 bookId
        data.words.forEach(w => {
          if (!w.bookId) w.bookId = defaultBookId
        })
      }

      await db.words.bulkPut(data.words)
      await db.reviews.bulkPut(data.reviews.map(r => ({
        wordId: r.wordId,
        nextReviewAt: r.nextReviewAt || Date.now(),
        interval: r.interval || 1,
        ease: r.ease || 2.5,
        repetitions: r.repetitions || 0
      })))
    })

    // 恢复配置
    if (data.config) {
      saveConfig({ dailyReviewCount: data.config.dailyReviewCount ?? 0 })
    }

    const bookCount = data.wordBooks?.length || 1
    showMsg(
      `导入成功！${bookCount} 个单词本、${data.words.length} 个单词、${data.reviews.length} 条记录`,
      'success'
    )
    emit('imported')
  } catch (err) {
    console.error('导入失败：', err)
    showMsg('导入失败：' + (err.message || '未知错误'), 'error')
  } finally {
    isImporting.value = false
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}
</script>

<template>
  <div class="space-y-3">
    <!-- 导出内容说明 -->
    <div class="text-xs text-gray-400 space-y-0.5">
      <p>导出内容包括：</p>
      <p class="ml-2">📖 单词本 · 📝 单词数据 · 📊 学习与复习记录 · ⚙️ 个人配置</p>
    </div>

    <!-- 操作按钮 -->
    <div class="flex gap-3">
      <button
        @click="handleExport"
        :disabled="isExporting"
        class="flex-1 py-2.5 rounded-lg font-medium transition-all text-white bg-indigo-500 hover:bg-indigo-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isExporting ? '导出中...' : '📤 导出全部数据' }}
      </button>
      <button
        @click="triggerImport"
        :disabled="isImporting"
        class="flex-1 py-2.5 rounded-lg font-medium transition-all text-white bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isImporting ? '导入中...' : '📥 导入全部数据' }}
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
