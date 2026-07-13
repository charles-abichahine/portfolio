import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Deployed at https://<user>.github.io/portfolio/
export default defineConfig({
  base: '/portfolio/',
  plugins: [react(), tailwindcss()],
  // Ship source maps so a production crash maps back to real files/lines in
  // the browser console (temporary — for diagnosing the navigation crash).
  build: { sourcemap: true },
})
