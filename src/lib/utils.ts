/** Joins conditional class names. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/**
 * Extracts a message from any thrown value. Supabase's PostgrestError is a
 * plain object in some versions, so `instanceof Error` alone is not enough.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return String(err)
}

/** Postgres unique-violation code, when the thrown value carries one. */
export function isUniqueViolation(err: unknown): boolean {
  const code =
    err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : ''
  return code === '23505' || /duplicate key|unique constraint/i.test(getErrorMessage(err))
}
