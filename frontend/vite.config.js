import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Enables JSX transformation and React Fast Refresh during development.
  plugins: [react()],
})
