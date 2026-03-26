import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const API_TARGET = "http://3.7.55.240:8082"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // ← REQUIRED in v4
  ],
  server: {
    proxy: {
      "/auth": API_TARGET,
      "/internal": API_TARGET,
      "/api": API_TARGET,
      "/lead": API_TARGET,
    },
  },
})
