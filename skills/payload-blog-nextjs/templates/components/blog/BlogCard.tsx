import Image from "next/image";
import Link from "next/link";

type Media = { url: string; alt: string; cloudinaryUrl?: string | null; sizes?: { card?: { url: string } } };

export type BlogCardPost = {
  slug: string;
  title: string;
  excerpt?: string | null;
  publishedAt: string;
  cover: Media;
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("{{LOCALE}}", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

export default function BlogCard({ post }: { post: BlogCardPost }) {
  const src = post.cover.cloudinaryUrl ?? post.cover.sizes?.card?.url ?? post.cover.url;
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <Image
          src={src}
          alt={post.cover.alt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition group-hover:scale-105"
        />
      </div>
      <div className="p-5">
        <p className="text-sm text-gray-500">{formatDate(post.publishedAt)}</p>
        <h3 className="mt-2 text-xl font-bold text-gray-900">{post.title}</h3>
        {post.excerpt ? (
          <p className="mt-2 line-clamp-3 text-gray-600">{post.excerpt}</p>
        ) : null}
        <span className="mt-4 inline-block font-semibold text-blue-600 group-hover:underline">
          Read more →
        </span>
      </div>
    </Link>
  );
}
