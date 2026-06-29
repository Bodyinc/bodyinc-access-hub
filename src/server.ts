import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { debugLog } from "./lib/debug-log";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

function getRedirectHref(error: unknown): string | undefined {
  if (!(error instanceof Response)) return undefined;
  const options = (error as Response & { options?: { href?: string } }).options;
  return options?.href;
}

function redirectResponse(href: string, request: Request): Response {
  return Response.redirect(new URL(href, request.url).href, 302);
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(
  response: Response,
  request: Request,
): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  const captured = consumeLastCapturedError();
  const redirectHref = captured ? getRedirectHref(captured) : undefined;

  // #region agent log
  debugLog(
    "server.ts:normalizeCatastrophicSsrResponse",
    "h3 HTTPError intercepted",
    {
      status: response.status,
      bodySnippet: body.slice(0, 200),
      capturedType: captured?.constructor?.name ?? typeof captured,
      capturedIsResponse: captured instanceof Response,
      redirectHref: redirectHref ?? null,
      hasOptions: captured instanceof Response ? !!(captured as Response & { options?: unknown }).options : false,
    },
    "B",
  );
  // #endregion

  if (redirectHref) {
    return redirectResponse(redirectHref, request);
  }

  console.error(captured ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-debug-source": "server-normalize",
      "x-debug-captured": captured?.constructor?.name ?? String(typeof captured),
      "x-debug-body": body.slice(0, 120),
    },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    // #region agent log
    debugLog(
      "server.ts:fetch:entry",
      "SSR request received",
      {
        url: request.url,
        method: request.method,
        hasWindow: typeof globalThis.window !== "undefined",
        hasDocument: typeof globalThis.document !== "undefined",
        hasSupabaseUrl: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      },
      "C",
    );
    // #endregion
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      // #region agent log
      debugLog(
        "server.ts:fetch:afterHandler",
        "handler returned",
        {
          url: request.url,
          status: response.status,
          contentType: response.headers.get("content-type"),
        },
        "A",
      );
      // #endregion
      return await normalizeCatastrophicSsrResponse(response, request);
    } catch (error) {
      const redirectHref = getRedirectHref(error);
      // #region agent log
      debugLog(
        "server.ts:fetch:catch",
        "uncaught handler error",
        {
          url: request.url,
          errorName: error instanceof Error ? error.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          redirectHref: redirectHref ?? null,
          isResponse: error instanceof Response,
        },
        "A",
      );
      // #endregion
      if (redirectHref) {
        return redirectResponse(redirectHref, request);
      }
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "x-debug-source": "server-catch",
          "x-debug-error": error instanceof Error ? error.name : typeof error,
        },
      });
    }
  },
};
