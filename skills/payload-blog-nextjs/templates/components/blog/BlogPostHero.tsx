import Image from "next/image";

type Props = {
  title: string;
  publishedAt: string;
  cover: { url: string; alt: string; cloudinaryUrl?: string | null; sizes?: { full?: { url: string } } };
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("{{LOCALE}}", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

export default function BlogPostHero({ title, publishedAt, cover }: Props) {
  const src = cover.cloudinaryUrl ?? cover.sizes?.full?.url ?? cover.url;
  return (
    <header className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
      <Image
        src={src}
        alt={cover.alt}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-white">
          <p className="text-sm font-medium opacity-90">{formatDate(publishedAt)}</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl">
            {title}
          </h1>
        </div>
      </div>
    </header>
  );
}
