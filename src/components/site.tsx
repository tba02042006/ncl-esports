"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Menu,
  X,
  Trophy,
  Radio,
  Target,
  Shield,
  Users,
  CalendarDays,
  ChevronDown,
  Play,
  Mail,
} from "lucide-react";
import {
  copy,
  config,
  matches,
  teams,
  pages,
  participants,
  text,
  type Language,
  type Page,
  type Match,
  type Team,
  type Localized,
} from "@/lib/data";
function Emblem({
  slot = 0,
  large = false,
}: {
  slot?: number;
  large?: boolean;
}) {
  return (
    <span
      className={`emblem ${large ? "large" : ""}`}
      style={{ "--team-hue": `${(slot * 37) % 360}deg` } as React.CSSProperties}
    >
      <Shield strokeWidth={1.5} />
      <b>{slot ? String(slot).padStart(2, "0") : "N"}</b>
    </span>
  );
}
function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        N<span aria-hidden="true">↗</span>
      </span>
      <span>
        NCL<small>NATIONAL CYBER LEAGUE</small>
      </span>
    </span>
  );
}
export default function Site({ page }: { page: Page }) {
  const lang = useSyncExternalStore(
    subscribeLanguage,
    readLanguage,
    () => "uz" as Language,
  );
  const [menu, setMenu] = useState(false);
  const [selected, setSelected] = useState<Match | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const t = (v: Localized) => v[lang];
  const href = (p: Page) => `${p === "home" ? "/" : `/${p}`}?lang=${lang}`;

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    if (!selected && !team) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setTeam(null);
      }
      if (e.key === "Tab") {
        const nodes = Array.from(
          document.querySelectorAll<HTMLElement>(
            '.modal button, .modal a[href], .modal input, .modal select, .modal [tabindex="0"]',
          ),
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    const previous = document.activeElement as HTMLElement | null;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.querySelector<HTMLButtonElement>(".modal-close")?.focus();
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = before;
      previous?.focus();
    };
  }, [selected, team]);
  function changeLanguage(l: Language) {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", l);
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event("ncl-language"));
  }
  const hero = (
    <section className="hero">
      <div className="hero-grid" />
      <div className="hero-art" aria-hidden="true">
        <div className="orbital" />
        <span className="giant-n">N</span>
        <div className="art-caption">
          NCL / CS2
          <br />
          41°18′ N · 69°16′ E
        </div>
      </div>
      <div className="hero-content">
        <div className="eyebrow">
          <span className="accent-line" />
          {t(copy.eyebrow)}
        </div>
        <h1>
          {t(copy.hero1)}
          <br />
          <em>{t(copy.hero2)}</em>
        </h1>
        <p>{t(copy.intro)}</p>
        <div className="hero-actions">
          <Link href={href("tournaments")} className="button primary">
            {t(copy.explore)}
            <ArrowUpRight size={19} />
          </Link>
          <Link href={href("live")} className="button secondary">
            <Play size={15} />
            {t(copy.watch)}
          </Link>
        </div>
        <div className="hero-foot">
          <span className="cs2-word">
            CS<span>2</span>
          </span>
          <span>COUNTER-STRIKE 2</span>
          <span className="hero-separator" />
          PC · 5V5
        </div>
      </div>
      <div className="hero-index">
        01 — 08 <span>SCROLL TO DISCOVER ↓</span>
      </div>
    </section>
  );
  return (
    <div style={{ "--accent": config.accent } as React.CSSProperties}>
      <header>
        <div className="header-inner">
          <Link href={href("home")} aria-label="NCL home">
            <Brand />
          </Link>
          <nav
            aria-label={t(
              text(
                "Asosiy navigatsiya",
                "Основная навигация",
                "Main navigation",
              ),
            )}
            className={menu ? "open" : ""}
          >
            {pages.slice(0, 7).map((p) => (
              <Link
                key={p.id}
                href={href(p.id)}
                className={page === p.id ? "current" : ""}
                onClick={() => setMenu(false)}
              >
                {t(p.label)}
              </Link>
            ))}
          </nav>
          <div className="header-controls">
            <select
              aria-label="Language / Язык / Til"
              value={lang}
              onChange={(e) => changeLanguage(e.target.value as Language)}
            >
              <option value="uz">UZ</option>
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </select>
            <button
              className="menu-toggle"
              aria-label={menu ? "Close menu" : "Open menu"}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main>
        {page === "home" ? (
          <>
            {hero}
            <div className="ticker">
              <span>COUNTER-STRIKE 2</span>
              <i>✦</i>
              <span>UNIVERSITY ESPORTS</span>
              <i>✦</i>
              <span>UZBEKISTAN</span>
              <i>✦</i>
              <span>THE NEXT GENERATION</span>
              <i>✦</i>
              <span>COUNTER-STRIKE 2</span>
            </div>
            <div className="container">
              <div className="demo-notice">
                <Target size={15} />
                {t(copy.demo)}
              </div>
              <section className="featured">
                <div>
                  <div className="eyebrow">
                    NCL /{" "}
                    {t(
                      text(
                        "MAVSUM PREVYUSI",
                        "ПРЕВЬЮ СЕЗОНА",
                        "SEASON PREVIEW",
                      ),
                    )}
                  </div>
                  <h2>
                    {config.tournamentName}
                    <span className="tag">DEMO</span>
                  </h2>
                  <p>{t(copy.season)}</p>
                  <Link className="text-link" href={href("tournaments")}>
                    {t(copy.details)} <ArrowUpRight size={16} />
                  </Link>
                </div>
                <div className="featured-stats">
                  <div>
                    <Users />
                    <strong>16</strong>
                    <span>{t(copy.teams)}</span>
                  </div>
                  <div>
                    <Trophy />
                    <strong>5V5</strong>
                    <span>{t(copy.discipline)}</span>
                  </div>
                  <div>
                    <Target />
                    <strong>SE</strong>
                    <span>{t(copy.format)}</span>
                  </div>
                </div>
                <Countdown lang={lang} />
              </section>
              <section className="section">
                <SectionHead
                  lang={lang}
                  matchHref={href("matches")}
                  title={t(copy.upcoming)}
                  number="01"
                  link
                />
                <div className="match-grid">
                  {matches
                    .filter((m) => m.status !== "finished")
                    .slice(0, 3)
                    .map((m) => (
                      <MatchCard
                        lang={lang}
                        onSelect={setSelected}
                        key={m.id}
                        match={m}
                      />
                    ))}
                </div>
              </section>
              <section className="section editorial-grid">
                <div>
                  <SectionHead
                    lang={lang}
                    matchHref={href("matches")}
                    title={t(copy.results)}
                    number="02"
                  />
                  {matches.some((m) => m.status === "finished") ? (
                    <div className="results-list">
                      {matches
                        .filter((m) => m.status === "finished")
                        .slice(-3)
                        .map((m) => (
                          <MatchCard
                            lang={lang}
                            onSelect={setSelected}
                            key={m.id}
                            match={m}
                          />
                        ))}
                    </div>
                  ) : (
                    <div className="empty-result">
                      <Trophy size={28} />
                      <p>{t(copy.noResults)}</p>
                      <Link href={href("matches")} className="text-link">
                        {t(copy.allMatches)}
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  )}
                </div>
                <div>
                  <SectionHead
                    lang={lang}
                    matchHref={href("matches")}
                    title={t(copy.news)}
                    number="03"
                  />
                  <Link href={href("about")} className="news-card">
                    <div className="news-art">
                      <span>
                        NEXT
                        <br />
                        GEN<span aria-hidden="true">↗</span>
                      </span>
                      <small>NCL / COMMUNITY</small>
                    </div>
                    <div className="news-copy">
                      <span className="eyebrow">
                        NCL ·{" "}
                        {t(
                          text("LIGA HAQIDA", "О ЛИГЕ", "LEAGUE INTRODUCTION"),
                        )}
                      </span>
                      <h3>
                        {t(copy.newsTitle)}
                        <ArrowUpRight size={22} />
                      </h3>
                      <p>{t(copy.newsBody)}</p>
                    </div>
                  </Link>
                </div>
              </section>
              <section className="partner-strip">
                <span className="eyebrow">{t(pages[6].label)}</span>
                <h2>{t(copy.partners)}</h2>
                <p>{t(copy.partnerBody)}</p>
                <Link href={href("sponsors")} className="text-link">
                  {t(copy.details)}
                  <ArrowUpRight size={17} />
                </Link>
              </section>
            </div>
          </>
        ) : (
          <div className="container inner-page">
            <div className="eyebrow">NATIONAL CYBER LEAGUE / CS2</div>
            <h1 className="page-title">
              {t(pages.find((p) => p.id === page)!.label)}
              <span aria-hidden="true">↗</span>
            </h1>
            <div className="demo-notice">
              <Target size={15} />
              {t(copy.demo)}
            </div>
            {page === "tournaments" && (
              <>
                <section className="tournament-banner">
                  <div>
                    <span className="tag">DEMO / 01</span>
                    <h2>{config.tournamentName}</h2>
                    <p>{t(copy.intro)}</p>
                    <Link href={href("bracket")} className="button primary">
                      {t(pages[4].label)}
                      <ArrowUpRight size={18} />
                    </Link>
                  </div>
                  <Trophy size={130} strokeWidth={0.7} />
                </section>
                <div className="info-grid">
                  <article className="panel">
                    <h2>{t(copy.rules)}</h2>
                    <p>{t(copy.rulesBody)}</p>
                    {config.rulesUrl && (
                      <a href={config.rulesUrl} className="text-link">
                        {t(copy.rules)}
                        <ArrowUpRight size={16} />
                      </a>
                    )}
                  </article>
                  <article className="panel">
                    <CalendarDays />
                    <h2>{t(copy.pending)}</h2>
                    <Countdown lang={lang} />
                  </article>
                </div>
                <div className="stages">
                  {copy.rounds.map((r, i) => (
                    <div key={i}>
                      <span>0{i + 1}</span>
                      <h3>{t(r)}</h3>
                      <p>
                        {i === 3 ? "BO5" : "BO3"} · {16 / 2 ** i}{" "}
                        {t(copy.teams).toLowerCase()}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
            {page === "teams" && (
              <>
                <div className="toolbar">
                  <p>16 {t(copy.placeholder).toLowerCase()}</p>
                  <input
                    aria-label={t(
                      text("Jamoa qidirish", "Поиск команды", "Search teams"),
                    )}
                    placeholder={t(
                      text(
                        "Jamoa qidirish…",
                        "Поиск команды…",
                        "Search teams…",
                      ),
                    )}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <div className="team-grid">
                  {teams
                    .filter((tm) =>
                      t(tm.name).toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((tm) => (
                      <button
                        className="team-card"
                        key={tm.id}
                        onClick={() => setTeam(tm)}
                      >
                        <span className="team-number">
                          NCL / {String(tm.slot).padStart(2, "0")}
                        </span>
                        <Emblem slot={tm.slot} large />
                        <h2>{t(tm.name)}</h2>
                        <p>{t(copy.placeholder)}</p>
                        <span className="text-link">
                          {t(
                            text(
                              "Tarkibni ko‘rish",
                              "Смотреть состав",
                              "View roster",
                            ),
                          )}
                          <ArrowUpRight size={16} />
                        </span>
                      </button>
                    ))}
                </div>
                {teams.filter((tm) =>
                  t(tm.name).toLowerCase().includes(query.toLowerCase()),
                ).length === 0 && (
                  <p className="panel">
                    {t(
                      text(
                        "Jamoa topilmadi",
                        "Команда не найдена",
                        "No teams found",
                      ),
                    )}
                  </p>
                )}
              </>
            )}
            {page === "matches" && (
              <>
                <div className="filters">
                  {(
                    ["all", "pending", "scheduled", "live", "finished"] as const
                  ).map((f) => (
                    <button
                      key={f}
                      aria-pressed={filter === f}
                      onClick={() => setFilter(f)}
                      className={filter === f ? "active" : ""}
                    >
                      {t(copy[f])}
                    </button>
                  ))}
                </div>
                <div className="match-grid">
                  {matches
                    .filter((m) => filter === "all" || m.status === filter)
                    .map((m) => (
                      <MatchCard
                        lang={lang}
                        onSelect={setSelected}
                        key={m.id}
                        match={m}
                      />
                    ))}
                </div>
                {!matches.some(
                  (m) => filter === "all" || m.status === filter,
                ) && (
                  <div className="empty-result">
                    <CalendarDays />
                    <p>{t(copy.empty)}</p>
                  </div>
                )}
              </>
            )}
            {page === "bracket" && (
              <>
                <p className="muted">{t(copy.bracketHint)}</p>
                <div
                  className="bracket"
                  tabIndex={0}
                  aria-label={t(pages[4].label)}
                >
                  {copy.rounds.map((r, i) => (
                    <div className="bracket-round" key={i}>
                      <h2>
                        <span>0{i + 1}</span>
                        {t(r)}
                      </h2>
                      <div className="round-matches">
                        {matches
                          .filter((m) => m.round === i)
                          .map((m) => (
                            <div className="bracket-node" key={m.id}>
                              <MatchCard
                                lang={lang}
                                onSelect={setSelected}
                                match={m}
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {page === "live" && (
              <>
                <div className="broadcast">
                  {config.youtubeVideoId &&
                  /^[a-zA-Z0-9_-]{11}$/.test(config.youtubeVideoId) ? (
                    <iframe
                      title="NCL YouTube broadcast"
                      src={`https://www.youtube-nocookie.com/embed/${config.youtubeVideoId}`}
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="offline">
                      <Radio size={48} />
                      <span className="eyebrow">NCL BROADCAST</span>
                      <h2>{t(copy.offline)}</h2>
                      <p>{t(copy.offlineBody)}</p>
                    </div>
                  )}
                </div>
                <div className="section-heading">
                  <h2>{t(copy.upcoming)}</h2>
                </div>
                <div className="match-grid">
                  {matches
                    .filter((m) => m.status !== "finished")
                    .slice(0, 3)
                    .map((m) => (
                      <MatchCard
                        lang={lang}
                        onSelect={setSelected}
                        key={m.id}
                        match={m}
                      />
                    ))}
                </div>
              </>
            )}
            {page === "sponsors" && (
              <>
                <div className="section-intro">
                  <h2>{t(copy.partners)}</h2>
                  <p>{t(copy.partnerBody)}</p>
                </div>
                <div className="sponsor-grid">
                  {[
                    text("Bosh hamkor", "Титульный партнёр", "Title partner"),
                    text(
                      "Rasmiy hamkor",
                      "Официальный партнёр",
                      "Official partner",
                    ),
                    text(
                      "Texnik hamkor",
                      "Технический партнёр",
                      "Technology partner",
                    ),
                  ].map((tier, i) => (
                    <article className="sponsor-card" key={i}>
                      <span className="eyebrow">
                        0{i + 1} / {t(tier)}
                      </span>
                      <div className="sponsor-placeholder">
                        <span>+</span>
                      </div>
                      <h2>
                        {t(
                          text(
                            "Hamkor e’lon qilinmagan",
                            "Партнёр не объявлен",
                            "Partner to be announced",
                          ),
                        )}
                      </h2>
                      <p>{t(copy.placeholder)}</p>
                    </article>
                  ))}
                </div>
              </>
            )}
            {page === "about" && (
              <>
                <div className="about-intro">
                  <span className="about-monogram">N↗</span>
                  <div>
                    <h2>{t(copy.about)}</h2>
                    <p>{t(copy.newsBody)}</p>
                    <p>{t(copy.intro)}</p>
                  </div>
                </div>
                <div className="info-grid">
                  <section>
                    <h2 className="section-title">FAQ</h2>
                    {[
                      [
                        text("NCL nima?", "Что такое NCL?", "What is NCL?"),
                        text(
                          "National Cyber League — O‘zbekiston universitetlari o‘rtasida CS2 musobaqalarini tashkil etuvchi liga.",
                          "National Cyber League — лига турниров CS2 среди университетов Узбекистана.",
                          "National Cyber League organizes CS2 tournaments among universities in Uzbekistan.",
                        ),
                      ],
                      [
                        text(
                          "Qanday qatnashish mumkin?",
                          "Как принять участие?",
                          "How can I participate?",
                        ),
                        text(
                          "Ro‘yxatdan o‘tish hali ochilmagan. Rasmiy talablar tasdiqlangach e’lon qilinadi.",
                          "Регистрация пока не открыта. Официальные требования будут опубликованы после утверждения.",
                          "Registration is not open yet. Official eligibility and entry details will be published once approved.",
                        ),
                      ],
                      [
                        text(
                          "Saytdagi ma’lumotlar rasmiymi?",
                          "Данные на сайте официальные?",
                          "Is the data official?",
                        ),
                        copy.demo,
                      ],
                      [
                        text(
                          "Uchrashuv vaqti qaysi mintaqada?",
                          "В каком часовом поясе матчи?",
                          "Which timezone is used?",
                        ),
                        text(
                          "Barcha belgilangan vaqtlar Toshkent vaqti bilan ko‘rsatiladi (UZT, UTC+5).",
                          "Все назначенные матчи указаны по ташкентскому времени (UZT, UTC+5).",
                          "Scheduled match times use Tashkent time (UZT, UTC+5).",
                        ),
                      ],
                    ].map(([q, a], i) => (
                      <details className="faq" key={i}>
                        <summary>
                          {t(q)}
                          <ChevronDown size={18} />
                        </summary>
                        <p>{t(a)}</p>
                      </details>
                    ))}
                  </section>
                  <section className="panel contact">
                    <Mail />
                    <h2>
                      {t(
                        text(
                          "Biz bilan bog‘laning",
                          "Свяжитесь с нами",
                          "Get in touch",
                        ),
                      )}
                    </h2>
                    {config.contactEmail ? (
                      <a
                        className="text-link"
                        href={`mailto:${config.contactEmail}`}
                      >
                        {config.contactEmail}
                        <ArrowUpRight size={16} />
                      </a>
                    ) : (
                      <p>{t(copy.contact)}</p>
                    )}
                  </section>
                </div>
              </>
            )}
          </div>
        )}
      </main>
      <footer>
        <div className="container">
          <div className="footer-top">
            <Link href={href("home")}>
              <Brand />
            </Link>
            <p>{t(copy.intro)}</p>
            <Link href={href("about")} className="text-link">
              {t(pages[7].label)}
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} NATIONAL CYBER LEAGUE</span>
            <span>UZBEKISTAN · COUNTER-STRIKE 2</span>
            <span>
              {t(
                text(
                  "Mustaqil liga. Valve bilan bog‘liq emas.",
                  "Независимая лига. Не связана с Valve.",
                  "Independent league. Not affiliated with Valve.",
                ),
              )}
            </span>
          </div>
        </div>
      </footer>
      {(selected || team) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setSelected(null);
            setTeam(null);
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={t(copy.details)}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label={t(copy.close)}
              onClick={() => {
                setSelected(null);
                setTeam(null);
              }}
            >
              <X />
            </button>
            {selected ? (
              <>
                <span className="eyebrow">
                  {t(copy.rounds[selected.round])} / {selected.format}
                </span>
                <h2>{config.tournamentName}</h2>
                <div className="detail-teams">
                  {participants(selected).map((tm, i) => (
                    <div key={i}>
                      <Emblem slot={tm?.slot} large />
                      <h3>{tm ? t(tm.name) : t(copy.tbd)}</h3>
                      <strong>{selected.scores?.[i] ?? "—"}</strong>
                    </div>
                  ))}
                </div>
                <p className="demo-notice">{t(copy.demo)}</p>
                <p>
                  {selected.startsAt
                    ? new Date(selected.startsAt).toLocaleString(lang, {
                        timeZone: "Asia/Tashkent",
                      }) + " UZT"
                    : t(copy.pending)}
                </p>
                {selected.maps.length ? (
                  selected.maps.map((map) => (
                    <p key={map.name}>
                      {map.name} · {map.scores.join(" : ")}
                    </p>
                  ))
                ) : (
                  <p className="muted">
                    {t(
                      text(
                        "Xaritalar va hisoblar hali mavjud emas.",
                        "Карты и счёт пока отсутствуют.",
                        "Maps and scores are not available yet.",
                      ),
                    )}
                  </p>
                )}
                {selected.sources && (
                  <p className="muted">
                    {t(
                      text(
                        "Oldingi bosqich g‘oliblari",
                        "Победители предыдущего раунда",
                        "Winners of the previous round",
                      ),
                    )}
                    : {selected.sources.join(" / ")}
                  </p>
                )}
              </>
            ) : (
              team && (
                <>
                  <Emblem slot={team.slot} large />
                  <h2>{t(team.name)}</h2>
                  <p>
                    {t(copy.roster)} · {t(copy.placeholder)}
                  </p>
                  <div className="roster">
                    {team.roster.map((p, i) => (
                      <div key={i}>
                        <span>0{i + 1}</span>
                        <Users size={18} />
                        <strong>{p.name ?? t(copy.tbd)}</strong>
                        <small>{t(p.role)}</small>
                      </div>
                    ))}
                  </div>
                </>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function Countdown({ lang }: { lang: Language }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!config.startsAt) return;
    const update = () => setNow(Date.now());
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);
  const date = config.startsAt ? Date.parse(config.startsAt) : NaN;
  const remaining = now === null ? null : Math.max(0, date - now);
  if (!Number.isFinite(date) || remaining === null)
    return (
      <div className="countdown pending-count">
        <CalendarDays size={20} />
        <span>{copy.pending[lang]}</span>
      </div>
    );
  if (remaining === 0)
    return (
      <div className="countdown">
        {
          text(
            "Boshlanish vaqti yetdi",
            "Время начала наступило",
            "Scheduled start reached",
          )[lang]
        }
      </div>
    );
  return (
    <div className="countdown">
      {[
        Math.floor(remaining / 86400000),
        Math.floor(remaining / 3600000) % 24,
        Math.floor(remaining / 60000) % 60,
        Math.floor(remaining / 1000) % 60,
      ].map((v, i) => (
        <div key={i}>
          <strong>{String(v).padStart(2, "0")}</strong>
          <small>
            {
              [
                text("kun", "дн", "days"),
                text("soat", "ч", "hrs"),
                text("daq", "мин", "min"),
                text("son", "сек", "sec"),
              ][i][lang]
            }
          </small>
        </div>
      ))}
    </div>
  );
}

function MatchCard({
  match,
  lang,
  onSelect,
}: {
  match: Match;
  lang: Language;
  onSelect: (match: Match) => void;
}) {
  const t = (v: Localized) => v[lang];
  const pair = participants(match);
  return (
    <button className="match-card" onClick={() => onSelect(match)}>
      <div className="match-meta">
        <span>{t(copy.rounds[match.round])}</span>
        <span>{match.format}</span>
      </div>
      <div className="match-teams">
        {pair.map((tm, i) => (
          <span key={i}>
            <Emblem slot={tm?.slot} />
            <strong>{tm ? t(tm.name) : t(copy.tbd)}</strong>
            <b>{match.scores?.[i] ?? "—"}</b>
          </span>
        ))}
      </div>
      <div className="match-bottom">
        <span>
          <span className={`dot ${match.status === "live" ? "active" : ""}`} />
          {match.startsAt
            ? new Date(match.startsAt).toLocaleString(
                lang === "uz" ? "uz-UZ" : lang === "ru" ? "ru-RU" : "en-GB",
                {
                  timeZone: "Asia/Tashkent",
                  dateStyle: "medium",
                  timeStyle: "short",
                },
              ) + " UZT"
            : t(copy.pending)}
        </span>
        <ArrowUpRight size={15} />
      </div>
    </button>
  );
}
function SectionHead({
  title,
  number,
  link,
  lang,
  matchHref,
}: {
  title: string;
  number: string;
  link?: boolean;
  lang: Language;
  matchHref: string;
}) {
  const t = (v: Localized) => v[lang];
  return (
    <div className="section-heading">
      <h2>
        <span>{number} /</span>
        {title}
      </h2>
      {link && (
        <Link className="text-link" href={matchHref}>
          {t(copy.allMatches)} <ArrowUpRight size={15} />
        </Link>
      )}
    </div>
  );
}

function readLanguage(): Language {
  const l = new URLSearchParams(window.location.search).get("lang");
  return l === "en" || l === "ru" ? l : "uz";
}
function subscribeLanguage(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener("ncl-language", callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("ncl-language", callback);
  };
}
