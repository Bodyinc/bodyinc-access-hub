import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/consultations/embed")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const reqUrl = new URL(request.url);
        const targetUrl = reqUrl.searchParams.get("url");

        if (!targetUrl) {
          return new Response("Missing url parameter", { status: 400 });
        }

        // Safety check: ensure target host is quickblox.com
        let parsed: URL;
        try {
          parsed = new URL(targetUrl);
          if (!parsed.hostname.endsWith("quickblox.com")) {
            return new Response("Invalid host", { status: 403 });
          }
        } catch {
          return new Response("Invalid URL", { status: 400 });
        }

        try {
          const upstreamRes = await fetch(targetUrl, {
            headers: {
              "User-Agent": request.headers.get("user-agent") || "Mozilla/5.0",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
          });

          let html = await upstreamRes.text();
          const upstreamOrigin = `${parsed.protocol}//${parsed.host}`;
          // Strip <base href="/"> so internal router navigations stay on our same-origin proxy
          html = html.replace('<base href="/">', "");
          // Rewrite script, style, and icon tags to load directly from QuickBlox origin
          html = html.replaceAll('src="', `src="${upstreamOrigin}/`);
          html = html.replaceAll('href="main.', `href="${upstreamOrigin}/main.`);
          html = html.replaceAll('href="favicon.', `href="${upstreamOrigin}/favicon.`);
          html = html.replaceAll('href="logo', `href="${upstreamOrigin}/logo`);
          html = html.replaceAll(
            'href="manifest.json"',
            `href="${upstreamOrigin}/manifest.json"`,
          );

          const headers = new Headers();
          headers.set("Content-Type", "text/html; charset=utf-8");
          // Allow embedding within our portal iframe
          headers.set(
            "Content-Security-Policy",
            "frame-ancestors 'self' http://localhost:* https://*.bodyinc.com",
          );

          return new Response(html, {
            status: upstreamRes.status,
            headers,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to load consultation";
          return new Response(`Error: ${message}`, { status: 502 });
        }
      },
    },
  },
});
