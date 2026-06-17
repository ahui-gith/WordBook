/**
 * 核心组合式函数 — 管理今日单词任务、复习记录、统计数据
 *
 * 任务生成规则（来自开发文档）：
 *   1. 获取所有 nextReviewAt <= 当前时间 的到期单词
 *   2. 按 nextReviewAt 升序排序
 *   3. 取 dailyReviewCount 个复习单词
 *   4. 数量不足时从没有 review 记录的单词中补充，取 dailyNewWordCount 个
 *   5. 最终任务 = 复习任务 + 新学任务
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

// ==================== 状态 ====================
const todayWords = ref([])
const isLoading = ref(false)
const reviewedCount = ref(0)       // 今日已复习数量
const newWordCount = ref(0)        // 今日新学数量
const error = ref(null)

// ==================== 统计 ====================
const stats = computed(() => {
  const config = getConfig()
  return {
    reviewedCount: reviewedCount.value,
    remainingCount: todayWords.value.length,
    newWordCount: newWordCount.value,
    dailyNewWordTarget: config.dailyNewWordCount,
    dailyReviewTarget: config.dailyReviewCount
  }
})

// ==================== 获取今日任务 ====================
async function fetchTodayWords() {
  const config = getConfig()
  isLoading.value = true
  error.value = null

  try {
    const now = Date.now()

    // 第一步：获取所有到期复习单词，按 nextReviewAt 升序
    const dueReviews = await db.reviews
      .where('nextReviewAt')
      .belowOrEqual(now)
      .sortBy('nextReviewAt')

    // 第二步：取 dailyReviewCount 个复习单词
    const reviewTasks = dueReviews.slice(0, config.dailyReviewCount)

    // 第三步：如果数量不足，补充新单词
    let newWordTasks = []
    if (reviewTasks.length < config.dailyReviewCount) {
      const needNew = config.dailyNewWordCount

      // 获取所有已有复习记录的 wordId
      const allReviews = await db.reviews.toArray()
      const reviewedWordIds = new Set(allReviews.map(r => r.wordId))

      // 获取未被复习过的单词
      const allWords = await db.words.toArray()
      const unreviewedWords = allWords.filter(w => !reviewedWordIds.has(w.id))

      // 按 id 顺序取
      newWordTasks = unreviewedWords.slice(0, needNew)
    }

    // 第四步：组装任务列表（复习任务在前，新学任务在后）
    // 获取复习任务对应的单词
    const reviewWordIds = reviewTasks.map(r => r.wordId)
    const reviewWords = await db.words.bulkGet(reviewWordIds)

    // 过滤掉可能已被删除的单词
    const validReviewWords = reviewWords.filter(Boolean)

    todayWords.value = [...validReviewWords, ...newWordTasks]
  } catch (err) {
    console.error('获取今日单词失败：', err)
    error.value = err.message || '获取今日单词失败'
  } finally {
    isLoading.value = false
  }
}

// ==================== 记录复习结果 ====================
async function recordReview(wordId, quality) {
  try {
    // 获取当前复习记录（可能不存在，新词首次复习）
    const review = await db.reviews.get({ wordId })

    const base = review || {
      wordId,
      interval: 1,
      ease: 2.5,
      repetitions: 0
    }

    // 判断是否为新词（之前没有复习记录）
    const isNewWord = !review

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
      id: review?.id,           // 已有记录保留 id，新记录由 Dexie 自增
      wordId,
      nextReviewAt,
      interval,
      ease,
      repetitions
    })

    // 从今日列表中移除已复习的单词
    todayWords.value = todayWords.value.filter(w => w.id !== wordId)

    // 更新统计
    reviewedCount.value++
    if (isNewWord) {
      newWordCount.value++
    }
  } catch (err) {
    console.error('记录复习结果失败：', err)
    throw err
  }
}

// ==================== 保存/读取配置 ====================
function saveConfig(config) {
  try {
    localStorage.setItem('wordbook-config', JSON.stringify(config))
  } catch (err) {
    console.error('保存配置失败：', err)
  }
}

// ==================== 导出 ====================
export function useVocabulary() {
  return {
    todayWords,
    isLoading,
    error,
    stats,
    reviewedCount,
    newWordCount,
    fetchTodayWords,
    recordReview,
    getConfig,
    saveConfig
  }
}
