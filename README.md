<div align="center">

# 📝 payload-blog-skills

**Run a blog on autopilot — scaffold it, then publish SEO/GEO-optimized posts with auto-generated covers, all from natural language.**

Two [Claude Code](https://code.claude.com) skills packaged as one installable plugin.

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-da7756.svg)](https://code.claude.com)
[![skills.sh](https://img.shields.io/badge/skills.sh-installable-000.svg)](https://skills.sh)
[![Skills](https://img.shields.io/badge/skills-2-blue.svg)](#whats-inside)
[![Payload CMS](https://img.shields.io/badge/Payload%20CMS-3.x-000.svg)](https://payloadcms.com)
[![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black.svg)](https://nextjs.org)
[![GitHub stars](https://img.shields.io/github/stars/PedroPresto/payload-blog-skills?style=social)](https://github.com/PedroPresto/payload-blog-skills/stargazers)

</div>

---

## ✨ What it does

> _"Post an article about adaptive surfing in Florianópolis to my-blog."_

That single sentence is the whole workflow. The skill drafts the post, **optimizes it for SEO and AI search engines (GEO)**, **generates a cover image automatically**, uploads it to Cloudinary, and publishes through the Payload REST API — then hands you the live URL. No CMS clicking, no copy-paste, no image hunting.

### 🤖 Automated, SEO/GEO-optimized publishing

Every post is structured to rank on Google **and** get cited by ChatGPT, Claude, Gemini, and Perplexity — Generative Engine Optimization baked in, not bolted on:

- **Titles & slugs** in the `<specific noun phrase>: <question hook>` pattern that matches real search queries
- **Excerpts** written like a Wikipedia lead — the exact chunk LLMs quote
- **H2s as questions** ("Who can participate?", "How to sign up") that map to user intent and Google's "People also ask"
- **Snippet-ready bullets**, authoritative outbound links, and internal cross-linking
- **Locale-aware** (accents, regional terms, city/state qualifiers) for non-English sites
- **Open Graph** tags auto-generated for clean social/LLM previews

### 🖼️ Automatic cover image generation

Don't have a cover? You don't need one. When you don't supply an image, the skill **creates one for you** — generating a relevant 1600×900 hero via an AI image tool in the session, or sourcing a fitting free image — then uploads it to Cloudinary's CDN with proper `alt`/caption metadata. Supply your own path or URL anytime to override.

---

## 🧩 What's inside

| Skill | What it does |
|-------|--------------|
| **`payload-blog-nextjs`** | One-shot scaffolding of a production blog into a Next.js (App Router) site: Payload CMS 3.x, Neon PostgreSQL, Cloudinary media, route-group-separated layouts, ISR + force-dynamic tuning, automatic seeding, and a REST/GraphQL API ready for automation. Battle-tested against the subtle Payload 3.x + App Router quirks that break production builds. |
| **`post-to-blog`** | The automated publisher above: drafts GEO/SEO-optimized content, auto-generates the cover, uploads to Cloudinary, and publishes via the Payload REST API — in one shot. |

They pair up — `payload-blog-nextjs` builds the blog, `post-to-blog` keeps it fed — and each works standalone.

> 🔒 **No credentials are bundled.** `post-to-blog` reads per-site API keys from `~/.claude/blogs.json` (outside the skill), so the skills stay portable while your keys stay private.

---

## 🚀 Install

### As a Claude Code plugin
```
/plugin marketplace add PedroPresto/payload-blog-skills
/plugin install payload-blog-skills
```

### Via the skills CLI ([skills.sh](https://skills.sh))
```bash
npx skills add PedroPresto/payload-blog-skills                 # both skills
npx skills add PedroPresto/payload-blog-skills/post-to-blog    # just the publisher
```

### Manually
```bash
cp -r skills/payload-blog-nextjs ~/.claude/skills/
cp -r skills/post-to-blog        ~/.claude/skills/
```

---

## ⚙️ Configure credentials (for `post-to-blog`)

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

Get the API key from each site's `/admin`: log in → open your user profile → enable **API Key** → save → copy. The site's Users collection needs `auth: { useAPIKey: true }` — the default in `payload-blog-nextjs`.

See [`skills/post-to-blog/templates/blogs.example.json`](skills/post-to-blog/templates/blogs.example.json) for the full format.

---

## 💡 Example

Once a blog is set up and its key is in `blogs.json`, just ask:

> _"Write and publish a post for `my-blog` about inclusive canoeing in Brasília — target keyword 'canoagem inclusiva', and make a cover for it."_

Claude drafts it, optimizes the title/excerpt/H2s for SEO + GEO, generates the cover, and runs:

```bash
node ~/.claude/skills/post-to-blog/scripts/post.js --blog my-blog --post /tmp/post.json
```

```
→ Uploading cover: canoagem-inclusiva-brasilia.jpg
✓ Cover uploaded as media #42
→ Creating new post (slug: canoagem-inclusiva-brasilia)
✓ Post created: #17
  Status: published
  Live at: https://myblog.com/blog/canoagem-inclusiva-brasilia
```

Need to tweak it later? Re-run with `--update` (PATCHes by slug). Want to schedule? Set `"status": "draft"` with a future `publishedAt`.

---

## 📋 Requirements

- **`payload-blog-nextjs`** — a Next.js (App Router, TypeScript) project + provisioned [Neon](https://neon.tech) and [Cloudinary](https://cloudinary.com) accounts.
- **`post-to-blog`** — Node.js ≥ 18 (native `fetch`/`FormData`) and a `~/.claude/blogs.json` entry for the target blog.

---

## 📄 License

[MIT](LICENSE) © Pedro Presto
