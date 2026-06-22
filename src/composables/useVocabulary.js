/**
 * 核心组合式函数 — 管理学习任务、复习任务、统计数据
 *
 * 学习任务（LearnView）：
 *   1. 获取所有无复习记录的单词（新词）
 *   2. 无数量上限，自由学习
 *   3. 点击"下一个"用 quality=2 标记已学，进入 SM-2 系统
 *
 * 复习任务（ReviewView）：
 *   1. 获取所有 nextReviewAt <= 当前时间 的到期单词
 *   2. 按 nextReviewAt 升序排序
 *   3. 如果配置了 dailyReviewCount > 0，则限制数量；否则全部取出
 *   4. 使用"不认识/模糊/认识"三个按钮 + SM-2 算法
 *
 * 每日统计持久化：
 *   localStorage key: wordbook-daily-stats
 *   格式: { date: '2026-06-22', newWordCount: 5, reviewCount: 10 }
 *
 * 配置优先级：localStorage > app-config.json
 */
import { ref, computed } from 'vue'
import db from '../db/index'
import { calculateSM2 } from '../lib/sm2'
import defaultConfig from '../data/app-config.json'

// ==================== 配置读取 ====================
function getConfig() {
  const stored = localStorage.getItem('wordbook-config')
  if (stored) {
    try {
      return { ...defaultConfig, ...JSON.parse(stored) }
    } catch {
      // 解析失败则回退
    }
  }
  return { ...defaultConfig }
}

// ==================== 每日统计（localStorage 持久化） ====================
function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadDailyStats() {
  try {
    const raw = localStorage.getItem('wordbook-daily-stats')
    if (raw) {
      const stats = JSON.parse(raw)
      if (stats.date === getTodayStr()) {
        return { newWordCount: stats.newWordCount || 0, reviewCount: stats.reviewCount || 0 }
      }
    }
  } catch { /* ignore */ }
  return { newWordCount: 0, reviewCount: 0 }
}

function saveDailyStats(stats) {
  try {
    localStorage.setItem('wordbook-daily-stats', JSON.stringify({
      date: getTodayStr(),
      newWordCount: stats.newWordCount,
      reviewCount: stats.reviewCount
    }))
  } catch { /* ignore */ }
}

// 初始化每日统计
const dailyStats = ref(loadDailyStats())

// ==================== 状态 ====================
const newWords = ref([])          // 学习：新词列表
const reviewWords = ref([])       // 复习：到期单词列表
const isLoading = ref(false)
const error = ref(null)

// ==================== 学习统计 ====================
const learnStats = computed(() => {
  return {
    newWordCount: dailyStats.value.newWordCount,
    remainingCount: newWords.value.length
  }
})

// ==================== 复习统计 ====================
const reviewStats = computed(() => {
  return {
    reviewCount: dailyStats.value.reviewCount,
    remainingCount: reviewWords.value.length
  }
})

// ==================== 获取新词（学习页用） ====================
async function fetchNewWords() {
  isLoading.value = true
  error.value = null

  try {
    // 获取所有已有复习记录的 wordId
    const allReviews = await db.reviews.toArray()
    const reviewedWordIds = new Set(allReviews.map(r => r.wordId))

    // 获取未被复习过的单词（全部，无数量上限）
    const allWords = await db.words.toArray()
    newWords.value = allWords.filter(w => !reviewedWordIds.has(w.id))
  } catch (err) {
    console.error('获取新词失败：', err)
    error.value = err.message || '获取新词失败'
  } finally {
    isLoading.value = false
  }
}

// ==================== 获取到期复习单词（复习页用） ====================
async function fetchReviewWords() {
  const config = getConfig()
  isLoading.value = true
  error.value = null

  try {
    const now = Date.now()

    // 获取所有到期复习单词，按 nextReviewAt 升序
    let dueReviews = await db.reviews
      .where('nextReviewAt')
      .belowOrEqual(now)
      .sortBy('nextReviewAt')

    // 如果配置了每日复习上限（> 0），则限制数量
    if (config.dailyReviewCount > 0) {
      dueReviews = dueReviews.slice(0, config.dailyReviewCount)
    }

    // 获取对应单词
    const reviewWordIds = dueReviews.map(r => r.wordId)
    const words = await db.words.bulkGet(reviewWordIds)

    // 过滤掉可能已被删除的单词
    reviewWords.value = words.filter(Boolean)
  } catch (err) {
    console.error('获取复习单词失败：', err)
    error.value = err.message || '获取复习单词失败'
  } finally {
    isLoading.value = false
  }
}

// ==================== 记录学习（学习页"下一个"） ====================
async function recordLearning(wordId) {
  try {
    // 首次学习：用 quality=2（认识）作为初始状态，进入 SM-2 系统
    const { interval, ease, repetitions } = calculateSM2(2, 1, 2.5, 0)
    const nextReviewAt = Date.now() + interval * 24 * 60 * 60 * 1000

    await db.reviews.put({
      wordId,
      nextReviewAt,
      interval,
      ease,
      repetitions
    })

    // 从新词列表中移除
    newWords.value = newWords.value.filter(w => w.id !== wordId)

    // 更新每日统计
    dailyStats.value = {
      ...dailyStats.value,
      newWordCount: dailyStats.value.newWordCount + 1
    }
    saveDailyStats(dailyStats.value)
  } catch (err) {
    console.error('记录学习结果失败：', err)
    throw err
  }
}

// ==================== 记录复习结果（复习页"不认识/模糊/认识"） ====================
async function recordReview(wordId, quality) {
  try {
    // 获取当前复习记录
    const review = await db.reviews.get({ wordId })

    const base = review || {
      wordId,
      interval: 1,
      ease: 2.5,
      repetitions: 0
    }

    // 使用 SM-2 算法计算新参数
    const { interval, ease, repetitions } = calculateSM2(
      quality,
      base.interval,
      base.ease,
      base.repetitions
    )

    const nextReviewAt = Date.now() + interval * 24 * 60 * 60 * 1000

    // 写入或更新复习记录
    await db.reviews.put({
      id: review?.id,
      wordId,
      nextReviewAt,
      interval,
      ease,
      repetitions
    })

    // 从复习列表中移除
    reviewWords.value = reviewWords.value.filter(w => w.id !== wordId)

    // 更新每日统计
    dailyStats.value = {
      ...dailyStats.value,
      reviewCount: dailyStats.value.reviewCount + 1
    }
    saveDailyStats(dailyStats.value)
  } catch (err) {
    console.error('记录复习结果失败：', err)
    throw err
  }
}

// ==================== 保存/读取配置 ====================
function saveConfig(config) {
  try {
    const merged = { ...getConfig(), ...config }
    localStorage.setItem('wordbook-config', JSON.stringify(merged))
  } catch (err) {
    console.error('保存配置失败：', err)
  }
}

// ==================== 导出 ====================
export function useVocabulary() {
  return {
    newWords,
    reviewWords,
    isLoading,
    error,
    learnStats,
    reviewStats,
    fetchNewWords,
    fetchReviewWords,
    recordLearning,
    recordReview,
    getConfig,
    saveConfig
  }
}
