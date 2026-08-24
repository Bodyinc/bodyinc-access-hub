export const ZIP_CODE_MAX_DIGITS = 6;

export function digitsOnlyZip(value: string): string {
  return value.replace(/\D/g, "").slice(0, ZIP_CODE_MAX_DIGITS);
}
