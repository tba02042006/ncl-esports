import type { Kind } from "./schema";
export interface Field {
  key: string;
  label: string;
  type:
    | "text"
    | "localized"
    | "longLocalized"
    | "url"
    | "media"
    | "date"
    | "number"
    | "select"
    | "relation"
    | "boolean"
    | "maps";
  options?: string[];
  relation?: Kind;
  required?: boolean;
  help?: string;
}
const name: Field = {
  key: "name",
  label: "Name / title",
  type: "localized",
  required: true,
};
const tournament: Field = {
  key: "tournamentId",
  label: "Tournament",
  type: "relation",
  relation: "tournaments",
  required: true,
};
export const fields: Record<Kind, Field[]> = {
  tournaments: [
    name,
    { key: "slug", label: "URL slug", type: "text", required: true },
    { key: "startsAt", label: "Starts at (Tashkent, UTC+5)", type: "date" },
    { key: "endsAt", label: "Ends at (Tashkent, UTC+5)", type: "date" },
    {
      key: "format",
      label: "Competition format",
      type: "select",
      options: ["single_elimination", "round_robin", "groups_playoffs"],
    },
    {
      key: "teamLimit",
      label: "Team capacity",
      type: "select",
      options: ["2", "4", "8", "16", "32", "64"],
    },
    { key: "rules", label: "Rules", type: "longLocalized", required: true },
    { key: "banner", label: "Tournament banner", type: "media" },
  ],
  universities: [
    name,
    { key: "logo", label: "University logo", type: "media" },
    { key: "website", label: "University website", type: "url" },
  ],
  teams: [
    name,
    tournament,
    {
      key: "universityId",
      label: "University",
      type: "relation",
      relation: "universities",
    },
    { key: "slot", label: "Tournament slot", type: "number", required: true },
    { key: "logo", label: "Team crest", type: "media" },
  ],
  players: [
    name,
    { key: "nickname", label: "Player nickname", type: "text", required: true },
    {
      key: "teamId",
      label: "Team",
      type: "relation",
      relation: "teams",
      required: true,
    },
    { key: "role", label: "Player role", type: "localized", required: true },
    { key: "photo", label: "Player photo", type: "media" },
    {
      key: "steamUrl",
      label: "Steam profile",
      type: "url",
      help: "https://steamcommunity.com/id/nickname or /profiles/SteamID",
    },
  ],
  matches: [
    tournament,
    { key: "teamIds.0", label: "Team A", type: "relation", relation: "teams" },
    { key: "teamIds.1", label: "Team B", type: "relation", relation: "teams" },
    {
      key: "sourceIds.0",
      label: "Winner from match A",
      type: "relation",
      relation: "matches",
    },
    {
      key: "sourceIds.1",
      label: "Winner from match B",
      type: "relation",
      relation: "matches",
    },
    {
      key: "round",
      label: "Round index (0 = first round)",
      type: "number",
      required: true,
    },
    {
      key: "position",
      label: "Position in round (0-based)",
      type: "number",
      required: true,
    },
    {
      key: "format",
      label: "Series format",
      type: "select",
      options: ["BO1", "BO3", "BO5"],
    },
    {
      key: "status",
      label: "Match status",
      type: "select",
      options: ["pending", "scheduled", "live", "finished"],
    },
    {
      key: "startsAt",
      label: "Scheduled time (Tashkent, UTC+5)",
      type: "date",
    },
    {
      key: "maps",
      label: "Completed maps",
      type: "maps",
      help: "Enter only completed maps. The series score is calculated from these results.",
    },
    {
      key: "winnerId",
      label: "Confirmed winning team",
      type: "relation",
      relation: "teams",
    },
    {
      key: "resultConfirmed",
      label: "I have checked and confirmed this result",
      type: "boolean",
    },
    {
      key: "manualOverride",
      label: "Manually override source participants (owner/admin only)",
      type: "boolean",
    },
    {
      key: "overrideReason",
      label: "Reason for participant override",
      type: "text",
      help: "At least 10 characters. This reason is part of the published match record and audit history; do not include confidential details. Started descendants block upstream changes.",
    },
  ],
  live: [
    name,
    { ...tournament, required: false },
    { key: "youtubeUrl", label: "YouTube video URL", type: "url" },
    {
      key: "status",
      label: "Broadcast status",
      type: "select",
      options: ["offline", "upcoming", "live"],
    },
    {
      key: "description",
      label: "Broadcast information",
      type: "longLocalized",
      required: true,
    },
  ],
  sponsors: [
    name,
    {
      key: "tier",
      label: "Partner tier",
      type: "select",
      options: ["title", "official", "technology", "community"],
    },
    { key: "logo", label: "Partner logo", type: "media" },
    { key: "banner", label: "Partner banner", type: "media" },
    { key: "website", label: "Partner website", type: "url" },
    {
      key: "description",
      label: "Partner profile",
      type: "longLocalized",
      required: true,
    },
    { key: "order", label: "Display order", type: "number", required: true },
  ],
  news: [
    name,
    { key: "slug", label: "URL slug", type: "text", required: true },
    {
      key: "body",
      label: "Article body",
      type: "longLocalized",
      required: true,
    },
    { key: "cover", label: "Cover image", type: "media" },
  ],
  content: [
    {
      key: "key",
      label: "Site placement",
      type: "select",
      options: ["hero_intro", "league_about", "contact_note", "home_headline"],
    },
    name,
    { key: "body", label: "Content", type: "longLocalized", required: true },
  ],
  settings: [
    name,
    {
      key: "featuredTournamentId",
      label: "Featured tournament",
      type: "relation",
      relation: "tournaments",
    },
    { key: "contactEmail", label: "Official contact email", type: "text" },
  ],
};
export const descriptions: Record<Kind, string> = {
  tournaments: "Manage competition identity, dates, rules and publication.",
  universities: "Maintain verified university identities.",
  teams: "Assign teams to tournaments and university identities.",
  players: "Manage player profiles and roster membership.",
  matches:
    "Schedule fixtures and confirm results. Winners advance through linked source matches.",
  live: "Configure a real YouTube broadcast and its editorial status.",
  sponsors: "Publish approved partners, tiers and branding.",
  news: "Publish league articles in Uzbek, Russian and English.",
  content: "Edit public headlines and league content in all three languages.",
  settings: "Owner-only league settings and featured tournament.",
};
