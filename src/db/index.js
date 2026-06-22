/**
 * Dexie 数据库初始化
 * 数据库名：VocabDB
 *
 * Schema v2：
 *   wordBooks — 单词本表 (++id, &name, createdAt)
 *   words     — 单词表 (id, word, bookId)
 *   reviews   — 复习记录表 (++id, &wordId, nextReviewAt, interval, ease, repetitions)
 *               &wordId 为唯一索引，一个单词只允许一条复习记录
 */
import Dexie from 'dexie'
import defaultWords from '../data/words.json'

const db = new Dexie('VocabDB')

// v1 原始版本
db.version(1).stores({
  words: 'id, word',
  reviews: '++id, &wordId, nextReviewAt, interval, ease, repetitions'
})

// v2：新增单词本表，words 增加 bookId
db.version(2).stores({
  wordBooks: '++id, &name, createdAt',
  words: 'id, word, bookId',
  reviews: '++id, &wordId, nextReviewAt, interval, ease, repetitions'
})

/**
 * 初始化默认词库
 * - 如果 wordBooks 为空，创建"默认单词本"
 * - 如果 words 为空，导入默认词库并关联到默认单词本
 * - 迁移旧数据：将 bookId 为空的单词关联到默认单词本
 */
export async function initDB() {
  try {
    // 确保默认单词本存在
    const bookCount = await db.wordBooks.count()
    let defaultBook
    if (bookCount === 0) {
      const defaultBookId = await db.wordBooks.put({
        name: '默认单词本',
        createdAt: Date.now()
      })
      defaultBook = { id: defaultBookId, name: '默认单词本' }
    } else {
      defaultBook = await db.wordBooks.get({ name: '默认单词本' })
      if (!defaultBook) {
        // 名字不匹配但表不为空，取第一条
        defaultBook = await db.wordBooks.toCollection().first()
      }
    }

    // 迁移旧数据：将没有 bookId 的单词关联到默认单词本
    const orphanWords = await db.words.where('bookId').equals(0).toArray()
    const nullBookWords = await db.words.filter(w => w.bookId == null).toArray()
    const toMigrate = [...orphanWords, ...nullBookWords]
    if (toMigrate.length > 0) {
      await db.transaction('rw', db.words, async () => {
        for (const w of toMigrate) {
          await db.words.update(w.id, { bookId: defaultBook.id })
        }
      })
      console.log(`数据迁移完成：${toMigrate.length} 个单词已关联到"${defaultBook.name}"`)
    }

    // 导入默认词库（仅在 words 表为空时）
    const wordCount = await db.words.count()
    if (wordCount === 0 && Array.isArray(defaultWords) && defaultWords.length > 0) {
      const wordsWithBook = defaultWords.map(w => ({
        ...w,
        bookId: defaultBook.id
      }))
      await db.words.bulkPut(wordsWithBook)
      console.log(`词库初始化完成：已导入 ${defaultWords.length} 个单词到"${defaultBook.name}"`)
    }
  } catch (error) {
    console.error('词库初始化失败：', error)
    throw error
  }
}

/**
 * 获取所有单词本及其单词数量
 */
export async function getWordBooksWithCount() {
  const books = await db.wordBooks.toArray()
  const result = []
  for (const book of books) {
    const count = await db.words.where('bookId').equals(book.id).count()
    result.push({ ...book, wordCount: count })
  }
  return result
}

/**
 * 删除单词本及其下所有单词和复习记录
 */
export async function deleteWordBook(bookId) {
  // 不允许删除最后一个单词本
  const bookCount = await db.wordBooks.count()
  if (bookCount <= 1) {
    throw new Error('至少需要保留一个单词本')
  }

  // 获取该单词本下所有单词的 id
  const words = await db.words.where('bookId').equals(bookId).toArray()
  const wordIds = words.map(w => w.id)

  await db.transaction('rw', db.wordBooks, db.words, db.reviews, async () => {
    // 删除单词本
    await db.wordBooks.delete(bookId)
    // 删除单词
    await db.words.bulkDelete(wordIds)
    // 删除对应的复习记录
    for (const wid of wordIds) {
      await db.reviews.where('wordId').equals(wid).delete()
    }
  })
}

/**
 * 导入单词本（从 JSON 数组）
 * @param {string} bookName - 单词本名称
 * @param {Array} words - 单词数组
 */
export async function importWordBook(bookName, words) {
  // 验证格式
  if (!Array.isArray(words) || words.length === 0) {
    throw new Error('单词数据为空或格式不正确')
  }

  for (const w of words) {
    if (!w.word) {
      throw new Error(`单词缺少必填字段 word: ${JSON.stringify(w)}`)
    }
  }

  // 创建单词本
  const bookId = await db.wordBooks.put({
    name: bookName,
    createdAt: Date.now()
  })

  // 重新分配 id 避免冲突，写入单词
  const maxId = (await db.words.toCollection().last())?.id || 0
  const wordsToImport = words.map((w, index) => ({
    id: w.id || (maxId + index + 1),
    word: w.word,
    pos: w.pos || '',
    meaning: w.meaning || '',
    phonetic: w.phonetic || '',
    bookId
  }))

  await db.words.bulkPut(wordsToImport)
  console.log(`单词本"${bookName}"导入完成：${wordsToImport.length} 个单词`)

  return { bookId, count: wordsToImport.length }
}

export default db
