export function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = "pre-fix",
) {
  // #region agent log
  fetch("http://127.0.0.1:7518/ingest/7c750950-4d8e-40b2-8cda-cd59f9bccba2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "83923c",
    },
    body: JSON.stringify({
      sessionId: "83923c",
      location,
      message,
      data,
      timestamp: Date.now(),
      hypothesisId,
      runId,
    }),
  }).catch(() => {});
  // #endregion
}
