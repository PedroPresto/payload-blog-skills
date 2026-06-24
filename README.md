# payload-blog-skills

Two [Claude Code](https://code.claude.com) skills for running a blog on **Payload CMS + Next.js**, packaged as a single installable plugin.

| Skill | What it does |
|-------|--------------|
| **`payload-blog-nextjs`** | Scaffolds a production-ready blog into a Next.js (App Router) site: Payload CMS 3.x, Neon PostgreSQL, Cloudinary media storage, route-group-separated layouts, ISR + force-dynamic tuning, automatic seeding, and a REST/GraphQL API ready for external automation. |
| **`post-to-blog`** | Drafts GEO/SEO-optimized posts and publishes them to any site built with `payload-blog-nextjs`, uploading the cover to Cloudinary and creating the post via the Payload REST API in one shot. |

The two are designed to work together: `payload-blog-nextjs` builds the blog, `post-to-blog` fills it with content. Each also stands on its own.

No credentials are bundled. `post-to-blog` reads per-site API keys from `~/.claude/blogs.json` (outside the skill), so the skills stay portable while your keys stay private.

## Install

### As a Claude Code plugin

```
/plugin marketplace add PedroPresto/payload-blog-skills
/plugin install payload-blog-skills
```

### Via the skills CLI ([skills.sh](https://skills.sh))

```
npx skills add PedroPresto/payload-blog-skills
```

### Manually

Copy the skill folders into your user skills directory:

```bash
cp -r skills/payload-blog-nextjs ~/.claude/skills/
cp -r skills/post-to-blog        ~/.claude/skills/
```

## Configure credentials (for `post-to-blog`)

Create `~/.claude/blogs.json` with one entry per blog:

```json
{
  "blogs": {
    "my-blog": {
      "url": "https://myblog.com",
      "apiKey": "REPLACE_WITH_YOUR_PAYLOAD_API_KEY"
    }
  }
}
```

Get the API key from each site's `/admin`: log in, open your user profile, enable **API Key**, save, and copy the generated value. The site's Users collection must have `auth: { useAPIKey: true }` — which is the default in `payload-blog-nextjs`.

See [`skills/post-to-blog/templates/blogs.example.json`](skills/post-to-blog/templates/blogs.example.json) for the full format.

## Requirements

- **`payload-blog-nextjs`** — a Next.js (App Router, TypeScript) project, plus provisioned Neon and Cloudinary accounts.
- **`post-to-blog`** — Node.js ≥ 18 (uses native `fetch`/`FormData`) and a `~/.claude/blogs.json` entry for the target blog.

## License

[MIT](LICENSE)
