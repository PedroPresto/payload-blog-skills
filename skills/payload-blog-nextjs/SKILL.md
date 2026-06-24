---
name: payload-blog-nextjs
description: Use this skill whenever the user wants to add a CMS-backed blog to a Next.js site, set up Payload CMS, integrate Neon PostgreSQL, store images on Cloudinary, or replicate this production-ready blog structure on another project. Trigger even when the user only mentions one piece — adding a `/blog` page, setting up an admin panel, server-side rendering blog posts, hooking Cloudinary uploads, or creating a Payload collection. The skill installs a battle-tested, GEO/SEO-optimized blog: route-group-separated layouts, Cloudinary-backed media with the `cloudinaryUrl` field workaround, ISR for individual posts and force-dynamic for the listing, automatic seeding, and Hostinger-compatible deployment.
---

# Payload + Neon + Cloudinary blog for Next.js

This skill installs a blog with these properties, baked-in:

- **Payload CMS 3.x** as the headless backend, served from `app/(payload)/admin` on the same Next.js process
- **Neon PostgreSQL** as the database
- **Cloudinary** for media storage (Payload's local storage is disabled)
- **Multiple root layouts** so the Payload admin and the public site don't fight over `<html>`
- **GEO/SEO optimized**: `force-static` for content pages, `force-dynamic` for the blog listing (always fresh), ISR (1h) for individual posts, `generateStaticParams` for slug pre-rendering
- **No server-side image processing** — Cloudinary delivers optimized images via its CDN, Next.js `unoptimized: true` keeps the Node.js process light (critical on shared hosts like Hostinger)
- **Automatic content seeding** via Payload's `onInit` hook
- **External API ready** — Users collection has `useAPIKey: true`, CORS is open, REST + GraphQL endpoints are live. Any agent, automation, or external service can create/update/delete posts with a single API key header. See `references/api-access.md` for the full guide.
- **Hostinger-ready** — works with the default `next start`, no standalone build, `importMap.js` is checked into git

## Why these decisions matter

A bunch of subtle Payload 3.x and Next.js App Router quirks broke production builds during the original development. The skill is essentially the post-mortem of those incidents. Don't second-guess these choices unless you've reproduced the original failure:

| Decision | What goes wrong if you skip it |
|---|---|
| Route groups `(site)` and `(payload)` with **no** `app/layout.tsx` | Payload's `RootLayout` renders its own `<html>`, gets nested inside the site's `<main>`, hydration crashes |
| Custom `cloudinaryUrl` field on Media | Payload 3.x silently overwrites the `url` field after `beforeChange` with `/api/media/file/<filename>` (which 404s when `disableLocalStorage:true`) |
| `staticURL` **must not** be on the upload config | Doesn't exist in Payload 3.x types, TypeScript build fails |
| `afterRead` to mutate the doc | Can crash the server with a "frozen object" error in some contexts — use the explicit field instead |
| `unoptimized: true` for images | Sharp on the server destroys CPU/memory on small Hostinger plans → 503s |
| `force-dynamic` on the blog listing | ISR cache served stale posts that pre-dated the seed/migration → broken images |
| `importMap.js` committed | Payload's CLI to regenerate it fails under Node v22 ESM resolution; just commit the file |
| `output: "standalone"` **disabled** | Hostinger uses `next start`, which doesn't work with standalone builds |
| Image domains `res.cloudinary.com` in `remotePatterns` | `next/image` refuses unknown hosts, all images break |

Read `references/architecture.md` if you need the deeper rationale.

## Pre-flight check

Before touching files, gather:

1. **Target codebase path** (Next.js project, App Router, TypeScript)
2. **Site identity**: name, locale (default `pt-BR`), site title, description
3. **Provisioned services** the user must have:
   - Neon project → `DATABASE_URI` (use the **pooler** endpoint, not the direct one)
   - Cloudinary account → `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - Payload secret (any random 32+ char string) → `PAYLOAD_SECRET`
4. **Seed content** (optional): list of initial posts with cover image paths under `public/`

If the user hasn't provisioned Neon/Cloudinary yet, ask. Don't try to scaffold those.

## The 7-step install

Always follow this order. Each step is small enough to verify before moving on.

### 1. Install dependencies

Add to `package.json` dependencies (preserve existing entries):

```
"@payloadcms/db-postgres": "^3.84.1",
"@payloadcms/next": "^3.84.1",
"@payloadcms/richtext-lexical": "^3.84.1",
"@payloadcms/ui": "^3.84.1",
"cloudinary": "^2.6.1",
"graphql": "^16.14.0",
"payload": "^3.84.1",
"sharp": "^0.34.5"
```

And these scripts:

```
"payload": "payload",
"generate:importmap": "payload generate:importmap",
"generate:types": "payload generate:types"
```

Keep `"build": "next build"` — do **not** add `payload generate:importmap` to the build script (it fails on Hostinger's Node v22 due to extensionless ESM imports in `payload.config.ts`).

### 2. Update `next.config.ts`

```ts
import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default withPayload(nextConfig);
```

If the user already has a `next.config.ts`, merge these settings — don't blindly overwrite.

### 3. Restructure `app/` into route groups

This is the part most likely to need surgery on an existing site. The end state must be:

```
app/
  (site)/
    layout.tsx              ← the EXISTING root layout (Navbar, Footer, fonts, globals.css import)
    page.tsx                ← homepage
    blog/
      page.tsx              ← /blog listing (force-dynamic)
      [slug]/
        page.tsx            ← individual post (revalidate=3600, generateStaticParams)
    <other site routes>     ← move everything else here
  (payload)/
    layout.tsx
    custom.scss
    admin/
      importMap.js          ← commit this file
      [[...segments]]/
        page.tsx
        not-found.tsx
    api/
      [...slug]/
        route.ts
      graphql/
        route.ts
      graphql-playground/
        route.ts
  globals.css               ← STAYS at app/ (imported via "../globals.css" from (site)/layout.tsx)
  favicon.png, icon.png     ← STAY at app/
```

**Critical**: there must be **no `app/layout.tsx`**. Each route group provides its own root layout with `<html>` and `<body>`. This is Next.js's "multiple root layouts" pattern — required because Payload's admin renders its own `<html>`.

When migrating an existing site:
1. Create `app/(site)/`
2. Move the current `app/layout.tsx` to `app/(site)/layout.tsx` and adjust the `globals.css` import to `../globals.css`
3. `git mv` all existing site routes (`page.tsx`, `blog/`, `about/`, etc.) into `app/(site)/`
4. Delete `app/layout.tsx`
5. Add `app/(payload)/` from the templates

Use `git mv` so history is preserved. On Windows + PowerShell, paths with `[brackets]` confuse globbing — copy these files manually with `Write` rather than via PowerShell `Copy-Item`.

### 4. Copy templates

All of these files live under `templates/` in this skill. Copy them with the placeholders `{{SITE_NAME}}`, `{{SITE_TITLE}}`, `{{SITE_DESCRIPTION}}`, `{{LOCALE}}` replaced for the target project:

| Skill template path | Target path |
|---|---|
| `templates/payload.config.ts` | `payload.config.ts` |
| `templates/lib/payload.ts` | `lib/payload.ts` |
| `templates/collections/Users.ts` | `collections/Users.ts` |
| `templates/collections/Media.ts` | `collections/Media.ts` |
| `templates/collections/Posts.ts` | `collections/Posts.ts` |
| `templates/components/blog/*.tsx` | `components/blog/*.tsx` |
| `templates/app-site/layout.tsx` | `app/(site)/layout.tsx` (or merge into existing) |
| `templates/app-site/blog/page.tsx` | `app/(site)/blog/page.tsx` |
| `templates/app-site/blog/slug/page.tsx` | `app/(site)/blog/[slug]/page.tsx` |
| `templates/app-payload/layout.tsx` | `app/(payload)/layout.tsx` |
| `templates/app-payload/custom.scss` | `app/(payload)/custom.scss` |
| `templates/app-payload/admin-page.tsx` | `app/(payload)/admin/[[...segments]]/page.tsx` |
| `templates/app-payload/admin-not-found.tsx` | `app/(payload)/admin/[[...segments]]/not-found.tsx` |
| `templates/app-payload/importMap.js` | `app/(payload)/admin/importMap.js` |
| `templates/app-payload/api-slug-route.ts` | `app/(payload)/api/[...slug]/route.ts` |
| `templates/app-payload/api-graphql-route.ts` | `app/(payload)/api/graphql/route.ts` |
| `templates/app-payload/api-graphql-playground-route.ts` | `app/(payload)/api/graphql-playground/route.ts` |

### 5. Environment variables

Add to `.env.local` (and document for production):

```
DATABASE_URI=postgresql://...@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require
PAYLOAD_SECRET=<random 32+ chars>
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

**Always use Neon's pooler endpoint** (`-pooler` in the hostname). Direct connections leak under Next.js server component fan-out.

### 6. Seed data (optional but recommended)

Edit `payload.config.ts` and populate the `SEED_POSTS` array. The template includes Lexical helper functions (`p`, `h2`, `h3`, `ul`, `link`) — use them to build the rich text without hand-writing the node tree. See `references/seeding.md` for the full pattern.

Cover images should be placed under `public/covers/<filename>` before deploy. The `onInit` hook reads them with `fs.readFileSync` and uploads via `payload.create({ collection: "media", file: { ... } })`, which triggers the Cloudinary upload through `beforeChange`.

### 7. Apply force-static to non-DB pages

For every page under `app/(site)/` that does **not** query Payload, add at the top:

```ts
export const dynamic = "force-static";
```

This prevents `withPayload` from accidentally marking them dynamic and pushing every client-side navigation through SSR (cause of 503s on shared hosting).

Pages that DO query Payload follow these rules:
- `/blog` listing → `export const dynamic = "force-dynamic"` (avoids stale ISR cache)
- `/blog/[slug]` → `export const revalidate = 3600` + `generateStaticParams`
- Home page (if it embeds a "latest posts" component) → `export const revalidate = 3600`

## Verification (always run)

After install:

1. `npm install` — confirms the new deps resolve
2. `npx payload generate:types` — confirms the config compiles and writes `payload-types.ts`
3. `npm run dev` — visit `/admin` (should redirect to first-user creation), then `/blog` (should list seeded posts), then `/blog/<slug>` (should render with cover from `res.cloudinary.com`)
4. Inspect `media` table in Neon → `cloudinary_url` column should hold the full `https://res.cloudinary.com/...` URL for each row
5. **Test external API access**: in the admin panel, edit your user, enable the API Key, save. Then:
   ```bash
   curl "http://localhost:3000/api/posts?where[status][equals]=published&depth=1"
   ```
   Should return the seeded posts as JSON. This confirms the API is reachable for agents and external services. See `references/api-access.md` for create/update flows.

If `/admin` shows a hydration error about `<html>` nesting, you forgot to delete `app/layout.tsx`.

## Deployment notes

- The user must add the same env vars in the host's panel (Hostinger, Vercel, etc.)
- For Neon: if migrations don't auto-run, manually add columns with `ALTER TABLE media ADD COLUMN IF NOT EXISTS cloudinary_url text;` in the Neon SQL console
- After clearing seed data: `DELETE FROM posts; DELETE FROM media;` then redeploy — `onInit` will reseed with correct Cloudinary URLs

See `references/deployment.md` for the full Hostinger checklist and known-issue catalog.

## When the user wants variations

- **Different content type** (e.g., projects, events): clone `Posts.ts`, rename the slug, adapt fields. Keep the cover-image relationship to Media unchanged so Cloudinary still works.
- **Multilingual**: add Payload's `localization` to `payload.config.ts` and pass `locale` to all `payload.find()` calls. The template doesn't enable it by default.
- **Different hosting** (Vercel/Render): drop `unoptimized: true` from the image config — those platforms have CPU headroom. Keep everything else.
- **Switch DB to Supabase or other Postgres**: just change `DATABASE_URI`. Payload 3.x's pg adapter works with any standard Postgres.

## What this skill does NOT do

- It does not provision Neon, Cloudinary, or Hostinger accounts
- It does not generate post content (that's a separate skill — `post-to-blog`)
- It does not run database migrations beyond Payload's auto-push (in dev) — production schema changes need manual SQL or `payload migrate`
- It does not configure auth beyond the default Payload Users collection (single admin role)
