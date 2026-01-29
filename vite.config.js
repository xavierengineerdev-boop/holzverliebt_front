import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Загружаем переменные окружения
  const env = loadEnv(mode, process.cwd(), '')
  
  // Получаем API URL из переменной окружения или используем localhost по умолчанию
  const apiUrl = env.VITE_API_URL || 'http://localhost:3000'
  // Извлекаем базовый URL без /api если он есть
  const apiBaseUrl = apiUrl.replace(/\/api$/, '')
  
  return {
    plugins: [react()],
    server: {
      port: 5173,
      open: true,
      proxy: {
        '/api': {
          target: apiBaseUrl || 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
        },
      },
    },
    // Инжектируем переменную окружения в HTML для статических файлов
    define: {
      'window.__API_BASE_URL__': JSON.stringify(env.VITE_API_URL || ''),
    },
  }
})
