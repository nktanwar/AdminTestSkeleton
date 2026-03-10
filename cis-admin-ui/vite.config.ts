import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // ← REQUIRED in v4
  ],
  server: {
    proxy: {
      "/auth": "http://localhost:8082",
      "/internal": "http://localhost:8082",
      "/api": "http://localhost:8082",
      "/lead": "http://localhost:8082",
    },
  },
})
