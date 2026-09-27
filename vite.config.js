import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/crm/', // <--- ESTO ES VITAL. Le dice que vivirá en esa carpeta.
})
