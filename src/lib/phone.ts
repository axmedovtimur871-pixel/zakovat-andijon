/**
 * Normalises a phone number to E.164 (+998901234567).
 * Accepts Uzbek numbers written in any common way: "90 123 45 67",
 * "+998 (90) 123-45-67", "998901234567", "8 90 123 45 67". Other countries
 * must start with "+". Returns null when the number is not valid.
 */
export function normalizePhone(input: string): string | null {
  const raw = String(input ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (raw.startsWith("+")) {
    if (digits.startsWith("998")) return digits.length === 12 ? `+${digits}` : null;
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith("998")) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith("8")) return `+998${digits.slice(1)}`;
  return null;
}

/** +998901234567 → "+998 90 123 45 67" */
export function formatPhone(e164: string): string {
  const m = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : e164;
}
