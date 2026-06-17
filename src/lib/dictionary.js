/**
 * 单词查询工具 — 用于故事阅读中的点击查词
 *
 * 查询流程（6步，按开发文档）：
 *   Step1: 转小写
 *   Step2: 移除标点
 *   Step3: 精确匹配 (words 表)
 *   Step4: 简单词形还原后再匹配
 *   Step5: 模糊匹配 (includes)，最多返回 maxFuzzySearchResults 条
 *   Step6: 仍未找到 → 返回 null，提示"词库未收录"
 */
import db from '../db/index'
import appConfig from '../data/app-config.json'

// ==================== Step2: 移除标点 ====================
function removePunctuation(text) {
  return text.replace(/[.,!?;:'"()，。！？；：'""（）[\]{}…\-—\s]+/g, ' ').trim()
}

// ==================== Step4: 简单词形还原 ====================
/**
 * 简化的词形还原，覆盖常见规则变体：
 *   running  → run
 *   studies  → study
 *   walked   → walk
 *   goes     → go
 */
function lemmatize(word) {
  const lower = word.toLowerCase()
  const candidates = new Set()
  candidates.add(lower)

  // 规则 1: -ing (running → run, making → make, sitting → sit)
  if (lower.endsWith('ing')) {
    const stem = lower.slice(0, -3)
    candidates.add(stem)                         // runn → run (will be fixed below)
    candidates.add(stem + 'e')                   // mak + e → make
    // 双写辅音还原: running → run
    if (stem.length >= 3) {
      const last = stem[stem.length - 1]
      const second = stem[stem.length - 2]
      if (last === second && !'aeiou'.includes(last)) {
        candidates.add(stem.slice(0, -1))        // runn → run
      }
    }
  }

  // 规则 2: -ed (walked → walk, stopped → stop)
  if (lower.endsWith('ed') && lower.length > 4) {
    candidates.add(lower.slice(0, -2))           // walked → walk
    candidates.add(lower.slice(0, -1))           // walked → walke
    const stem = lower.slice(0, -2)
    if (stem.length >= 3) {
      const last = stem[stem.length - 1]
      const second = stem[stem.length - 2]
      if (last === second && !'aeiou'.includes(last)) {
        candidates.add(stem.slice(0, -1))        // stopped → stop
      }
    }
  }

  // 规则 3: -s / -es (studies → study, goes → go, cats → cat)
  if (lower.endsWith('ies') && lower.length > 4) {
    candidates.add(lower.slice(0, -3) + 'y')     // studies → study
  }
  if (lower.endsWith('es') && lower.length > 4) {
    candidates.add(lower.slice(0, -2))           // goes → go
    candidates.add(lower.slice(0, -1))           // goes → goe
  }
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) {
    candidates.add(lower.slice(0, -1))           // cats → cat
  }

  // 规则 4: -er / -est (bigger → big, biggest → big)
  if (lower.endsWith('est') && lower.length > 5) {
    const stem = lower.slice(0, -3)
    candidates.add(stem)
    if (stem.length >= 2) {
      const last = stem[stem.length - 1]
      const second = stem[stem.length - 2]
      if (last === second && !'aeiou'.includes(last)) {
        candidates.add(stem.slice(0, -1))        // biggest → big
      }
    }
  }
  if (lower.endsWith('er') && lower.length > 4) {
    const stem = lower.slice(0, -2)
    candidates.add(stem)
    if (stem.length >= 2) {
      const last = stem[stem.length - 1]
      const second = stem[stem.length - 2]
      if (last === second && !'aeiou'.includes(last)) {
        candidates.add(stem.slice(0, -1))        // bigger → big
      }
    }
  }

  // 规则 5: -ly (quickly → quick, happily → happy)
  if (lower.endsWith('ily') && lower.length > 5) {
    candidates.add(lower.slice(0, -3) + 'y')     // happily → happy
  }
  if (lower.endsWith('ly') && lower.length > 4) {
    candidates.add(lower.slice(0, -2))           // quickly → quick
  }

  return [...candidates]
}

// ==================== 主查询函数 ====================
/**
 * 根据文本片段查询单词
 * @param {string} rawText - 用户点击的原始文本（可能带标点、大小写）
 * @returns {Promise<{found: boolean, word: object|null, message: string, suggestions: object[]}>}
 */
export async function lookupWord(rawText) {
  // Step1: 转小写
  let text = rawText.toLowerCase()

  // Step2: 移除标点
  text = removePunctuation(text)
  if (!text) {
    return { found: false, word: null, message: '词库未收录', suggestions: [] }
  }

  // Step3: 精确匹配
  const exactMatch = await db.words.where('word').equals(text).first()
  if (exactMatch) {
    return { found: true, word: exactMatch, message: '', suggestions: [] }
  }

  // Step4: 简单词形还原
  const lemmas = lemmatize(text)
  for (const lemma of lemmas) {
    if (lemma === text) continue // 跳过与原文相同的
    const match = await db.words.where('word').equals(lemma).first()
    if (match) {
      return { found: true, word: match, message: `词形还原: ${lemma}`, suggestions: [] }
    }
  }

  // Step5: 模糊匹配 (includes)
  const allWords = await db.words.toArray()
  const maxResults = appConfig.maxFuzzySearchResults || 3
  const suggestions = allWords
    .filter(w => w.word.includes(text) || text.includes(w.word))
    .slice(0, maxResults)

  if (suggestions.length > 0) {
    return {
      found: true,
      word: suggestions[0],
      message: '模糊匹配结果',
      suggestions
    }
  }

  // Step6: 未收录
  return { found: false, word: null, message: '词库未收录', suggestions: [] }
}
