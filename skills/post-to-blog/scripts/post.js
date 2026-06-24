#!/usr/bin/env node
/**
 * post.js — publish a blog post to a Payload-CMS-backed Next.js site.
 *
 * Usage:
 *   node post.js --blog <name> --post <path-to-post.json> [--update] [--media-id <id>]
 *
 * Requires Node 18+ (uses global fetch, FormData, Blob).
 *
 * Credentials are read from ~/.claude/blogs.json. See SKILL.md for the format.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

// ─── arg parsing (minimal, no deps) ─────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (!args.blog || !args.post) {
  console.error(
    "Usage: node post.js --blog <name> --post <path> [--update] [--media-id <id>] [--status <draft|published>]"
  );
  process.exit(1);
}

// ─── load blog credentials ──────────────────────────────────────────────────

const credPath = path.join(os.homedir(), ".claude", "blogs.json");
if (!fs.existsSync(credPath)) {
  console.error(`Credentials file not found: ${credPath}`);
  console.error("Create it with the format from SKILL.md.");
  process.exit(2);
}

const creds = JSON.parse(fs.readFileSync(credPath, "utf-8"));
const blog = creds.blogs?.[args.blog];
if (!blog) {
  console.error(`Blog "${args.blog}" not found in ${credPath}.`);
  console.error(`Available: ${Object.keys(creds.blogs || {}).join(", ") || "(none)"}`);
  process.exit(2);
}

const SITE = blog.url.replace(/\/+$/, ""); // strip trailing slash
const KEY = blog.apiKey;
const AUTH = `users API-Key ${KEY}`;

// ─── load post JSON ─────────────────────────────────────────────────────────

if (!fs.existsSync(args.post)) {
  console.error(`Post file not found: ${args.post}`);
  process.exit(2);
}

const post = JSON.parse(fs.readFileSync(args.post, "utf-8"));

for (const required of ["title", "slug", "content"]) {
  if (!post[required]) {
    console.error(`Post JSON is missing required field: "${required}"`);
    process.exit(3);
  }
}

const status = args.status || post.status || "published";

// ─── Lexical builders ───────────────────────────────────────────────────────
// Converts the simplified content schema into Payload's Lexical JSON.

const textNode = (t, opts = {}) => ({
  type: "text",
  text: t,
  format: opts.format ?? 0, // 1=bold, 2=italic, 4=strike, 8=underline (bitmask)
  detail: 0,
  mode: "normal",
  style: "",
  version: 1,
});

const linkNode = (label, url) => ({
  type: "link",
  format: "",
  indent: 0,
  version: 3,
  direction: "ltr",
  fields: { linkType: "custom", newTab: true, url },
  children: [textNode(label)],
});

function paragraphChildren(node) {
  if (Array.isArray(node.runs)) {
    return node.runs.map((r) => {
      if (r.type === "link") return linkNode(r.text, r.url);
      return textNode(r.text, { format: runFormatBitmask(r) });
    });
  }
  if (typeof node.text === "string") return [textNode(node.text)];
  return [];
}

function runFormatBitmask(run) {
  let mask = 0;
  if (run.bold) mask |= 1;
  if (run.italic) mask |= 2;
  if (run.strike) mask |= 4;
  if (run.underline) mask |= 8;
  return mask;
}

function buildNode(node) {
  switch (node.type) {
    case "p":
    case "paragraph":
      return {
        type: "paragraph",
        format: "",
        indent: 0,
        version: 1,
        direction: "ltr",
        children: paragraphChildren(node),
      };
    case "h2":
    case "h3":
    case "h4":
      return {
        type: "heading",
        tag: node.type,
        format: "",
        indent: 0,
        version: 1,
        direction: "ltr",
        children: [textNode(node.text)],
      };
    case "ul":
    case "ol": {
      const listType = node.type === "ul" ? "bullet" : "number";
      const tag = node.type;
      return {
        type: "list",
        listType,
        tag,
        start: 1,
        format: "",
        indent: 0,
        version: 1,
        direction: "ltr",
        children: (node.items || []).map((item, i) => ({
          type: "listitem",
          value: i + 1,
          format: "",
          indent: 0,
          version: 1,
          direction: "ltr",
          children: typeof item === "string"
            ? [textNode(item)]
            : paragraphChildren({ runs: item.runs || [{ text: String(item) }] }),
        })),
      };
    }
    case "quote":
    case "blockquote":
      return {
        type: "quote",
        format: "",
        indent: 0,
        version: 1,
        direction: "ltr",
        children: [textNode(node.text)],
      };
    case "hr":
    case "horizontal-rule":
      return { type: "horizontalrule", version: 1 };
    default:
      console.warn(`Unknown content node type: "${node.type}" — skipping`);
      return null;
  }
}

function buildLexical(contentArray) {
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children: contentArray.map(buildNode).filter(Boolean),
    },
  };
}

// ─── cover upload ───────────────────────────────────────────────────────────

async function downloadToTemp(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download cover from ${url}: HTTP ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  const ext = path.extname(new URL(url).pathname) || ".jpg";
  const tmpPath = path.join(os.tmpdir(), `cover-${Date.now()}${ext}`);
  fs.writeFileSync(tmpPath, Buffer.from(arrayBuf));
  return tmpPath;
}

function guessMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  }[ext] || "application/octet-stream";
}

async function uploadCover() {
  if (args["media-id"]) {
    console.log(`→ Reusing existing media id ${args["media-id"]}`);
    return Number(args["media-id"]);
  }

  if (!post.cover) {
    throw new Error('Post JSON is missing "cover" (path or URL to image file).');
  }

  let coverPath = post.cover;
  let isTemp = false;

  if (/^https?:\/\//.test(coverPath)) {
    console.log(`→ Downloading cover from ${coverPath}`);
    coverPath = await downloadToTemp(coverPath);
    isTemp = true;
  }

  if (!fs.existsSync(coverPath)) {
    throw new Error(`Cover file not found: ${coverPath}`);
  }

  console.log(`→ Uploading cover: ${coverPath}`);
  const buffer = fs.readFileSync(coverPath);
  const filename = path.basename(coverPath);

  // Payload 3.x expects metadata in a single `_payload` JSON field alongside the file.
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: guessMime(coverPath) }), filename);
  const meta = { alt: post.alt ?? post.title };
  if (post.caption) meta.caption = post.caption;
  form.append("_payload", JSON.stringify(meta));

  const res = await fetch(`${SITE}/api/media`, {
    method: "POST",
    headers: { Authorization: AUTH },
    body: form,
  });

  if (isTemp) fs.unlinkSync(coverPath);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Media upload failed: HTTP ${res.status}\n${body}`);
  }

  const json = await res.json();
  const id = json.doc?.id ?? json.id;
  if (!id) throw new Error(`Media upload succeeded but no id returned: ${JSON.stringify(json)}`);
  console.log(`✓ Cover uploaded as media #${id}`);
  return id;
}

// ─── create / update post ───────────────────────────────────────────────────

async function findExistingPost(slug) {
  const url = `${SITE}/api/posts?where[slug][equals]=${encodeURIComponent(slug)}&limit=1`;
  const res = await fetch(url, { headers: { Authorization: AUTH } });
  if (!res.ok) return null;
  const json = await res.json();
  return json.docs?.[0] ?? null;
}

async function createOrUpdatePost(mediaId) {
  const lexical = buildLexical(post.content);

  const data = {
    title: post.title,
    slug: post.slug,
    cover: mediaId,
    excerpt: post.excerpt ?? "",
    content: lexical,
    publishedAt: post.publishedAt ?? new Date().toISOString(),
    status,
  };

  const existing = args.update ? await findExistingPost(post.slug) : null;

  let res;
  if (existing) {
    console.log(`→ Updating existing post #${existing.id} (slug: ${post.slug})`);
    res = await fetch(`${SITE}/api/posts/${existing.id}`, {
      method: "PATCH",
      headers: { Authorization: AUTH, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } else {
    console.log(`→ Creating new post (slug: ${post.slug})`);
    res = await fetch(`${SITE}/api/posts`, {
      method: "POST",
      headers: { Authorization: AUTH, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Post ${existing ? "update" : "create"} failed: HTTP ${res.status}\n${body}`);
  }

  const json = await res.json();
  const id = json.doc?.id ?? json.id ?? existing?.id;
  return id;
}

// ─── main ───────────────────────────────────────────────────────────────────

(async () => {
  try {
    const mediaId = await uploadCover();
    const postId = await createOrUpdatePost(mediaId);
    const liveUrl = `${SITE}/blog/${post.slug}`;
    console.log(`✓ Post ${args.update ? "updated" : "created"}: #${postId}`);
    console.log(`  Status: ${status}`);
    console.log(`  Live at: ${liveUrl}`);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(4);
  }
})();
