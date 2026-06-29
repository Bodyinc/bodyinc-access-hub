/**
 * Local SSR reproduction for debug session 83923c.
 * Run: npm run build && node scripts/debug-ssr.mjs
 */
import handler from "../.vercel/output/functions/__server.func/index.mjs";

const scenarios = [
  { name: "home-default", url: "https://provider-sage.vercel.app/" },
  { name: "auth-default", url: "https://provider-sage.vercel.app/auth" },
];

for (const { name, url } of scenarios) {
  const res = await handler.fetch(new Request(url), {}, {});
  const text = await res.text();
  console.log(
    `${name}: status=${res.status} errorPage=${text.includes("This page didn't load")} len=${text.length}`,
  );
}
