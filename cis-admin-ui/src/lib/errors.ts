const REGISTRATION_INCOMPLETE_MESSAGE =
  "Your registration is almost complete. Please finish setting up your account."

const GENERIC_ERROR_MESSAGE =
  "Something went wrong. Please try again."

const STATUS_MESSAGES: Record<number, string> = {
  400: "Please check the details and try again.",
  401: "Please sign in again to continue.",
  403: "You do not have permission to do that.",
  404: "We could not find what you were looking for.",
  409: "We could not complete that request. Please review your details and try again.",
  500: GENERIC_ERROR_MESSAGE,
}

const RAW_STATUS_PATTERN =
  /\b(?:\d{3}\s+)?(?:CONFLICT|UNAUTHORIZED|NOT_FOUND|INTERNAL_SERVER_ERROR|BAD_REQUEST|FORBIDDEN|HTTP STATUS|NOT FOUND|INTERNAL SERVER ERROR)\b/i

const STATUS_PREFIX_PATTERN =
  /^\s*(?:\d{3}\s+)?(?:CONFLICT|UNAUTHORIZED|NOT_FOUND|INTERNAL_SERVER_ERROR|BAD_REQUEST|FORBIDDEN|NOT FOUND|INTERNAL SERVER ERROR)\s*/i

export function isRegistrationIncompleteMessage(
  value: string
): boolean {
  return /registration is incomplete/i.test(value)
}

function extractReadableMessage(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""

  const withoutStatusPrefix = trimmed
    .replace(STATUS_PREFIX_PATTERN, "")
    .trim()

  try {
    const parsed = JSON.parse(withoutStatusPrefix) as {
      message?: unknown
      error?: unknown
    }
    if (typeof parsed.message === "string") {
      return parsed.message
    }
    if (typeof parsed.error === "string") {
      return parsed.error
    }
  } catch {
    // Fall through to text cleanup.
  }

  const quoted = withoutStatusPrefix.match(/"([^"]+)"/)
  return quoted?.[1]?.trim() || withoutStatusPrefix
}

export function toUserFacingErrorMessage(
  error: unknown,
  fallback = GENERIC_ERROR_MESSAGE
): string {
  if (!error) return fallback

  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : null

  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : ""

  const readable = extractReadableMessage(raw)

  if (isRegistrationIncompleteMessage(readable)) {
    return REGISTRATION_INCOMPLETE_MESSAGE
  }

  if (status === 400 && readable && !RAW_STATUS_PATTERN.test(readable)) {
    return readable
  }

  if (status === 409 && readable && !RAW_STATUS_PATTERN.test(readable)) {
    return readable
  }

  if (status && STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status]
  }

  if (RAW_STATUS_PATTERN.test(readable)) {
    return fallback
  }

  return readable || fallback
}

export { REGISTRATION_INCOMPLETE_MESSAGE }
