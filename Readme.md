# WordBook 单词本

个人单词背记 PWA 应用，基于 Vue 3 + Vite + Dexie.js 构建。数据完全存储在浏览器本地，支持离线使用，可添加到手机主屏幕。

## ✨ 功能

- **单词学习**：卡片翻转查看释义，发音朗读，不限量自由学习
- **间隔复习**：SM-2 算法自动安排复习计划，支持英→汉 / 汉→英两种模式
- **故事阅读**：内置英文故事，点击查词，全文朗读，显示/隐藏译文
- **单词本管理**：支持多单词本，左滑删除，导入 JSON 格式单词本
- **数据备份**：一键导出/导入全部数据（单词本 + 单词 + 学习记录 + 配置）
- **PWA**：可安装到桌面，离线运行，无网络亦可使用

## 📦 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3 (Composition API + `<script setup>`) |
| 构建 | Vite |
| 数据库 | Dexie.js (IndexedDB) |
| UI | Tailwind CSS |
| PWA | vite-plugin-pwa |
| 路由 | Vue Router 4 |

## 📁 项目结构

```
WordBook/
├── public/                # 静态资源（图标等）
├── src/
│   ├── components/        # FlashCard、StatsBar、TabBar、ImportExport、WordBookManager
│   ├── composables/       # useVocabulary 核心业务逻辑
│   ├── data/              # words.json、stories.json、app-config.json
│   ├── db/                # Dexie 数据库初始化与工具函数
│   ├── lib/               # SM-2 算法、词典查询
│   ├── views/             # LearnView、ReviewView、StoryView、SettingsView
│   ├── router/            # 路由配置
│   ├── App.vue
│   ├── main.js
│   └── style.css
├── vite.config.js
└── package.json
```

## 🚀 开发

```bash
# 安装依赖
npm install

# 本地运行
npm run dev

# 构建生产版本
npm run build
```

浏览器访问 `http://localhost:5173`，支持热更新。

## 🌐 部署

推送至 GitHub 后，可通过 Vercel 一键部署，自动识别 Vite 构建配置。

## 📄 许可证

MIT
