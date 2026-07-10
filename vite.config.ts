import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base is the GitHub Pages subpath: https://myatgthu.github.io/superman/
export default defineConfig({
  base: '/superman/',
  plugins: [react()],
})
