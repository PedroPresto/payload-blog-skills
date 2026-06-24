# Troubleshooting `post-to-blog`

## "Credentials file not found: /home/.../.claude/blogs.json"

Create `~/.claude/blogs.json` using the template at `templates/blogs.example.json`. The file is read-only used by the script — no other tool needs it.

## "Blog X not found in blogs.json"

The `--blog` argument must match a key in the `blogs` object exactly. Case-sensitive. Watch for dash/no-dash mismatches, e.g. `myblog` vs `my-blog`.

## "HTTP 401 Unauthorized"

The API key is wrong, expired, or belongs to a deleted user.

1. Log into the site's `/admin`
2. Open your user profile (top-right)
3. Find the API Key field
4. Click "Regenerate" or "Enable API Key"
5. Copy the new key, update `~/.claude/blogs.json`

If the Users collection doesn't have an "API Key" field at all, the site was set up before `useAPIKey: true` was added. Update the site's `collections/Users.ts` (see `payload-blog-nextjs` skill) and redeploy.

## "HTTP 403 Forbidden"

The user authenticated but lacks permission. Check `collections/Posts.ts` and `collections/Media.ts` `access` callbacks — they should return `true` when `user` is set:
```ts
create: ({ req: { user } }) => Boolean(user),
```

If you've added role-based access, make sure the API key's user has the right role.

## "HTTP 400: field is required" on media upload despite `alt` being set

Payload 3.x's upload endpoint expects metadata in a single `_payload` JSON field, not as individual form fields. The skill's `post.js` already does this correctly — if you see this error after editing the script, make sure your media POST sends:

```js
form.append("file", blob, filename);
form.append("_payload", JSON.stringify({ alt, caption }));
```

NOT this (which was the first-version bug):
```js
form.append("file", ...);
form.append("alt", "...");
form.append("caption", "...");
```

## "HTTP 400: excerpt must be shorter than 160 characters"

Each site has its own `maxLength` on the excerpt field. Some use 280, some use 160 (Meta description spec). Shorten the excerpt or check the site's `collections/Posts.ts` for the actual limit. Safe default: write excerpts under 150 chars.

## "HTTP 400: ValidationError - slug already exists"

Either:
- Pick a new slug
- Or add `--update` to PATCH the existing post instead of creating a duplicate

## "HTTP 413 Payload too large"

The cover image is bigger than the host accepts (Hostinger default ~50MB, but practically you should stay under 5MB for fast loads). Resize to 1600×900 max, JPEG quality 85%. Cloudinary will re-compress on its end anyway.

## "Media upload succeeded but post creation failed"

You now have an orphan media doc with no post pointing to it. Two options:

1. **Reuse it** for the retry: the script printed `✓ Cover uploaded as media #42` — pass `--media-id 42` on the next run to skip the upload and reuse this media
2. **Delete it**: open `/admin`, go to Media, find the doc by filename, delete it

## "ERR_MODULE_NOT_FOUND" or syntax errors when running post.js

Node version too old. Need ≥18 for native `fetch` and `FormData`. Check with `node --version`. Upgrade to LTS.

## Cover image URL passed but download fails

The script downloads remote covers to a temp file before uploading. If the URL requires auth or returns HTML (e.g., a Google Drive share link that needs auth), download manually first and pass the local path.

## Post created but doesn't appear on /blog

Check `status`. If it's `draft`, it won't show in the public listing. Either set `status: "published"` and re-run with `--update`, or edit in /admin.

If `status: "published"` is correct but it still doesn't show:
- Check `publishedAt` isn't in the future (the blog query filters `publishedAt <= now()`)
- Verify the listing page is `force-dynamic` (per `payload-blog-nextjs` skill), not ISR — ISR cache could be stale

## Images load broken in the post

Open the post page, view source on the `<img>` tag. The `src` should start with `https://res.cloudinary.com/...`. If it shows `/api/media/file/...`, the `cloudinaryUrl` field wasn't populated — see `payload-blog-nextjs` skill's references/deployment.md for the column-missing-in-Neon fix.

## API blocked by CORS in browser

The script doesn't run in a browser — but if you're calling the API from a frontend, the site's `payload.config.ts` must include your origin in `cors`. Default is `*` which allows everything; tighten only if you know what you're doing.

## Want to test without publishing

Run with `--status draft`. The post is created but doesn't appear on the public listing. You can preview by logging into /admin and opening the post.
