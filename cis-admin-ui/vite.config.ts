import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const apiTarget = env.VITE_API_PROXY_TARGET
  const productApi = env.NEXT_PUBLIC_PRODUCT_API ?? ""
  const cisApi = env.NEXT_PUBLIC_API_URL ?? env.VITE_API_BASE_URL ?? ""

  return {
    plugins: [
      react(),
      tailwindcss(), // ← REQUIRED in v4
    ],
    define: {
      "process.env.NEXT_PUBLIC_PRODUCT_API":
        JSON.stringify(productApi),
      "process.env.NEXT_PUBLIC_API_URL":
        JSON.stringify(cisApi),
    },
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
