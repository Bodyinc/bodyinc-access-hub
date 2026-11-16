/**
 * Smoke-test provider Web Push helpers without a browser.
 * Usage: node scripts/test-provider-push.mjs
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const webpush = require("web-push");
const root = resolve(import.meta.dirname, "..");

let failed = 0;
function ok(label, cond) {
  if (cond) console.log(`PASS  ${label}`);
  else {
    failed += 1;
    console.error(`FAIL  ${label}`);
  }
}

const keys = webpush.generateVAPIDKeys();
ok("generate VAPID keys", Boolean(keys.publicKey && keys.privateKey));

webpush.setVapidDetails("mailto:test@bodyinc.com", keys.publicKey, keys.privateKey);
ok("setVapidDetails does not throw", true);

const sw = readFileSync(resolve(root, "public/sw.js"), "utf8");
ok("sw.js handles push", sw.includes('addEventListener("push"'));
ok("sw.js handles notificationclick", sw.includes('addEventListener("notificationclick"'));

const migration = resolve(root, "supabase/migrations/20261116180000_provider_push_subscriptions.sql");
ok("migration exists", existsSync(migration));
const sql = readFileSync(migration, "utf8");
ok("migration creates provider_push_subscriptions", sql.includes("provider_push_subscriptions"));
ok("migration wires notifications webhook", sql.includes("/api/internal/notification-push"));

ok("send helper exists", existsSync(resolve(root, "src/lib/push/send.ts")));
ok("push functions exist", existsSync(resolve(root, "src/lib/push.functions.ts")));
ok("webhook route exists", existsSync(resolve(root, "src/routes/api.internal.notification-push.ts")));
ok("UI card exists", existsSync(resolve(root, "src/components/provider/push-notifications.tsx")));

// Expired endpoint should be treated as removable by status code semantics.
ok(
  "web-push exposes sendNotification",
  typeof webpush.sendNotification === "function",
);

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll provider push smoke checks passed.");
console.log("Add these to .env / Vercel to enable real sends:");
console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log("VAPID_SUBJECT=mailto:ithelp@bodyinc.com");
