export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function sanitizeText(value: string | null | undefined, max = 200): string | null {
  if (value == null) return null;
  const sanitized = value.trim().replace(/\s+/g, " ");
  if (!sanitized) return null;
  return sanitized.slice(0, max);
}

export function sanitizePhone(value: string | null | undefined): string | null {
  const cleaned = sanitizeText(value, 32);
  if (!cleaned) return null;
  return cleaned.replace(/[^\d+\-\s()]/g, "");
}
