import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initDB } from './db/index'
import './style.css'

async function bootstrap() {
  // 初始化数据库（首次运行时导入默认词库）
  await initDB()

  const app = createApp(App)
  app.use(router)
  app.mount('#app')
}

bootstrap()
