# Writing seed posts

The `payload.config.ts` template includes Lexical helper functions for building rich text without hand-writing the node tree. Use them to author seed posts inline.

## Available helpers

```ts
text(t)            // plain text run
p(...children)     // paragraph
h2(t)              // heading level 2
h3(t)              // heading level 3
ul(items)          // unordered list (items: string[])
link(label, url)   // external link
doc(children)      // top-level Lexical root (wraps the whole post body)
```

Children passed to `p()` can mix text runs and links:
```ts
p(text("Visit "), link("our site", "https://example.com"), text(" for more."))
```

## Full seed post example

```ts
{
  cover: {
    file: "public/covers/example.jpg",
    mime: "image/jpeg",
    alt: "Aerial view of the new park",
    caption: "Aerial view, December 2024",
  },
  title: "Our new park opens to the public",
  slug: "new-park-opens",  // optional — auto-generated from title if omitted, but explicit slugs are SEO-better
  excerpt: "After three years of construction, the park welcomes its first visitors this weekend.",
  content: doc([
    p(text("After three years of construction, the park officially opens this Saturday.")),
    h2("What's inside"),
    p(text("The 50-acre site features walking trails, a playground, and a lake.")),
    h3("Accessibility"),
    ul([
      "All paths are wheelchair accessible",
      "Tactile maps at every entrance",
      "Audio guides via QR codes",
    ]),
    p(text("Read the full announcement at "), link("the city website", "https://city.example.com/announcement"), text(".")),
  ]),
}
```

## GEO/SEO patterns

For posts targeting AI-generated answers and search:
- **Title**: include the geographic qualifier and the exact phrase users would search ("Adaptive surfing in Florianópolis: how to start")
- **Slug**: kebab-case version of the key search phrase
- **Excerpt**: 1-2 sentences that directly answer the implied question, with the location named explicitly
- **First paragraph**: restate the core fact (Wikipedia-style lead). LLMs index opening paragraphs heavily
- **H2 sections**: questions a user would actually type ("Who can participate", "How to sign up")
- **Bullets**: short, factual, parallel structure — great for snippet extraction
- **Outbound link**: at least one authoritative external link strengthens topical relevance

## Cover image requirements

- Place files under `public/covers/<filename>.<ext>` before deploy
- Recommended size: 1600×900 (16:9) for hero, 800×500 for cards
- Formats: JPEG, PNG, or WebP (PNG only for transparent logos — converts to bigger files on Cloudinary)
- File names become Cloudinary `public_id` minus extension — avoid spaces, use kebab-case
- The `alt` text must describe the image for accessibility AND screen readers; don't repeat the title

## Updating an already-seeded site

The seed only runs when `posts` is empty. To re-seed:
1. Connect to Neon SQL editor
2. Run `DELETE FROM posts; DELETE FROM media;`
3. Restart the deployment (commit + push, or click "Restart" in Hostinger panel)
4. `onInit` runs again with the updated seed array

Don't manipulate Cloudinary directly — let Payload's `beforeChange` hook handle the upload so the `cloudinaryUrl` field stays in sync.
