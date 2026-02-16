import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from "@tanstack/react-query"
import './index.css'
import App from './App.tsx'
import { getTheme, setTheme } from "./lib/theme"
import { queryClient } from "./lib/queryClient"

setTheme(getTheme())


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
