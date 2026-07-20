/** Lightweight UX checks — backend remains the real gate. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Rough E.164: + then 7–15 digits (spaces allowed in input, stripped here). */
const E164_RE = /^\+[1-9]\d{6,14}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, "");
}

export function isValidPhone(phone: string): boolean {
  return E164_RE.test(normalizePhone(phone));
}

export function isNonEmptyPassword(password: string): boolean {
  return password.length > 0;
}

/** Client-side UX gate — backend still enforces min_length=8. */
export function isMinLengthPassword(password: string, minLength = 8): boolean {
  return password.length >= minLength;
}
