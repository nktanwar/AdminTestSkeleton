const KEY = "cis-theme"

export function getTheme(): "light" | "dark" {
  return (localStorage.getItem(KEY) as any) || "dark"
}

export function setTheme(theme: "light" | "dark") {
  localStorage.setItem(KEY, theme)
  document.documentElement.classList.toggle(
    "light",
    theme === "light"
  )
}
