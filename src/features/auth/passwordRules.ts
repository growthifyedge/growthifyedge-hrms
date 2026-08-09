/**
 * Shared password rules for reset/change flows. Deliberately simple:
 * at least 8 characters with one letter and one number.
 * Returns an error message, or null when acceptable.
 */
export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters long.'
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) {
    return 'Password must include at least one letter and one number.'
  }
  if (password !== confirm) return 'Passwords do not match.'
  return null
}
