import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionConfig, FieldHook } from "payload";
import { revalidatePath } from "next/cache";

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const ensureSlug: FieldHook = ({ value, data }) => {
  if (typeof value === "string" && value.length > 0) return slugify(value);
  if (data?.title) return slugify(String(data.title));
  return value;
};

// Invalida o cache ISR sempre que um post é criado, atualizado ou excluído.
// Sem isso, /blog/[slug] (revalidate=3600) continua servindo o HTML antigo até
// expirar 1h ou ocorrer um redeploy. /blog (listing) é force-dynamic e já reflete na hora.
const revalidateBlog: CollectionAfterChangeHook = ({ doc, previousDoc }) => {
  try {
    revalidatePath("/blog");
    if (doc?.slug) revalidatePath(`/blog/${doc.slug}`);
    if (previousDoc?.slug && previousDoc.slug !== doc?.slug) {
      revalidatePath(`/blog/${previousDoc.slug}`);
    }
  } catch {
    // contextos fora do Next runtime (scripts CLI) — ignora
  }
  return doc;
};

const revalidateBlogAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  try {
    revalidatePath("/blog");
    if (doc?.slug) revalidatePath(`/blog/${doc.slug}`);
  } catch {
    // ignore
  }
  return doc;
};

export const Posts: CollectionConfig = {
  slug: "posts",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "status", "publishedAt"],
  },
  hooks: {
    afterChange: [revalidateBlog],
    afterDelete: [revalidateBlogAfterDelete],
  },
  access: {
    read: ({ req: { user } }) => {
      if (user) return true;
      return {
        status: { equals: "published" },
      };
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    { name: "title", type: "text", required: true, label: "Title" },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: { position: "sidebar" },
      hooks: { beforeValidate: [ensureSlug] },
    },
    {
      name: "cover",
      type: "upload",
      relationTo: "media",
      required: true,
      label: "Cover image",
    },
    {
      name: "excerpt",
      type: "textarea",
      required: false,
      maxLength: 280,
      label: "Excerpt (up to 280 chars)",
    },
    {
      name: "content",
      type: "richText",
      required: true,
      label: "Content",
    },
    {
      name: "publishedAt",
      type: "date",
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: { position: "sidebar", date: { pickerAppearance: "dayAndTime" } },
      label: "Published at",
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
      admin: { position: "sidebar" },
    },
  ],
};
