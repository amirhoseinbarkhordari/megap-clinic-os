const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_INDIC = "۰۱۲۳۴۵۶۷۸۹";

export function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  const asciiDigits = value
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_INDIC.indexOf(digit)));
  const normalized = asciiDigits.trim().replace(/[\s().-]/g, "");
  return normalized || null;
}

export function normalizeSearchPhone(value: string): string {
  return normalizePhone(value) ?? "";
}
