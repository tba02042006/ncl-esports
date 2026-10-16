import Link from "next/link";
import { formatUzt } from "@/lib/format";
import { ArrowUpRight } from "lucide-react";
import { text, type Language } from "@/lib/data";
import type { PublicSponsor, PublicNews } from "@/lib/public-snapshot";
export function OfficialPartners({
  partners,
  lang,
  compact = false,
}: {
  partners: PublicSponsor[];
  lang: Language;
  compact?: boolean;
}) {
  const labels = {
    title: text("Bosh hamkor", "Титульный партнёр", "Title partner"),
    official: text("Rasmiy hamkor", "Официальный партнёр", "Official partner"),
    technology: text(
      "Texnik hamkor",
      "Технический партнёр",
      "Technology partner",
    ),
    community: text(
      "Hamjamiyat hamkori",
      "Партнёр сообщества",
      "Community partner",
    ),
  };
  return (
    <div className={`official-partners ${compact ? "compact" : ""}`}>
      {partners.map((p) => (
        <article className={`official-partner tier-${p.tier}`} key={p.id}>
          <span className="eyebrow">
            {labels[p.tier as keyof typeof labels][lang]}
          </span>
          {p.banner && !compact && (
            <div className="official-partner-banner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.banner} alt="" />
            </div>
          )}
          {p.logo && (
            <div className="official-partner-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.logo} alt={p.name[lang]} loading="lazy" />
            </div>
          )}
          <h2>{p.name[lang]}</h2>
          {!compact && <p className="preserve-lines">{p.description[lang]}</p>}
          {p.website && (
            <a
              href={p.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              {text("Hamkor sayti", "Сайт партнёра", "Partner website")[lang]}
              <ArrowUpRight size={16} />
            </a>
          )}
        </article>
      ))}
    </div>
  );
}
export function PublishedNews({
  articles,
  lang,
}: {
  articles: PublicNews[];
  lang: Language;
}) {
  return (
    <div className="published-news">
      {articles.map((a) => (
        <Link
          href={`/news/${a.slug}?lang=${lang}`}
          className="news-card published-news-card"
          key={a.id}
        >
          {a.cover ? (
            <div className="news-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.cover} alt="" loading="lazy" />
            </div>
          ) : (
            <div className="news-art">
              <span>
                NCL
                <br />
                NEWS
              </span>
              <small>NATIONAL CYBER LEAGUE</small>
            </div>
          )}
          <div className="news-copy">
            <span className="eyebrow">NCL / {formatUzt(a.publishedAt)}</span>
            <h3>
              {a.name[lang]}
              <ArrowUpRight size={20} />
            </h3>
            <p>
              {a.body[lang].slice(0, 180)}
              {a.body[lang].length > 180 ? "…" : ""}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
