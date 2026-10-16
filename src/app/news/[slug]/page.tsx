import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPublicLeague } from "@/lib/public-data";
import { text } from "@/lib/data";
export const dynamic = "force-dynamic";
export default async function NewsArticle({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const { lang: requested } = await searchParams;
  const lang = requested === "ru" || requested === "en" ? requested : "uz";
  const league = await loadPublicLeague();
  const article = league.news.find((a) => a.slug === slug);
  if (!article) notFound();
  return (
    <main lang={lang} className="container inner-page public-article">
      <div className="article-nav">
        <Link href={`/?lang=${lang}`} className="eyebrow">
          ← NCL / {text("BOSH SAHIFA", "ГЛАВНАЯ", "HOME")[lang]}
        </Link>
        <div>
          {["uz", "ru", "en"].map((l) => (
            <Link
              key={l}
              href={`?lang=${l}`}
              hrefLang={l}
              aria-current={l === lang ? "page" : undefined}
            >
              {l.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>
      <article lang={lang}>
        <span className="eyebrow">
          NCL /{" "}
          {new Date(article.publishedAt).toLocaleDateString(lang, {
            timeZone: "Asia/Tashkent",
          })}
        </span>
        <h1 className="page-title">{article.name[lang]}</h1>
        {article.cover && (
          <div className="article-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.cover} alt="" />
          </div>
        )}
        <div className="article-body preserve-lines">{article.body[lang]}</div>
      </article>
      <Link className="button secondary" href={`/news?lang=${lang}`}>
        {text("Barcha yangiliklar", "Все новости", "All news")[lang]} ↗
      </Link>
    </main>
  );
}
