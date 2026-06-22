## Goal
Make this project deployable on Vercel via GitHub auto-deploys, while keeping it editable in Lovable.

## Why this works
TanStack Start is built on Nitro, which targets Vercel as a first-class preset. The only platform-specific bit here is the server build target (currently Cloudflare Workers via the Lovable Vite config default). We switch that target to Vercel, and the rest of the app (routes, server functions, Supabase auth, OTP flow) runs unchanged. You'll get Vercel Edge Functions, serverless functions, previews per PR, and analytics out of the box.

## Steps

### 1. Switch the server build target to Vercel
Edit `vite.config.ts` to override the Nitro preset:

```ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    nitro: {
      preset: "vercel",          // serverless Node functions
      // preset: "vercel-edge",  // alternative if you want Edge runtime everywhere
    },
  },
});
```

This makes `vite build` emit a `.vercel/output/` directory in the Vercel Build Output API v3 format, which Vercel deploys natively.

### 2. Add `vercel.json` (minimal)
Most settings are auto-detected, but we'll add a small config so Vercel knows the framework is custom Nitro output:

```json
{
  "buildCommand": "bun run build",
  "outputDirectory": ".vercel/output",
  "framework": null
}
```

### 3. Document environment variables for Vercel
The Vercel dashboard needs the same env vars Lovable injects locally. We'll add a `.env.example` (committed) listing:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

You'll paste real values into Vercel → Project Settings → Environment Variables (Production + Preview).

### 4. Supabase auth redirect URLs
Add your Vercel URLs to Supabase Auth → URL Configuration:
- `https://<your-project>.vercel.app`
- `https://<your-custom-domain>`
- Preview pattern: `https://*.vercel.app` (or per-branch as needed)

This is required for the password reset and OTP email links to work on Vercel.

### 5. GitHub + Vercel wiring (you do this once, outside Lovable)
1. In Lovable: Plus (+) menu → GitHub → Connect project → Create Repository.
2. In Vercel: New Project → Import the GitHub repo. Vercel detects the build automatically.
3. Add the env vars from step 3.
4. Deploy. Future Lovable edits push to GitHub → Vercel auto-deploys (production on `main`, previews on PRs).

### 6. Custom domain
After the first successful Vercel deploy, add your domain in Vercel → Project → Domains, then update DNS at your registrar per Vercel's instructions. Add the final domain to Supabase Auth redirect URLs too.

## What does NOT change
- All routes, components, Supabase client code, server functions, and the auth/OTP/reset flow stay as-is.
- You can keep using Lovable Publish in parallel (it deploys to `*.lovable.app`) or stop using it once Vercel is your source of truth.

## Notes / trade-offs
- **Runtime**: `vercel` preset = Node serverless functions (broadest npm compatibility, including any future server-side libs that need Node built-ins). `vercel-edge` = Edge runtime (faster cold starts, but the same Node-incompatibility constraints we currently have on Cloudflare). I recommend starting with `vercel` (Node serverless) since you specifically asked to escape the Cloudflare Worker constraints — easy to switch later.
- Lovable's in-editor "Publish" still points at Lovable hosting. That's fine to ignore once Vercel is live; both can coexist.
- No code in `src/` needs to change for this migration.
