# 单词本开发文档

一个个人单词背记应用，基于 Vue 3 + Vite + Dexie.js 构建，支持 PWA，可通过浏览器添加到手机主屏幕，体验接近原生 App。

## 🎯 项目目标

搭建一个仅供个人使用的单词记忆工具，核心需求：

- 随时随地打开手机就能背单词（无网络亦可）
- 支持间隔复习算法，自动安排复习计划
- 数据完全存储在浏览器本地，不依赖任何服务器
- 免费、无广告、无审核，零成本部署与维护

## ✨ 功能列表

- **词库管理**：内置常用 850 词（JSON），支持自行添加、导入或删除单词
- **单词卡复习**：正面显示英文，点击翻转查看中文释义以及词性、发音（可播放）
- **掌握程度反馈**：
  - 不认识 → 添加到生词列表
  - 模糊 → 间隔减半，再次复习
  - 认识 → 间隔按算法延长（如 1→3→7→14→30…）
- **每日任务**：可设定每日新学单词数量 + 复习数量，完成后显示统计
- **故事阅读**：可阅读内置的简短故事，支持语音播放，查看完整译文，单击单词查看中文释义以及词性、发音
- **间隔复习算法**：简化版 SM-2 算法，基于复习次数、难易度系数自动计算下次复习时间
- **离线使用**：利用 Service Worker 缓存应用外壳，IndexedDB 存储所有数据，断网也能正常打开
- **PWA 能力**：可安装到手机主屏幕，有独立图标和启动画面，支持通知权限请求
- **复习提醒通知**（可选）：基于浏览器的 Notification API，每天定时弹出复习提醒
- **数据导出/导入**：一键导出数据库为 JSON 文件，可用于备份或迁移

## 📦 技术栈

| 类别       | 技术                    | 说明                                 |
| ---------- | ----------------------- | ------------------------------------ |
| 框架       | Vue 3 (Composition API) | 渐进式框架，开发体验良好             |
| 构建工具   | Vite                    | 极速冷启动，HMR                      |
| 本地数据库 | Dexie.js                | IndexedDB 的优雅封装，查询更简单     |
| PWA 插件   | vite-plugin-pwa         | 自动生成 Service Worker 和 Manifest  |
| 部署       | Vercel                  | 免费托管，自动 HTTPS，与 GitHub 联动 |
| UI（可选） | Tailwind CSS / Naive UI | 根据喜好添加，本项目基础样式可手写   |

## 📁 推荐项目结构

```tex
my-vocab-app/
├── public/
│ ├── favicon.ico
│ ├── icon-192.png
│ └── icon-512.png
├── src/
│ ├── assets/ # 静态资源
│ ├── components/
│ │ ├── FlashCard.vue # 单词卡片组件
│ │ ├── StatsBar.vue # 每日进度统计
│ │ └── ImportExport.vue # 数据导入导出
│ ├── composables/
│ │ └── useVocabulary.js # 核心逻辑（单词获取、复习记录更新等）
│ ├── db/
│ │ └── index.js # Dexie 数据库初始化及词库数据
│ ├── lib/
│ │ └── sm2.js # 简化版 SM-2 算法实现
│ ├── App.vue
│ ├── main.js
│ └── style.css
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 🚀 开发启动

### 环境要求

- Node.js ≥ 18
- npm 或 pnpm

### 克隆并安装依赖

```bash
git clone <你的仓库地址>
cd WordBook
npm install
```

### 本地运行

```bash
npm run dev
```

浏览器访问 `http://localhost:5173` 即可看到应用。支持热更新，修改代码立即生效。

## 🧠 核心逻辑实现

### 数据库设计（使用 Dexie.js）

文件 `src/db/index.js` 示例：

```javascript
import Dexie from 'dexie';

const db = new Dexie('VocabDB');

db.version(1).stores({
  words: 'id, word, meaning, addedAt',
  reviews: 'id, wordId, nextReviewAt, interval, ease, repetitions',
});

// 内置词库初始化
const defaultWords = [
  { id: 1, word: 'abandon', meaning: '放弃', addedAt: Date.now() },
  // ... 继续添加
];

export async function initDefaultWords() {
  const count = await db.words.count();
  if (count === 0) {
    await db.words.bulkPut(defaultWords);
  }
}

export default db;
```



### SM-2 算法简版

文件 `src/lib/sm2.js`：

```javascript
/**
 * 根据 SM-2 计算下一次复习参数
 * @param {number} quality 0 - 不认识，1 - 模糊，2 - 认识
 * @param {number} currentInterval 当前间隔天数，默认为 1
 * @param {number} currentEase 当前容易度因子，默认 2.5
 * @param {number} repetitions 已连续正确次数
 * @returns {{ interval: number, ease: number, repetitions: number }}
 */
export function calculateSM2(quality, currentInterval = 1, currentEase = 2.5, repetitions = 0) {
  let ease = currentEase;
  let interval = currentInterval;
  let rep = repetitions;

  if (quality === 0) { // 不认识
    rep = 0;
    interval = 1;
  } else if (quality === 1) { // 模糊
    rep = 0;
    interval = Math.max(1, Math.round(interval * 0.5));
  } else if (quality === 2) { // 认识
    rep += 1;
    if (rep === 1) {
      interval = 1;
    } else if (rep === 2) {
      interval = 3;
    } else {
      interval = Math.round(interval * ease);
    }
    ease = ease + (0.1 - (2 - quality) * (0.08 + (2 - quality) * 0.02));
    if (ease < 1.3) ease = 1.3; // 最低容易度
  }

  return {
    interval: Math.max(1, interval),
    ease: parseFloat(ease.toFixed(2)),
    repetitions: rep,
  };
}
```



### 核心组合式函数 `useVocabulary.js`

```javascript
import { ref, computed } from 'vue';
import db from '../db/index';
import { calculateSM2 } from '../lib/sm2';

export function useVocabulary() {
  const todayWords = ref([]); // 今日待复习的单词
  const isLoading = ref(false);

  async function fetchTodayWords() {
    isLoading.value = true;
    const now = Date.now();
    // 查询所有下次复习时间 <= 当前的复习记录
    const dueReviews = await db.reviews
      .where('nextReviewAt')
      .belowOrEqual(now)
      .toArray();

    // 获取对应的单词
    const wordIds = dueReviews.map(r => r.wordId);
    const words = await db.words.bulkGet(wordIds);
    todayWords.value = words.filter(Boolean);
    isLoading.value = false;
  }

  async function recordReview(wordId, quality) {
    const review = await db.reviews.get({ wordId });
    const base = review || {
      wordId,
      interval: 1,
      ease: 2.5,
      repetitions: 0,
    };

    const { interval, ease, repetitions } = calculateSM2(
      quality,
      base.interval,
      base.ease,
      base.repetitions
    );

    const nextReviewAt = Date.now() + interval * 24 * 60 * 60 * 1000;

    await db.reviews.put({
      id: review?.id,
      wordId,
      nextReviewAt,
      interval,
      ease,
      repetitions,
    });
  }

  // ... 其他函数
  return { todayWords, isLoading, fetchTodayWords, recordReview };
}
```



### FlashCard 组件结构

-   遍历 `todayWords`，每次显示一个单词
-   点击卡片正/反面切换（英文 ↔ 中文）
-   底部三个按钮，点击后调用 `recordReview` 并切换到下一个单词
-   所有单词复习完后提示“今日任务完成”

## 📲 PWA 配置

在 `vite.config.js` 中已经包含完整的 PWA 配置，自动生成 Service Worker。
需要确保 `public` 目录下有 192x192 和 512x512 大小的图标。

用户使用步骤：

1.  在手机 Chrome/Safari 中打开部署后的网址
2.  点击浏览器菜单中的“添加到主屏幕”
3.  接受后，桌面会出现独立图标，打开后全屏运行，无浏览器边框

## 🌐 部署到 Vercel

1.  将项目推送至 GitHub 公开仓库
2.  访问 [Vercel](https://vercel.com/) 并用 GitHub 登录
3.  点击 “New Project” → 导入你的仓库
4.  构建预设会自动识别为 Vite，直接点击部署
5.  部署完成后你会得到一个 `https://xxx.vercel.app` 域名
6.  在手机浏览器打开并添加到主屏幕

每次向 GitHub 推送代码，Vercel 都会自动重新部署，零停机更新。

## 🔔 复习通知（可选增强）

通过浏览器的 Notification API 可以实现简单的提醒。
核心代码片段：

javascript

```
if (Notification.permission === 'granted') {
  const now = new Date();
  const triggerTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0); // 20:00
  const delay = triggerTime.getTime() - now.getTime();
  if (delay > 0) {
    setTimeout(() => {
      new Notification('该复习单词啦！', { body: '打开单词本开始今天的练习吧' });
    }, delay);
  }
}
```



注意：iOS 对 Web Notification 的支持有限，但 PWA 方式添加到桌面后的独立应用在 Android 和部分 iOS 版本上效果良好。

## 💾 数据备份

提供两个按钮：

-   **导出数据**：读取 `words` 和 `reviews` 表并生成 JSON 下载
-   **导入数据**：选择 JSON 文件并覆盖当前数据库

## 🛠 后续可扩展方向（非必要）

-   添加单词发音 (Web Speech API)
-   多词库选择（如四级、六级、雅思）
-   数据云同步（可选，需后端，用户自己决定是否使用）
-   美观的动画效果

## 📄 许可证

MIT







# 实现步骤

请严格按照以下规格，为我创建一个完整的 Vue 3 + Vite 单词本 PWA 应用。
项目名称：WordBook，要求使用 npm 管理依赖，所有代码采用 Composition API + <script setup> 语法，样式使用 Tailwind CSS。

## 第一步：创建项目骨架
1. 在空目录下执行：
   npm create vite@latest WordBook -- --template vue
   cd WordBook
   npm install
2. 安装核心依赖：
   npm install dexie vue-router@4
   npm install -D tailwindcss @tailwindcss/vite vite-plugin-pwa
3. 初始化 Tailwind CSS（若使用 Tailwind v4 + Vite 插件，按官方最新方式配置）。
4. 在 vite.config.js 中完整配置 PWA 插件（见下文模板）。

## 第二步：项目文件结构
请按照以下结构生成所有文件（空文件夹需保留）：

WordBook/
├── public/
│   ├── favicon.ico
│   ├── icon-192.png        （你用纯色+字母占位即可，后续可替换）
│   └── icon-512.png
├── src/
│   ├── assets/              （空）
│   ├── components/
│   │   ├── FlashCard.vue
│   │   ├── StatsBar.vue
│   │   └── ImportExport.vue
│   ├── composables/
│   │   └── useVocabulary.js
│   ├── db/
│   │   └── index.js         （数据库初始化 + 内置 850 词完整数组）
│   ├── lib/
│   │   └── sm2.js           （SM-2 算法函数）
│   ├── views/
│   │   ├── ReviewView.vue    （复习主页）
│   │   ├── StoryView.vue     （故事阅读页）
│   │   └── SettingsView.vue  （设置：每日任务量、导入导出、通知开关）
│   ├── router/
│   │   └── index.js
│   ├── App.vue
│   ├── main.js
│   └── style.css            （Tailwind 指令 + 少量自定义样式）
├── index.html
├── package.json
├── vite.config.js
└── README.md

## 第三步：核心实现细节

### 1. vite.config.js 完整模板（直接复制，调整插件版本）
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: '单词本',
        short_name: '单词本',
        description: '个人单词记忆工具',
        theme_color: '#4f46e5',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ],
        display: 'standalone',
        start_url: '/'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ]
})

### 2. 数据库与内置 850 词
- src/db/index.js 需要导出一个 Dexie 实例和一个初始化函数。
    请确保总数为 850 个，含义用简洁中文。
    代码结构如下：
    import Dexie from 'dexie';
    const db = new Dexie('VocabDB');
    db.version(1).stores({
      words: 'id, word, meaning, addedAt',
      reviews: 'id, wordId, nextReviewAt, interval, ease, repetitions',
    });
    export const defaultWords = [ /* 850个单词对象 */ ];
    export async function initDefaultWords() {
      if ((await db.words.count()) === 0) {
        await db.words.bulkPut(defaultWords);
      }
    }
    export default db;

### 3. SM-2 算法
- 严格使用你提供的 calculateSM2 函数，放在 src/lib/sm2.js。

### 4. useVocabulary 组合式函数
- 需要管理：todayWords（今日待复习单词列表）、完成统计、获取/提交复习记录。
- 复习记录更新后，从 todayWords 中移除已复习条目。
- 导出函数：fetchTodayWords, recordReview, getStats (返回今日已复习数量、新学数量等)。
- 每日任务量设定值从 localStorage 读取，默认新学 10 个 + 复习 20 个。当今日新学单词不足时，从未加入复习表（即没有对应 review 记录）的单词中按加入顺序抽取。

### 5. FlashCard 组件
- 单张卡片，正面显示英文单词，点击翻转显示：中文释义、词性（可统一不填，或从预设数据中提供）、发音按钮（使用 Web Speech API）。
- 翻转动画使用 CSS 3D transform。
- 底部三个按钮：不认识（红色）、模糊（黄色）、认识（绿色），点击后调用 recordReview，自动切换下一张。
- 所有卡片复习完后，显示“今日任务完成”和 StatsBar 统计。

### 6. StatsBar 组件
- 显示今日已学单词数、剩余复习数、新学进度。简单内联即可。

### 7. 故事阅读 (StoryView)
- 内置英文故事，存储在 db 的一个 stories 表或直接写死的 JS 文件中。
- 显示英文段落，用户可以点击任意单词，弹出 popover 显示中文释义（若单词在词库中则显示库中解释，否则尝试调用免费词典 API 或提示未知）。
- 全文朗读按钮（使用 SpeechSynthesis）。
- 显示/隐藏完整译文（预先提供）。

### 8. 导入导出 (ImportExport 组件)
- 导出按钮：从 Dexie 读取 words 和 reviews 表，生成一个 JSON Blob 并下载（文件名 vocab-backup.json）。
- 导入按钮：选择文件后，解析 JSON，验证格式，清除原有表数据并批量写入。

### 9. 复习通知（SettingsView 中实现）
- 一个开关按钮，请求 Notification 权限。
- 如果权限 granted，设置一个每日 20:00 的定时器（用 setInterval 每小时检查一次，或使用 setTimeout 计算到目标时间的延迟，并在触发后重新设置第二天的定时器）。
- 注意：首次进入应用时不要自动请求通知权限，需用户主动点击按钮触发。

### 10. 路由配置
- 使用 vue-router，三个路由：
  / → ReviewView
  /story → StoryView
  /settings → SettingsView
- 底部导航栏（TabBar）在 App.vue 中实现，三个图标+文字：复习、故事、设置。

### 11. 样式
- 使用 Tailwind CSS 快速构建界面，卡片、按钮等有合理的间距和颜色。
- 移动端优先，最大宽度 480px 居中显示。

### 12. main.js 入口
- 引入 Tailwind 样式、router、初始化默认词库（调用 initDefaultWords），挂载应用。

## 第四步：确保零错误
- 所有异步操作需有错误处理（try-catch）。
- 生成的代码必须完整，无占位符（如“... 继续添加”），850 词数组请完整写出（如果你一次无法输出全部，请分多次输出，但最终文件需包含完整数组）。
- 每个文件顶部注明作用，并确保导入路径正确。

## 第五步：最终交付
生成所有文件的内容，我可以直接复制到本地项目目录并运行 npm install && npm run dev，应用应正常工作。





