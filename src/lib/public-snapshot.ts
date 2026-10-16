import {
  teams,
  matches,
  config,
  copy,
  text,
  type Team,
  type Match,
  type Localized,
} from "./data";
export interface PublicTournament {
  id: string;
  name: Localized;
  slug: string;
  rules: Localized;
  banner: string | null;
  format: string;
  teamLimit: number;
  startsAt: string | null;
  endsAt: string | null;
}
export interface PublicSponsor {
  id: string;
  name: Localized;
  tier: string;
  logo: string | null;
  banner: string | null;
  website: string | null;
  description: Localized;
  order: number;
}
export interface PublicNews {
  id: string;
  name: Localized;
  slug: string;
  body: Localized;
  cover: string | null;
  publishedAt: string;
}
export interface PublicSnapshot {
  mode: "demo" | "official" | "unavailable";
  teams: Team[];
  matches: Match[];
  config: typeof config;
  tournament: PublicTournament | null;
  tournaments: PublicTournament[];
  sponsors: PublicSponsor[];
  news: PublicNews[];
  content: Record<string, { name: Localized; body: Localized }>;
  broadcast: {
    name: Localized;
    status: "offline" | "upcoming" | "live";
    description: Localized;
  } | null;
}
export const demoSnapshot: PublicSnapshot = {
  mode: "demo",
  teams,
  matches,
  config,
  tournament: null,
  tournaments: [],
  sponsors: [],
  news: [],
  content: {},
  broadcast: null,
};
export function snapshotCopy(snapshot: PublicSnapshot) {
  const count = snapshot.matches.length
    ? Math.max(...snapshot.matches.map((m) => m.round)) + 1
    : 4;
  const rounds =
    snapshot.mode === "demo" || snapshot.mode === "unavailable"
      ? copy.rounds
      : Array.from({ length: count }, (_, i) => {
          const remaining = count - i;
          return remaining === 1
            ? copy.rounds[3]
            : remaining === 2
              ? copy.rounds[2]
              : remaining === 3
                ? copy.rounds[1]
                : remaining === 4
                  ? copy.rounds[0]
                  : text(
                      `${2 ** remaining} jamoa bosqichi`,
                      `Раунд ${2 ** remaining}`,
                      `Round of ${2 ** remaining}`,
                    );
        });
  return {
    ...copy,
    rounds,
    intro: snapshot.content.hero_intro?.body ?? copy.intro,
    newsBody: snapshot.content.league_about?.body ?? copy.newsBody,
    contact: snapshot.content.contact_note?.body ?? copy.contact,
    hero1: snapshot.content.home_headline?.name ?? copy.hero1,
    hero2: snapshot.content.home_headline?.body ?? copy.hero2,
    demo:
      snapshot.mode === "official"
        ? text(
            "RASMIY MA’LUMOTLAR · NCL tomonidan e’lon qilingan",
            "ОФИЦИАЛЬНЫЕ ДАННЫЕ · Опубликовано NCL",
            "OFFICIAL CONTENT · Published by NCL",
          )
        : snapshot.mode === "unavailable"
          ? text(
              "Ma’lumotlar xizmati vaqtincha ishlamayapti. Namuna ma’lumotlari ko‘rsatilmoqda.",
              "Данные временно недоступны. Показаны демонстрационные данные.",
              "Content service is temporarily unavailable. Showing demonstration data.",
            )
          : copy.demo,
  };
}
