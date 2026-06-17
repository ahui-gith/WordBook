import { createRouter, createWebHistory } from 'vue-router'
import ReviewView from '../views/ReviewView.vue'
import StoryView from '../views/StoryView.vue'
import SettingsView from '../views/SettingsView.vue'
import NotFoundView from '../views/NotFoundView.vue'

const routes = [
  {
    path: '/',
    name: 'Review',
    component: ReviewView,
    meta: { title: '复习' }
  },
  {
    path: '/story',
    name: 'Story',
    component: StoryView,
    meta: { title: '故事' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
    meta: { title: '设置' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFoundView,
    meta: { title: '页面不存在' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
