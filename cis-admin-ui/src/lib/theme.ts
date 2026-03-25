const KEY = "cis-theme"

export function getTheme(): "light" | "dark" {
  const storedTheme = localStorage.getItem(KEY)
  return storedTheme === "light" || storedTheme === "dark"
    ? storedTheme
    : "dark"
}

export function setTheme(theme: "light" | "dark") {
  localStorage.setItem(KEY, theme)
  document.documentElement.classList.toggle(
    "light",
    theme === "light"
  )
}
