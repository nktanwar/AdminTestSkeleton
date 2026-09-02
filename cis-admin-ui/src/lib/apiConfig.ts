const DEFAULT_INTERNAL_API_BASE_URL = "/internal"

function sanitizeBaseUrl(rawBaseUrl: string): string {
  if (!rawBaseUrl) return ""

  const trimmed = rawBaseUrl.endsWith("/")
    ? rawBaseUrl.slice(0, -1)
    : rawBaseUrl

  return trimmed.replace(/\/lead(?:\/.*)?$/i, "")
}

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

export function joinBaseAndPath(base: string, path: string): string {
  if (!base) return path
  if (isAbsoluteUrl(path)) return path

  const normalizedBase = base.endsWith("/")
    ? base.slice(0, -1)
    : base
  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`

  const maxOverlap = Math.min(
    normalizedBase.length,
    normalizedPath.length
  )
  for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
    if (
      normalizedBase.endsWith(
        normalizedPath.slice(0, overlap)
      )
    ) {
      return normalizedBase + normalizedPath.slice(overlap)
    }
  }

  return normalizedBase + normalizedPath
}

export const API_CONFIG = {
  internalBaseUrl:
    sanitizeBaseUrl(import.meta.env.VITE_API_BASE_URL ?? "") ||
    DEFAULT_INTERNAL_API_BASE_URL,
  productBaseUrl: sanitizeBaseUrl(
    import.meta.env.VITE_PRODUCT_API_BASE_URL ?? ""
  ),
}

export function requireConfiguredBaseUrl(
  value: string,
  variableName: string
): string {
  if (!value) {
    throw new Error(`${variableName} is not configured.`)
  }

  return value
}
