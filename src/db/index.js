/**
 * Dexie 数据库初始化
 * 数据库名：VocabDB
 * Schema：
 *   words   — 单词表 (id, word)
 *   reviews — 复习记录表 (++id, &wordId, nextReviewAt, interval, ease, repetitions)
 *              &wordId 为唯一索引，一个单词只允许一条复习记录
 */
import Dexie from 'dexie'
import defaultWords from '../data/words.json'

const db = new Dexie('VocabDB')

db.version(1).stores({
  words: 'id, word',
  reviews: '++id, &wordId, nextReviewAt, interval, ease, repetitions'
})

/**
 * 初始化默认词库
 * 仅在 words 表为空时执行导入
 */
export async function initDB() {
  try {
    const count = await db.words.count()
    if (count === 0 && Array.isArray(defaultWords) && defaultWords.length > 0) {
      await db.words.bulkPut(defaultWords)
      console.log(`词库初始化完成：已导入 ${defaultWords.length} 个单词`)
    }
  } catch (error) {
    console.error('词库初始化失败：', error)
    throw error
  }
}

export default db
