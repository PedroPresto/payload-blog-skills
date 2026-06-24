import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import sharp from "sharp";

import { Users } from "./collections/Users";
import { Media } from "./collections/Media";
import { Posts } from "./collections/Posts";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// ─── Lexical helpers ────────────────────────────────────────────────────────
// Build rich text content for seed posts without hand-writing the Lexical node tree.

type N = Record<string, unknown>;
const text = (t: string): N => ({ type: "text", text: t, format: 0, detail: 0, mode: "normal", style: "", version: 1 });
const p = (...children: N[]): N => ({ type: "paragraph", format: "", indent: 0, version: 1, direction: "ltr", children });
const h2 = (t: string): N => ({ type: "heading", tag: "h2", format: "", indent: 0, version: 1, direction: "ltr", children: [text(t)] });
const h3 = (t: string): N => ({ type: "heading", tag: "h3", format: "", indent: 0, version: 1, direction: "ltr", children: [text(t)] });
const ul = (items: string[]): N => ({ type: "list", listType: "bullet", tag: "ul", start: 1, format: "", indent: 0, version: 1, direction: "ltr", children: items.map((item, i) => ({ type: "listitem", value: i + 1, format: "", indent: 0, version: 1, direction: "ltr", children: [text(item)] })) });
const link = (label: string, url: string): N => ({ type: "link", format: "", indent: 0, version: 3, direction: "ltr", fields: { linkType: "custom", newTab: true, url }, children: [text(label)] });
const doc = (children: N[]) => ({ root: { type: "root", format: "", indent: 0, version: 1, direction: "ltr", children } });

// ─── Seed data ──────────────────────────────────────────────────────────────
// Add initial posts here. Cover image paths are relative to the project root
// (typically public/covers/<filename>). Images get uploaded to Cloudinary on first boot.

type SeedPost = {
  cover: { file: string; mime: string; alt: string; caption: string };
  title: string;
  slug: string;
  excerpt: string;
  content: ReturnType<typeof doc>;
};

const SEED_POSTS: SeedPost[] = [
  // Example — replace or extend:
  // {
  //   cover: { file: "public/covers/example.jpg", mime: "image/jpeg", alt: "...", caption: "..." },
  //   title: "Hello World",
  //   slug: "hello-world",
  //   excerpt: "Short summary up to 280 chars.",
  //   content: doc([
  //     p(text("First paragraph.")),
  //     h2("A section"),
  //     ul(["bullet one", "bullet two"]),
  //     p(text("More text with a "), link("link", "https://example.com"), text(".")),
  //   ]),
  // },
];

// ─── onInit seed ────────────────────────────────────────────────────────────
// Runs once on each boot. Skips if posts already exist (empty array OK).
// Each cover image is uploaded to Cloudinary via the Media beforeChange hook.

async function seedIfEmpty(payload: import("payload").Payload) {
  try {
    const existing = await payload.find({ collection: "posts", limit: 1 });
    if (existing.totalDocs > 0) return;

    for (const seed of SEED_POSTS) {
      const imagePath = path.resolve(dirname, seed.cover.file);
      if (!fs.existsSync(imagePath)) continue;

      const media = await payload.create({
        collection: "media",
        data: { alt: seed.cover.alt, caption: seed.cover.caption },
        file: {
          data: fs.readFileSync(imagePath),
          mimetype: seed.cover.mime,
          name: path.basename(seed.cover.file),
          size: fs.statSync(imagePath).size,
        },
      });

      await payload.create({
        collection: "posts",
        data: {
          title: seed.title,
          slug: seed.slug,
          cover: media.id,
          excerpt: seed.excerpt,
          content: seed.content as never,
          publishedAt: new Date().toISOString(),
          status: "published",
        },
      });
    }
  } catch (err) {
    payload.logger.error({ err }, "Seed failed");
  }
}

// ─── Config ─────────────────────────────────────────────────────────────────

// CORS: domains allowed to call Payload's REST/GraphQL APIs from a browser.
// Defaults to: site URL + localhost + a wildcard for external agents.
// Tighten this list in production (replace "*" with only the origins you trust).
const allowedOrigins = [
  process.env.NEXT_PUBLIC_SERVER_URL,
  "http://localhost:3000",
  "*", // allows server-to-server calls and external agents — restrict if exposing sensitive data
].filter(Boolean) as string[];

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: { titleSuffix: " — {{SITE_TITLE}}" },
  },
  cors: allowedOrigins,
  csrf: allowedOrigins,
  collections: [Users, Media, Posts],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI,
    },
  }),
  sharp,
  onInit: async (payload) => {
    await seedIfEmpty(payload);
  },
});
