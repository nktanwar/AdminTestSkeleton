import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const apiTarget = env.VITE_API_PROXY_TARGET

  return {
    plugins: [
      react(),
      tailwindcss(), // ← REQUIRED in v4
    ],
    server: apiTarget
      ? {
          proxy: {
            "/auth": apiTarget,
            "/internal": apiTarget,
            "/api": apiTarget,
            "/lead": apiTarget,
          },
        }
      : undefined,
  }
})
