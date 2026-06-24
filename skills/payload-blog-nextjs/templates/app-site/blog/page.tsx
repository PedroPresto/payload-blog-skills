import type { Metadata } from "next";
import BlogList from "@/components/blog/BlogList";
import { getPayloadInstance } from "@/lib/payload";

// force-dynamic: a listagem do blog deve sempre buscar fresh do Neon.
// ISR aqui causa race condition: a página pode ser gerada antes do onInit
// terminar de semear posts, servindo cache vazio.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog | {{SITE_TITLE}}",
  description: "{{SITE_DESCRIPTION}}",
};

const PAGE_SIZE = 12;

type SearchParams = { page?: string };

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  let posts: {
    slug: string;
    title: string;
    excerpt: string | null;
    publishedAt: string;
    cover: { url: string; alt: string; cloudinaryUrl?: string | null; sizes?: { card?: { url: string } } };
  }[] = [];
  let totalPages = 1;

  try {
    const payload = await getPayloadInstance();
    const result = await payload.find({
      collection: "posts",
      where: {
        and: [
          { status: { equals: "published" } },
          { publishedAt: { less_than_equal: new Date().toISOString() } },
        ],
      },
      sort: "-publishedAt",
      limit: PAGE_SIZE,
      page,
      depth: 1,
    });

    posts = result.docs.map((doc) => ({
      slug: doc.slug as string,
      title: doc.title as string,
      excerpt: (doc.excerpt as string | null | undefined) ?? null,
      publishedAt: doc.publishedAt as string,
      cover: doc.cover as { url: string; alt: string; cloudinaryUrl?: string | null; sizes?: { card?: { url: string } } },
    }));
    totalPages = result.totalPages;
  } catch {
    // DB indisponível no build — renderiza vazio, recupera no próximo request
  }

  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold sm:text-5xl">Blog</h1>
        </header>
        <BlogList posts={posts} page={page} totalPages={totalPages} />
      </div>
    </section>
  );
}
