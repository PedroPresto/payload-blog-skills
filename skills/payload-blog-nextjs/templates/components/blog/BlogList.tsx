import Link from "next/link";
import BlogCard, { type BlogCardPost } from "./BlogCard";

type Props = {
  posts: BlogCardPost[];
  page: number;
  totalPages: number;
};

export default function BlogList({ posts, page, totalPages }: Props) {
  if (posts.length === 0) {
    return (
      <p className="py-16 text-center text-gray-500">
        No posts published yet.
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogCard key={post.slug} post={post} />
        ))}
      </div>

      {totalPages > 1 ? (
        <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Pagination">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={p === 1 ? "/blog" : `/blog?page=${p}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                p === page
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
