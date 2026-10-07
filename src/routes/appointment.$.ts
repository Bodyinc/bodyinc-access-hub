import { createFileRoute } from "@tanstack/react-router";
import { getQuickbloxConfig } from "@/lib/consultations/config";

export const Route = createFileRoute("/appointment/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const reqUrl = new URL(request.url);
        const splat = (params as Record<string, string>)["_splat"] || "";
        const search = reqUrl.search; // includes ?token=...
        const { providerAppUrl } = getQuickbloxConfig();
        const quickbloxBase = (providerAppUrl || "https://provider-bodyinc.quickblox.com").replace(
          /\/$/,
          "",
        );
        const quickbloxUrl = `${quickbloxBase}/appointment/${splat}${search}`;

        try {
          const upstreamRes = await fetch(quickbloxUrl, {
            headers: {
              "User-Agent": request.headers.get("user-agent") || "Mozilla/5.0",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            cache: "no-store",
          });

          let html = await upstreamRes.text();
          // Strip <base href="/"> so internal router navigations stay on our same-origin proxy
          html = html.replace('<base href="/">', "");
          // Rewrite script, style, and icon tags to load directly from QuickBlox origin
          html = html.replaceAll('src="', `src="${quickbloxBase}/`);
          html = html.replaceAll('href="main.', `href="${quickbloxBase}/main.`);
          html = html.replaceAll('href="favicon.', `href="${quickbloxBase}/favicon.`);
          html = html.replaceAll('href="logo', `href="${quickbloxBase}/logo`);
          html = html.replaceAll(
            'href="manifest.json"',
            `href="${quickbloxBase}/manifest.json"`,
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
          return new Response(`Error loading consultation: ${message}`, { status: 502 });
        }
      },
    },
  },
});
