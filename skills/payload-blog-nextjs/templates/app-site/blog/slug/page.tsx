import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import BlogPostHero from "@/components/blog/BlogPostHero";
import RichTextRenderer from "@/components/blog/RichTextRenderer";
import ShareButtons from "@/components/blog/ShareButtons";
import { getPayloadInstance } from "@/lib/payload";

// Salve este arquivo em app/(site)/blog/[slug]/page.tsx
// O nome "slug" no diretório do skill evita problemas com colchetes no Windows.

export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

async function fetchPost(slug: string) {
  try {
    const payload = await getPayloadInstance();
    const result = await payload.find({
      collection: "posts",
      where: {
        and: [
          { slug: { equals: slug } },
          { status: { equals: "published" } },
        ],
      },
      limit: 1,
      depth: 2,
    });
    return result.docs[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const payload = await getPayloadInstance();
    const result = await payload.find({
      collection: "posts",
      where: { status: { equals: "published" } },
      limit: 1000,
      depth: 0,
    });
    return result.docs.map((doc) => ({ slug: doc.slug as string }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) return { title: "Post not found" };

  const cover = post.cover as { url: string; cloudinaryUrl?: string | null; sizes?: { full?: { url: string } } };
  const ogImage = cover?.cloudinaryUrl ?? cover?.sizes?.full?.url ?? cover?.url;

  return {
    title: `${post.title} | {{SITE_TITLE}}`,
    description: (post.excerpt as string | null) ?? undefined,
    openGraph: {
      title: post.title as string,
      description: (post.excerpt as string | null) ?? undefined,
      images: ogImage ? [{ url: ogImage }] : undefined,
      type: "article",
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) notFound();

  const cover = post.cover as {
    url: string;
    alt: string;
    cloudinaryUrl?: string | null;
    sizes?: { full?: { url: string } };
  };

  return (
    <article>
      <BlogPostHero
        title={post.title as string}
        publishedAt={post.publishedAt as string}
        cover={cover}
      />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <RichTextRenderer content={post.content as never} />

        <footer className="mt-12 flex flex-col gap-6 border-t border-gray-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/blog" className="font-semibold text-blue-600 hover:underline">
            ← Back to blog
          </Link>
          <ShareButtons url={`${SITE}/blog/${slug}`} title={post.title as string} />
        </footer>
      </div>
    </article>
  );
}
