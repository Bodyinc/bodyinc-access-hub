// sessionStorage throws in private-mode / sandboxed browsers. Every access in the app
// goes through these wrappers so failures degrade to "no cache" instead of crashing a
// route guard, and so we don't scatter empty try/catch blocks across the codebase.

export function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSession(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Storage unavailable — the value is a cache, so losing it is harmless.
  }
}

export function removeSession(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

export function removeSessionByPrefix(prefix: string): void {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(prefix)) sessionStorage.removeItem(key);
    }
  } catch {
    // Storage unavailable — nothing to clear.
  }
}
