# Deployment checklist

## Hostinger Node.js (reference target)

### One-time setup
1. Add env vars in the Hostinger panel: `DATABASE_URI`, `PAYLOAD_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `NEXT_PUBLIC_SERVER_URL`
2. Connect the GitHub repo
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Confirm Node version is 22.x (Payload 3.x needs ≥18, 22 works fine)

### Neon database setup
1. Create a Neon project (free tier is fine to start)
2. From the Connection Details panel, copy the **pooled** connection string (has `-pooler` in the hostname)
3. Paste it as `DATABASE_URI` in Hostinger
4. Payload's first boot auto-creates the schema. If a new field is added later and the column is missing in production, run the SQL manually:
   ```sql
   ALTER TABLE media ADD COLUMN IF NOT EXISTS cloudinary_url text;
   ```
   Payload converts camelCase field names to snake_case columns. `cloudinaryUrl` → `cloudinary_url`.

### Cloudinary setup
1. Create a free Cloudinary account
2. From the dashboard, copy `Cloud name`, `API Key`, `API Secret`
3. Paste into Hostinger env vars
4. The folder is set in `collections/Media.ts` (`CLOUDINARY_FOLDER` constant) — change it per project so multiple sites don't collide

### Post-deploy verification
1. Visit `/admin` — should show the first-user creation form (or login if already created)
2. Visit `/blog` — should list seed posts (if any)
3. Open Neon SQL Editor and run `SELECT id, filename, cloudinary_url FROM media;` — every row should have a Cloudinary URL
4. Click a post — the cover should load from `https://res.cloudinary.com/...`

### Resetting seeded content
If you change the seed data and want to re-run it, you must clear both tables (because `onInit` skips seeding if any posts exist):
```sql
DELETE FROM posts;
DELETE FROM media;
```
Then redeploy or restart. `onInit` will reseed and upload images to Cloudinary fresh.

## Other hosts

### Vercel
- Drop `unoptimized: true` from `next.config.ts` if you want Vercel's image optimization
- Enable `output: "standalone"` for slightly faster cold starts (optional)
- Use the same Neon pooler endpoint — Vercel's serverless functions create many connections, the pooler is essential

### Render / Railway / Fly.io
- Same setup as Hostinger; long-running Node.js process
- These have more CPU headroom than Hostinger, you can experiment with image optimization on if you want

## Known issues catalog

| Symptom | Cause | Fix |
|---|---|---|
| Build fails with `Cannot find module './collections/Users'` | Node v22 ESM strict mode + `payload generate:importmap` in build script | Remove generate:importmap from build script, commit importMap.js |
| `/admin` shows hydration error `<html> cannot be a child of <main>` | `app/layout.tsx` still exists, wraps payload routes | Delete it, use `(site)`/`(payload)` route groups |
| `/admin` 503 on every page | `afterRead` hook crashing on frozen doc | Remove afterRead, use cloudinaryUrl field instead |
| Blog page broken images, URL is `/api/media/file/...` | Reading the wrong field (`url` not `cloudinaryUrl`) | Update frontend components to read `cover.cloudinaryUrl` |
| `/blog` 503 but `/blog/[slug]` works | `withPayload` made the listing dynamic, page exceeded server timeout | Add `export const dynamic = "force-dynamic"` and ensure Neon pooler is used |
| Images load slowly | Next.js Image Optimization rerunning Sharp on every request | Set `unoptimized: true` in `next.config.ts` |
| Static pages return 503 on RSC navigation | Node.js process overwhelmed by image processing | Add `export const dynamic = "force-static"` to pages without DB calls + `unoptimized: true` |
| Build fails with `Type error: 'staticURL' does not exist` | Using Payload 2.x's `staticURL` option | Remove `staticURL` — store URL in `cloudinaryUrl` field instead |
| `next/image` errors "hostname not configured" | Cloudinary not in `remotePatterns` | Add `{ protocol: "https", hostname: "res.cloudinary.com" }` |
| Admin shows "9 errors" / module not found | `package-lock.json` out of sync after dep changes | Run `npm install` locally, commit the lockfile |
| Lots of `503` on RSC requests after deploy | First request hit before `onInit` finished seeding | Force-dynamic on listing pages; let static pages stay static so RSC payload is pre-built |
