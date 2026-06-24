---
name: post-to-blog
description: Use this skill whenever the user wants to publish a new blog post to any of their Payload-CMS-based sites (any site set up with the payload-blog-nextjs skill). Trigger on phrases like "post an article about X", "publish a blog post on site Y", "write a new post for the blog", "create content for the blog", "automate posting to the blog", or "schedule a publication". The skill reads stored credentials from ~/.claude/blogs.json, helps draft GEO/SEO-optimized content, uploads the cover image to Cloudinary via the site's API, and publishes the post in one shot using the bundled scripts/post.js. Also use this skill when the user just says "post X" or "publish Y" if the conversation context makes clear it's about their blogs.
---

# Posting to Payload-backed blogs

This skill publishes blog posts to any Next.js site that was built with the `payload-blog-nextjs` skill. It does three things end-to-end:

1. Helps you draft GEO/SEO-optimized content
2. Uploads the cover image to Cloudinary through the site's API
3. Creates the post via Payload's REST API and publishes it

## Setup (one-time per machine)

Credentials live in `~/.claude/blogs.json` — **outside** this skill, so the skill stays portable while keys stay private. Create it once:

```json
{
  "blogs": {
    "my-blog": {
      "url": "https://myblog.com",
      "apiKey": "PAYLOAD_API_KEY_FROM_USER_PROFILE"
    },
    "second-blog": {
      "url": "https://anotherblog.com",
      "apiKey": "ANOTHER_KEY"
    }
  }
}
```

To get an API key for a site: log into its `/admin`, open your user profile (top-right), enable "API Key", save, and copy the generated key. The site's Users collection must have `auth: { useAPIKey: true }` — this is the default in `payload-blog-nextjs`.

See `templates/blogs.example.json` for the full format.

## Workflow

When the user wants to post, follow this order. Skip any step they've already done.

### 0. Know your site's excerpt limit

Different sites have different `maxLength` on the excerpt. Some use 280 chars; others use 160 (Meta description tier). When in doubt, write a 150-char excerpt — fits everywhere. If you don't know, ask the user or read the site's `collections/Posts.ts`.

### 1. Identify the target blog

- If the user says "post to X" → match X against the keys in `~/.claude/blogs.json`
- If unclear, ask which blog (match against the keys defined in `~/.claude/blogs.json`)
- Never guess — posting to the wrong blog is annoying to undo

### 2. Draft the content

Use `references/geo-seo-patterns.md` for the structural rules (title format, excerpt style, H2 patterns, etc.). The skill doesn't generate content for you — Claude generates it; the patterns make sure it's optimized.

Key inputs the user must provide (ask if missing):
- **Topic** — the subject of the post
- **Target keyword or phrase** — what users would search to find this post
- **Location qualifier** (for GEO) — city, region, or organization (often inferable from the blog)
- **Cover image** — local path, URL to download, or the user can generate one

If the user gives you only the topic, draft a title + excerpt + outline first, show them, and iterate before generating the full body. Don't burn tokens producing a 1500-word draft they'll discard.

### 3. Prepare the post JSON

Convert your draft into the simplified content schema (NOT raw Lexical — the script does the conversion). See `references/content-format.md` for the full schema. Quick example:

```json
{
  "title": "Adaptive surfing in Florianópolis: how to start",
  "slug": "adaptive-surfing-florianopolis",
  "excerpt": "Florianópolis offers adaptive surfing lessons year-round — free classes for people with disabilities, with adapted boards and trained volunteers.",
  "cover": "./cover.jpg",
  "alt": "Surfer with adaptive board catching a wave at Praia Mole, Florianópolis",
  "caption": "Praia Mole, 2024",
  "status": "published",
  "content": [
    { "type": "p", "text": "Florianópolis is one of the only cities in Brazil with year-round adaptive surfing programs." },
    { "type": "h2", "text": "Who can participate" },
    { "type": "ul", "items": [
      "People with physical disabilities",
      "Visually impaired participants (with guide surfers)",
      "First-time surfers of any background"
    ]},
    { "type": "h2", "text": "How to sign up" },
    { "type": "p", "runs": [
      { "text": "Free registration at " },
      { "type": "link", "url": "https://example.com/signup", "text": "example.com/signup" },
      { "text": "." }
    ]}
  ]
}
```

Save this JSON to a temp file (e.g., `/tmp/post.json` or `C:/Users/.../tmp/post.json`).

### 4. Run the post script

```bash
node ~/.claude/skills/post-to-blog/scripts/post.js \
  --blog my-blog \
  --post /tmp/post.json
```

On Windows in PowerShell, escape the home shortcut:
```powershell
node "$HOME/.claude/skills/post-to-blog/scripts/post.js" --blog my-blog --post C:/tmp/post.json
```

The script:
1. Reads `~/.claude/blogs.json` to resolve the blog URL + API key
2. Reads the post JSON
3. Resolves `cover` (local file path → uploads to /api/media; URL → downloads then uploads)
4. Builds the Lexical content from the simplified `content` array
5. POSTs to /api/posts with the API key
6. Prints the published post's URL

Exit code 0 on success, non-zero with an error message on failure.

### 5. Verify

After the script reports success, hit the URL it printed. If the user wants to check the listing, visit `<site>/blog` — `force-dynamic` means the post shows up immediately on next request (no ISR cache delay).

If the post needs editing, the user can either:
- Log into `<site>/admin` and edit there
- Re-run the script with the same slug + `--update` flag (the script PATCHes by slug)

## Generating cover images

If the user doesn't supply one, options in priority order:

1. **They have an existing image** — get the local path or URL
2. **Generate via AI image tool** if available in the session (DALL-E, Imagen, etc.) — save to a temp file, pass that path
3. **Cloudinary stock or Unsplash** — search for a relevant free image, download it locally first, pass the path

Never pass a remote URL the script hasn't downloaded — the upload endpoint expects multipart file data, not URL references.

Cover image conventions:
- 1600×900 (16:9) for hero coverage
- JPEG for photos, PNG for graphics with text/transparency
- File name should be a kebab-case version of the topic — it becomes the Cloudinary public_id

## Multi-blog batch posting

To post the same content to multiple blogs (or related content adapted per blog), repeat steps 3-4 with different `--blog` and adjusted JSON. Always rewrite the `slug` per blog to avoid collision tracking — search engines penalize identical content across domains, so prefer **adapting** the post rather than duplicating it verbatim. See `references/geo-seo-patterns.md`.

## When the user wants to schedule rather than publish immediately

Set `"status": "draft"` and `"publishedAt"` to a future date. Drafts don't appear on `/blog`. To make a scheduled post go live automatically, you'd need a cron job — out of scope for this skill, but you can re-run the script with `--update` and `--status published` when the time comes.

## Errors

- **"Blog not found in ~/.claude/blogs.json"** → check the spelling of the `--blog` argument matches a key in the JSON
- **"401 Unauthorized"** → the API key is wrong or was revoked; regenerate it in the admin panel and update `blogs.json`
- **"Slug already exists"** → Posts have a unique slug constraint; either pick a different slug or use `--update`
- **"413 Payload too large"** → cover image too big; Hostinger has a 50MB default limit, but resize anyway (1600px wide max)
- **"Cover upload succeeded but post creation failed"** → orphan media doc was created; either reuse it (pass `--media-id <id>` to skip the upload) or delete it via the admin panel

See `references/troubleshooting.md` for more.
