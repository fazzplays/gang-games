import { createRouter, createWebHistory } from 'vue-router'
import WordleGame from '../components/WordleGame.vue'
import Hub from '../components/Hub.vue'

const routes = [
  { path: '/gang-games/', name: 'GangGamesHome', component: Hub },
  { path: '/gang-games/wordle/', name: 'WordleGame', component: WordleGame },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
