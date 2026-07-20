import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Deployed at https://charlesabichahine.com (custom domain, served from root).
// public/CNAME tells GitHub Pages to claim the domain on every Actions deploy.
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
})
