# Architecture notes

The "why" behind the choices that the main SKILL.md lists.

## Why route groups `(site)` and `(payload)` with no `app/layout.tsx`

Payload's admin layout returns `<RootLayout>` which internally renders `<html>` and `<body>`. If a site-level `app/layout.tsx` exists, **all** routes inherit from it — including `app/(payload)/admin`. The result is `<html><body><main><html>` nested in the DOM, which React hydration cannot reconcile. The page renders briefly then throws a "console error: In HTML, `<html>` cannot be a child of `<main>`".

Next.js's "multiple root layouts" feature solves this: if you **delete** `app/layout.tsx`, each route group's `layout.tsx` becomes its own root layout. `(site)/layout.tsx` and `(payload)/layout.tsx` are now independent — neither wraps the other.

The trade-off: route groups in parens are transparent to URL routing (`/blog` resolves to `app/(site)/blog/page.tsx`), so users see no change. But every file that used to be at `app/<route>/` must move to `app/(site)/<route>/`.

## Why `cloudinaryUrl` as an explicit field, not the virtual `url`

The intuitive approach is to upload to Cloudinary in `beforeChange` and return `url` in the modified data. Payload 3.x ignores this. After every `beforeChange`, Payload internally overwrites `url` with `/api/${collection}/file/${filename}` — a route that, with `disableLocalStorage: true`, returns 404 because there's no local file to serve.

Approaches that don't work:
- **`staticURL` on the upload config** — was the Payload 2.x way; removed in 3.x, causes a TS compilation error
- **`afterRead` hook to rewrite `url`** — works in some contexts but can crash with "cannot assign to property of frozen object" depending on how Payload populates the relationship. Worse: when it crashes inside the admin panel's media list, it brings down `/admin` with a 503
- **`afterChange` to update the row** — recursive: triggers another `afterChange`, infinite loop unless you add guards that make the code brittle

What works: add a custom text field called `cloudinaryUrl`. Payload doesn't touch user-defined fields. `beforeChange` uploads and writes the Cloudinary URL to that field. All frontend components read `cover.cloudinaryUrl` instead of `cover.url`. The virtual `url` field becomes irrelevant — its broken value is simply never read.

## Why `unoptimized: true` for images

Next.js's `<Image>` component, by default, downloads remote images to the server, resizes them via Sharp, and caches them. On Hostinger's shared Node.js plans (~512MB RAM, throttled CPU), this is catastrophic:
- Each cold image request takes 2-5 seconds
- A page with 5 images triggers 5 simultaneous Sharp instances
- Memory peaks past the plan's limit
- Node.js process is killed → 503

Cloudinary already delivers optimized images via its global CDN. Re-optimizing on the origin server is pure waste. `unoptimized: true` tells Next.js to render `<img src="…">` directly. The browser fetches straight from Cloudinary, the Node.js process never touches the bytes.

On Vercel/Render with proper CPU headroom, you can keep optimization on — the bottleneck doesn't bite. But the skill defaults to `unoptimized: true` because most users are on Hostinger or similar.

## Why the Posts collection has an `afterChange` hook calling `revalidatePath`

`/blog/[slug]` uses `revalidate = 3600` (ISR with 1h window) plus `generateStaticParams` (pre-renders all slugs at build). Without intervention, when you update a post via the API, the public page keeps serving the old HTML until ISR's clock expires — could be up to 1 hour — or until the next deploy.

Payload's `afterChange` hook fires whenever a post is created or updated (regardless of whether the change came from /admin, the REST API, or a server-side payload.update). The hook calls Next.js's `revalidatePath("/blog/<slug>")` and `revalidatePath("/blog")`, immediately purging the relevant ISR entries. On the next request, Next.js regenerates the page with the fresh DB data.

`afterDelete` does the same on deletion — otherwise a deleted post's URL would still serve cached HTML for an hour, returning content that no longer exists in the DB.

There's a try/catch around `revalidatePath` because the hook also runs in non-Next contexts (e.g., a CLI script using `payload.update`), where the function isn't available. Those calls silently no-op.

## Why force-dynamic on `/blog` listing but ISR on `/blog/[slug]`

The listing is more volatile: a new post is published frequently, the cache needs to expire fast. But ISR can serve a stale page generated **before** the seed completed — we saw this in production: home page worked but `/blog` showed broken images because its first ISR generation happened in the race window before `onInit` finished uploading covers to Cloudinary.

`force-dynamic` forces SSR every request. The cost is a fresh DB hit per visit (~50ms with Neon pooler). The benefit is: no race conditions, always shows the latest content.

Individual posts are different. The slug determines the content, the content changes rarely. ISR with `revalidate=3600` + `generateStaticParams` pre-renders every post at build time and refreshes on a 1h cycle. Googlebot gets pure static HTML.

## Why `output: "standalone"` is disabled

Standalone build packages the Next.js app into `.next/standalone/server.js` — a self-contained Node.js entrypoint. Hostinger's panel expects to run `next start` (which is what npm's "start" script does in this template). `next start` does not work with standalone output: it can't find the manifest files it expects.

If the target is Vercel, you can enable standalone — Vercel detects it and uses the right entrypoint. For everything else, leave it off.

## Why `importMap.js` is committed

Payload auto-generates `app/(payload)/admin/importMap.js` from scanning the config and detecting which Lexical features, custom components, etc. are in use. The CLI command `payload generate:importmap` is supposed to handle this.

Hostinger's build runs Node v22 with strict ESM resolution. `payload.config.ts` imports `./collections/Users` (no extension), which Node refuses to resolve in ESM mode. The CLI dies with `ERR_MODULE_NOT_FOUND`.

`withPayload()` in `next.config.ts` is supposed to regenerate it during the Next.js build too, but the timing is unreliable — admin pages get compiled before withPayload's hook runs, and the static `import { importMap } from "./admin/importMap"` fails.

The pragmatic fix: just commit `importMap.js` to git. It's small (~50 lines), it changes only when you add/remove Payload plugins, and committing eliminates the build-time generation problem entirely. Regenerate locally with `npm run generate:importmap` whenever you change the plugin set, then commit the diff.
