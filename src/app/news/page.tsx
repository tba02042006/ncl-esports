import Link from "next/link";
import { loadPublicLeague } from "@/lib/public-data";
import { PublishedNews } from "@/components/published-content";
import { copy, text } from "@/lib/data";
export const dynamic = "force-dynamic";
export default async function NewsIndex({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang: requested } = await searchParams;
  const lang = requested === "ru" || requested === "en" ? requested : "uz";
  const league = await loadPublicLeague();
  return (
    <main lang={lang} className="container inner-page">
      <div className="article-nav">
        <Link href={`/?lang=${lang}`} className="eyebrow">
          ← NCL / {text("BOSH SAHIFA", "ГЛАВНАЯ", "HOME")[lang]}
        </Link>
        <div>
          {["uz", "ru", "en"].map((l) => (
            <Link key={l} href={`?lang=${l}`} hrefLang={l}>
              {l.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>
      <h1 className="page-title">{copy.news[lang]}</h1>
      {league.news.length ? (
        <PublishedNews articles={league.news} lang={lang} />
      ) : (
        <p className="empty-result">
          {
            text(
              "Hali yangiliklar e’lon qilinmagan.",
              "Новостей пока нет.",
              "No articles published yet.",
            )[lang]
          }
        </p>
      )}
    </main>
  );
}
