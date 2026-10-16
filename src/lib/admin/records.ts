import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentRecord } from "./schema";
export function recordTitle(record: ContentRecord) {
  const name = record.data.name as { en?: string } | undefined;
  return (
    name?.en ??
    (record.kind === "matches"
      ? `Round ${Number(record.data.round) + 1} · Match ${Number(record.data.position) + 1} · ${record.data.format}`
      : record.id)
  );
}
export async function allRecords(db: SupabaseClient) {
  const rows: ContentRecord[] = [];
  for (let offset = 0; offset < 20000; offset += 500) {
    const { data, error } = await db
      .from("ncl_content")
      .select("*")
      .order("created_at")
      .order("id")
      .range(offset, offset + 499);
    if (error)
      throw new Error(
        "Database query failed. Apply the NCL migration and verify your access.",
      );
    rows.push(...(data as ContentRecord[]));
    if (data.length < 500) return rows;
  }
  throw new Error(
    "Record limit reached. Add server-side pagination before growing beyond 20,000 records.",
  );
}
export async function allMedia(db: SupabaseClient) {
  const rows: import("./schema").MediaRecord[] = [];
  for (let offset = 0; offset < 20000; offset += 500) {
    const { data, error } = await db
      .from("ncl_media")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error("Media query failed. Verify your access.");
    rows.push(...(data as import("./schema").MediaRecord[]));
    if (data.length < 500) return rows;
  }
  throw new Error(
    "Media limit reached. Add server-side pagination before growing beyond 20,000 images.",
  );
}
