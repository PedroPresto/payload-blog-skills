# Simplified content schema

The `content` field in the post JSON is an **array of nodes**. The post script (`scripts/post.js`) converts each node into Lexical JSON before sending to Payload. You write the simple version; the script handles the verbose version.

## Node types

### Paragraph (`p`)

Plain text:
```json
{ "type": "p", "text": "A paragraph of text." }
```

Mixed runs (for links and inline formatting):
```json
{
  "type": "p",
  "runs": [
    { "text": "Visit " },
    { "type": "link", "url": "https://example.com", "text": "example" },
    { "text": " for more details." }
  ]
}
```

Inline formatting in a run:
```json
{ "text": "important", "bold": true }
{ "text": "emphasis", "italic": true }
{ "text": "deleted", "strike": true }
{ "text": "underlined", "underline": true }
```

You can combine: `{ "text": "very important", "bold": true, "italic": true }`.

### Heading (`h2`, `h3`, `h4`)

```json
{ "type": "h2", "text": "Section title" }
{ "type": "h3", "text": "Subsection title" }
```

Don't use h1 — that's reserved for the post title which Payload sets automatically.

### Unordered list (`ul`)

```json
{ "type": "ul", "items": [
  "First item",
  "Second item",
  "Third item"
]}
```

Items with inline formatting (rare, usually plain strings work):
```json
{ "type": "ul", "items": [
  { "runs": [{ "text": "Item with " }, { "type": "link", "url": "...", "text": "a link" }] }
]}
```

### Ordered list (`ol`)

Same as `ul` but numbered:
```json
{ "type": "ol", "items": ["Step 1", "Step 2", "Step 3"] }
```

### Blockquote (`quote`)

```json
{ "type": "quote", "text": "A pulled quote." }
```

### Horizontal rule (`hr`)

```json
{ "type": "hr" }
```

## Full content array example

```json
{
  "content": [
    { "type": "p", "text": "Opening paragraph." },
    { "type": "h2", "text": "First section" },
    { "type": "p", "text": "Section intro." },
    { "type": "ul", "items": ["one", "two", "three"] },
    { "type": "h3", "text": "Subsection" },
    { "type": "p", "text": "More text." },
    { "type": "hr" },
    { "type": "quote", "text": "An aside." },
    { "type": "p", "runs": [
      { "text": "Closing with a " },
      { "type": "link", "url": "https://example.com", "text": "call to action" },
      { "text": "." }
    ]}
  ]
}
```

## What's NOT supported (yet)

- Inline images inside paragraphs — use multiple posts or the cover for now
- Tables — Lexical supports them but the script doesn't have a converter
- Embedded videos — same
- Code blocks — same
- Nested lists — same

If you need these, edit the post in the admin panel after creation, or extend `scripts/post.js` `buildNode` switch statement.

## Why a simplified schema instead of raw Lexical?

Raw Lexical JSON is ~40 lines for a simple post. The simplified format is ~10. The simplified format is also easier for a language model to generate correctly — every Lexical node has 7+ required fields with magic numbers (`version: 1`, `direction: "ltr"`, etc.) that are easy to get wrong. The script knows the magic numbers; you don't have to.
