import "server-only";
import { supabasePublic, configured } from "./supabase/server";
import { schemas, youtubeId, type ContentRecord } from "./admin/schema";
import { allRecords } from "./admin/records";
import { demoSnapshot, type PublicSnapshot } from "./public-snapshot";
import type { Team, Match } from "./data";
export async function loadPublicLeague(slug?: string): Promise<PublicSnapshot> {
  if (!configured()) return demoSnapshot;
  try {
    const db = supabasePublic();
    const records = await allRecords(db);
    const rows = records.map((r) => ({
      ...r,
      data: schemas[r.kind].parse(r.data),
    })) as ContentRecord[];
    const byKind = (kind: string) => rows.filter((r) => r.kind === kind);
    const settings = byKind("settings")[0]?.data;
    const tournaments = byKind("tournaments").map((r) => ({
      id: r.id,
      ...schemas.tournaments.parse(r.data),
    }));
    const tournament =
      (slug ? tournaments.find((t) => t.slug === slug) : undefined) ??
      tournaments.find((t) => t.id === settings?.featuredTournamentId) ??
      tournaments[0] ??
      null;
    const sponsors = byKind("sponsors")
      .map((r) => ({ id: r.id, ...schemas.sponsors.parse(r.data) }))
      .sort((a, b) => a.order - b.order);
    const news = byKind("news")
      .map((r) => ({
        id: r.id,
        ...schemas.news.parse(r.data),
        publishedAt: r.published_at ?? r.created_at,
      }))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    const content = Object.fromEntries(
      byKind("content").map((r) => {
        const d = schemas.content.parse(r.data);
        return [d.key, { name: d.name, body: d.body }];
      }),
    );
    const liveRecord = byKind("live")
      .map((r) => schemas.live.parse(r.data))
      .find((r) => !r.tournamentId || r.tournamentId === tournament?.id);
    const broadcast = liveRecord
      ? {
          name: liveRecord.name,
          status: liveRecord.status,
          description: liveRecord.description,
        }
      : null;
    const siteConfig = {
      ...demoSnapshot.config,
      contactEmail:
        typeof settings?.contactEmail === "string"
          ? settings.contactEmail
          : null,
      youtubeVideoId:
        liveRecord?.youtubeUrl && liveRecord.status !== "offline"
          ? youtubeId(liveRecord.youtubeUrl)
          : null,
    };
    if (!tournament)
      return {
        ...demoSnapshot,
        config: siteConfig,
        sponsors,
        news,
        content,
        broadcast,
      };
    const teamRows = byKind("teams")
      .map((r) => ({ id: r.id, ...schemas.teams.parse(r.data) }))
      .filter((r) => r.tournamentId === tournament.id)
      .sort((a, b) => a.slot - b.slot);
    const universities = byKind("universities").map((r) => ({
      id: r.id,
      ...schemas.universities.parse(r.data),
    }));
    const players = byKind("players").map((r) => ({
      id: r.id,
      ...schemas.players.parse(r.data),
    }));
    const teams: Team[] = teamRows.map((team) => ({
      id: team.id,
      slot: team.slot,
      name: team.name,
      logo:
        team.logo ??
        universities.find((u) => u.id === team.universityId)?.logo ??
        null,
      university: universities.find((u) => u.id === team.universityId)?.name,
      roster: players
        .filter((p) => p.teamId === team.id)
        .map((p) => ({
          name: p.nickname,
          role: p.role,
          photo: p.photo,
          steamUrl: p.steamUrl,
          profileName: p.name,
        })),
    }));
    const matches: Match[] = byKind("matches")
      .map((r) => ({ id: r.id, ...schemas.matches.parse(r.data) }))
      .filter((r) => r.tournamentId === tournament.id)
      .sort((a, b) => a.round - b.round || a.position - b.position)
      .map((m) => {
        const scores = m.maps.length
          ? m.maps.reduce<[number, number]>(
              (sum, map) => {
                sum[map.scores[0] > map.scores[1] ? 0 : 1]++;
                return sum;
              },
              [0, 0],
            )
          : null;
        return {
          id: m.id,
          round: m.round,
          position: m.position,
          teamIds: m.teamIds,
          ...(m.sourceIds.every(Boolean) && !m.manualOverride
            ? { sources: m.sourceIds as [string, string] }
            : {}),
          format: m.format,
          status: m.status,
          startsAt: m.startsAt,
          maps: m.maps,
          scores,
          winnerId: m.resultConfirmed ? m.winnerId : null,
        };
      });
    // Resolve each side independently so a direct seed + a source winner also works.
    const sourceRows = byKind("matches").map((r) => ({
      id: r.id,
      ...schemas.matches.parse(r.data),
    }));
    for (const match of matches) {
      const source = sourceRows.find((r) => r.id === match.id)!;
      if (!source.manualOverride)
        match.teamIds = source.teamIds.map((id, i) => {
          const prior = sourceRows.find((r) => r.id === source.sourceIds[i]);
          return source.sourceIds[i]
            ? prior?.resultConfirmed && prior.status === "finished"
              ? prior.winnerId
              : null
            : id;
        }) as [string | null, string | null];
    }
    return {
      mode: "official",
      teams,
      matches,
      config: {
        ...siteConfig,
        tournamentName: tournament.name.uz,
        startsAt: tournament.startsAt,
      },
      tournament,
      tournaments,
      sponsors,
      news,
      content,
      broadcast,
    };
  } catch (error) {
    console.error(
      "Public NCL data unavailable:",
      error instanceof Error ? error.name : "Unknown error",
    );
    return { ...demoSnapshot, mode: "unavailable" };
  }
}
