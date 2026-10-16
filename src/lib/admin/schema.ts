import { z } from "zod";
export const kinds = [
  "tournaments",
  "universities",
  "teams",
  "players",
  "matches",
  "live",
  "sponsors",
  "news",
  "content",
  "settings",
] as const;
export type Kind = (typeof kinds)[number];
export type Role = "owner" | "admin" | "editor";
export type Publication = "draft" | "published" | "archived";
const localized = z
  .object({
    uz: z.string().trim().min(1).max(20000),
    ru: z.string().trim().min(1).max(20000),
    en: z.string().trim().min(1).max(20000),
  })
  .strict();
const shortLocalized = z
  .object({
    uz: z.string().trim().min(1).max(180),
    ru: z.string().trim().min(1).max(180),
    en: z.string().trim().min(1).max(180),
  })
  .strict();
const uuid = z.uuid();
const nullableId = uuid.nullable();
export const safeUrl = z
  .string()
  .max(2048)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Use an HTTPS URL without embedded credentials");
const mediaUrl = z
  .string()
  .regex(/^\/media\/[0-9a-f-]{36}$/, "Choose an uploaded image")
  .nullable();
const date = z.iso.datetime({ offset: true }).nullable();
const pair = z.tuple([nullableId, nullableId]);
export const schemas = {
  tournaments: z
    .object({
      name: shortLocalized,
      slug: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .max(100),
      startsAt: date,
      endsAt: date,
      format: z.enum(["single_elimination", "round_robin", "groups_playoffs"]),
      teamLimit: z.union([
        z.literal(2),
        z.literal(4),
        z.literal(8),
        z.literal(16),
        z.literal(32),
        z.literal(64),
      ]),
      rules: localized,
      banner: mediaUrl,
    })
    .strict()
    .refine(
      (v) =>
        !v.startsAt ||
        !v.endsAt ||
        Date.parse(v.endsAt) >= Date.parse(v.startsAt),
      "End must follow start",
    ),
  universities: z
    .object({
      name: shortLocalized,
      logo: mediaUrl,
      website: safeUrl.nullable(),
    })
    .strict(),
  teams: z
    .object({
      name: shortLocalized,
      tournamentId: uuid,
      universityId: nullableId,
      slot: z.number().int().min(1).max(64),
      logo: mediaUrl,
    })
    .strict(),
  players: z
    .object({
      name: shortLocalized,
      nickname: z.string().trim().min(1).max(60),
      teamId: uuid,
      role: shortLocalized,
      photo: mediaUrl,
      steamUrl: safeUrl
        .refine((v) => {
          const u = new URL(v);
          return (
            u.hostname === "steamcommunity.com" &&
            /^\/(id|profiles)\/[A-Za-z0-9_-]+\/?$/.test(u.pathname)
          );
        }, "Use a steamcommunity.com/id/... or /profiles/... profile")
        .nullable(),
    })
    .strict(),
  matches: z
    .object({
      tournamentId: uuid,
      teamIds: pair,
      sourceIds: pair,
      round: z.number().int().min(0).max(5),
      position: z.number().int().min(0).max(31),
      format: z.enum(["BO1", "BO3", "BO5"]),
      status: z.enum(["pending", "scheduled", "live", "finished"]),
      startsAt: date,
      maps: z
        .array(
          z
            .object({
              name: z.string().trim().min(1).max(60),
              scores: z.tuple([
                z.number().int().min(0).max(100),
                z.number().int().min(0).max(100),
              ]),
            })
            .strict(),
        )
        .max(5),
      winnerId: nullableId,
      resultConfirmed: z.boolean(),
      manualOverride: z.boolean(),
      overrideReason: z.string().trim().max(2000),
    })
    .strict()
    .superRefine((v, ctx) => {
      if (v.teamIds[0] && v.teamIds[0] === v.teamIds[1])
        ctx.addIssue({ code: "custom", message: "A team cannot play itself" });
      if (v.status === "scheduled" && !v.startsAt)
        ctx.addIssue({
          code: "custom",
          message: "Scheduled matches require a date",
        });
      if (v.manualOverride && v.overrideReason.length < 10)
        ctx.addIssue({
          code: "custom",
          message: "Manual override needs a reason of at least 10 characters",
        });
      const needed = Number(v.format.slice(2));
      if (v.maps.length > needed)
        ctx.addIssue({
          code: "custom",
          message: "Too many maps for this series",
        });
      if (v.maps.some((m) => m.scores[0] === m.scores[1]))
        ctx.addIssue({
          code: "custom",
          message: "Completed maps cannot be tied",
        });
      if (
        new Set(v.maps.map((m) => m.name.toLowerCase())).size !== v.maps.length
      )
        ctx.addIssue({ code: "custom", message: "Map names must be unique" });
      const wins = v.maps.reduce(
        (a, m) => {
          a[m.scores[0] > m.scores[1] ? 0 : 1]++;
          return a;
        },
        [0, 0],
      );
      if (
        v.status === "finished" &&
        (!v.resultConfirmed ||
          !v.winnerId ||
          Math.max(...wins) !== Math.ceil(needed / 2) ||
          Math.min(...wins) >= Math.ceil(needed / 2))
      )
        ctx.addIssue({
          code: "custom",
          message:
            "Confirm a winner and a complete series score before finishing",
        });
      if (v.status !== "finished" && (v.winnerId || v.resultConfirmed))
        ctx.addIssue({
          code: "custom",
          message: "Only finished matches can have confirmed winners",
        });
    }),
  live: z
    .object({
      name: shortLocalized,
      tournamentId: nullableId,
      youtubeUrl: safeUrl
        .refine((v) => Boolean(youtubeId(v)), "Use a valid YouTube video URL")
        .nullable(),
      status: z.enum(["offline", "upcoming", "live"]),
      description: localized,
    })
    .strict()
    .refine(
      (v) => v.status === "offline" || Boolean(v.youtubeUrl),
      "A live or upcoming broadcast requires a YouTube video",
    ),
  sponsors: z
    .object({
      name: shortLocalized,
      tier: z.enum(["title", "official", "technology", "community"]),
      logo: mediaUrl,
      banner: mediaUrl,
      website: safeUrl.nullable(),
      description: localized,
      order: z.number().int().min(0).max(1000),
    })
    .strict(),
  news: z
    .object({
      name: shortLocalized,
      slug: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .max(100),
      body: localized,
      cover: mediaUrl,
    })
    .strict(),
  content: z
    .object({
      key: z.enum([
        "hero_intro",
        "league_about",
        "contact_note",
        "home_headline",
      ]),
      name: shortLocalized,
      body: localized,
    })
    .strict(),
  settings: z
    .object({
      name: shortLocalized,
      featuredTournamentId: nullableId,
      contactEmail: z.email().max(254).nullable(),
    })
    .strict(),
};
export interface ContentRecord {
  id: string;
  kind: Kind;
  status: Publication;
  data: Record<string, unknown>;
  version: number;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
}
export interface MediaRecord {
  id: string;
  path: string;
  name: string;
  published: boolean;
  created_at: string;
}
export function youtubeId(value: string): string | null {
  try {
    const u = new URL(value);
    if (u.protocol !== "https:") return null;
    const id =
      u.hostname === "youtu.be"
        ? u.pathname.slice(1)
        : ["www.youtube.com", "youtube.com"].includes(u.hostname)
          ? u.pathname.startsWith("/live/")
            ? u.pathname.split("/")[2]
            : u.searchParams.get("v")
          : null;
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
export function canPublish(role: Role) {
  return role === "owner" || role === "admin";
}
export function canManage(kind: Kind, role: Role) {
  return kind !== "settings" || role === "owner";
}
