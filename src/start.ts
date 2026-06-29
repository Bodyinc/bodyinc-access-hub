import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { debugLog } from "@/lib/debug-log";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    // #region agent log
    debugLog(
      "start.ts:errorMiddleware:catch",
      "request middleware error",
      {
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        hasStatusCode: error != null && typeof error === "object" && "statusCode" in error,
        isResponse: error instanceof Response,
      },
      "D",
    );
    // #endregion
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "x-debug-source": "start-errorMiddleware",
        "x-debug-error": error instanceof Error ? error.name : typeof error,
      },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
