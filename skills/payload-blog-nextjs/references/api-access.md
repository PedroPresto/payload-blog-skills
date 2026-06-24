# External API access — how agents and external services post to the blog

The blog runs on Payload CMS, which exposes the entire `posts` and `media` collections via REST and GraphQL. This guide shows how to authenticate and post from outside the Next.js app — e.g., from an automation agent, n8n flow, Zapier webhook, Python script, or another server.

## Base URL

All endpoints live under `<site>/api/`:

- REST: `https://your-site.com/api/<collection>`
- GraphQL: `https://your-site.com/api/graphql`
- GraphQL Playground (dev only): `https://your-site.com/api/graphql-playground`

Locally that's `http://localhost:3000/api/...`.

## Authentication — API keys

The Users collection in this skill ships with `useAPIKey: true`. To create a key:

1. Log into `/admin`
2. Open your user (top-right avatar → your email)
3. Find the **API Key** field, click "Enable API Key", save
4. Copy the generated key — it's shown once, treat it like a password

Pass the key with every request as:

```
Authorization: users API-Key <YOUR_KEY>
```

The literal string `users API-Key` is required — `users` is the collection slug, `API-Key` is the auth strategy. There's a space between them and then your key.

API keys do not expire. Revoke them by clearing the field in the admin panel and saving.

## Creating a post via REST

Posts require a `cover` (media ID), so a typical flow is two requests: upload the cover image, then create the post pointing at it.

### Step 1: Upload cover image

```bash
curl -X POST "https://your-site.com/api/media" \
  -H "Authorization: users API-Key YOUR_KEY" \
  -F "file=@/path/to/cover.jpg" \
  -F 'alt=Aerial view of the new park' \
  -F 'caption=December 2024'
```

The response includes the new media document's `id` and `cloudinaryUrl`:

```json
{
  "doc": {
    "id": 42,
    "alt": "Aerial view of the new park",
    "filename": "cover.jpg",
    "cloudinaryUrl": "https://res.cloudinary.com/your-cloud/image/upload/folder/cover.jpg",
    ...
  }
}
```

Save the `id`.

### Step 2: Create the post

```bash
curl -X POST "https://your-site.com/api/posts" \
  -H "Authorization: users API-Key YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Our new park opens to the public",
    "slug": "new-park-opens",
    "cover": 42,
    "excerpt": "After three years of construction, the park welcomes its first visitors.",
    "content": {
      "root": {
        "type": "root",
        "format": "",
        "indent": 0,
        "version": 1,
        "direction": "ltr",
        "children": [
          {
            "type": "paragraph",
            "format": "",
            "indent": 0,
            "version": 1,
            "direction": "ltr",
            "children": [
              { "type": "text", "text": "First paragraph here.", "format": 0, "detail": 0, "mode": "normal", "style": "", "version": 1 }
            ]
          }
        ]
      }
    },
    "publishedAt": "2026-05-17T12:00:00.000Z",
    "status": "published"
  }'
```

The `content` field is Lexical JSON. See `references/seeding.md` and the helper functions in `payload.config.ts` for the node structures (paragraph, heading, list, link).

## Querying posts

Read endpoints don't require auth (the `read` access on Posts allows public reads of `status=published`):

```bash
# All published posts, paginated
curl "https://your-site.com/api/posts?where[status][equals]=published&sort=-publishedAt&limit=12&page=1"

# Single post by slug, with cover populated
curl "https://your-site.com/api/posts?where[slug][equals]=new-park-opens&depth=1&limit=1"
```

`depth=1` populates the `cover` relationship inline so you get the media doc (with `cloudinaryUrl`) instead of just its ID.

## Updating and deleting

```bash
# Update (PATCH a single field)
curl -X PATCH "https://your-site.com/api/posts/<id>" \
  -H "Authorization: users API-Key YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "status": "draft" }'

# Delete
curl -X DELETE "https://your-site.com/api/posts/<id>" \
  -H "Authorization: users API-Key YOUR_KEY"
```

## GraphQL alternative

```bash
curl -X POST "https://your-site.com/api/graphql" \
  -H "Authorization: users API-Key YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createPost(data: { title: \"X\", slug: \"x\", cover: 42, content: {...}, status: published, publishedAt: \"2026-05-17T12:00:00Z\" }) { id } }"
  }'
```

For complex content with rich text, REST + JSON is usually easier than escaping a multi-line GraphQL string.

## Calling from Node.js / JavaScript

```js
const FormData = require("form-data");
const fs = require("fs");

const SITE = "https://your-site.com";
const KEY = process.env.PAYLOAD_API_KEY;

async function createPost({ title, slug, excerpt, content, coverPath, alt, caption }) {
  // 1. upload cover
  const form = new FormData();
  form.append("file", fs.createReadStream(coverPath));
  form.append("alt", alt);
  if (caption) form.append("caption", caption);

  const mediaRes = await fetch(`${SITE}/api/media`, {
    method: "POST",
    headers: { Authorization: `users API-Key ${KEY}` },
    body: form,
  });
  const { doc: media } = await mediaRes.json();

  // 2. create post
  const postRes = await fetch(`${SITE}/api/posts`, {
    method: "POST",
    headers: {
      Authorization: `users API-Key ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      slug,
      cover: media.id,
      excerpt,
      content,
      publishedAt: new Date().toISOString(),
      status: "published",
    }),
  });
  return postRes.json();
}
```

## Building Lexical content programmatically

The seed file's helper functions (`text`, `p`, `h2`, `ul`, `link`, `doc`) can be copied into any Node.js automation script. They produce the exact JSON shape Payload expects for the `content` field. This is far easier than writing the Lexical nodes by hand from an external service.

## CORS

The default config in `payload.config.ts` allows `*` for CORS so server-to-server calls work out of the box. To tighten:

```ts
const allowedOrigins = [
  process.env.NEXT_PUBLIC_SERVER_URL,
  "http://localhost:3000",
  "https://your-agent.example.com",
];
```

Server-to-server calls (no browser) ignore CORS entirely — restrict only if you're worried about a browser-based attacker calling your API from another origin.

## Rate limiting

Payload doesn't rate-limit by default. If you expose the API publicly to AI agents, add a reverse proxy (Cloudflare, nginx) or use Payload's `rateLimit` config option:

```ts
rateLimit: {
  max: 100,           // requests
  window: 15 * 60 * 1000, // per 15 min
  trustProxy: true,
}
```

## Webhooks (for downstream consumers)

If another service needs to know when a new post is published, add an `afterChange` hook to Posts:

```ts
hooks: {
  afterChange: [
    async ({ doc, operation }) => {
      if (operation === "create" && doc.status === "published") {
        await fetch("https://your-webhook.example.com/new-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: doc.id, slug: doc.slug, title: doc.title }),
        });
      }
    },
  ],
},
```
