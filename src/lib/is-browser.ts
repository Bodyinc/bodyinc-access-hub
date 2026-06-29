/** True only in a real browser — not Node SSR (even with partial window polyfills). */
export function isBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.document !== "undefined" &&
    typeof window.document.createElement === "function"
  );
}
