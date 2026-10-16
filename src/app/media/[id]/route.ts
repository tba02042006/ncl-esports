import { NextResponse } from "next/server";
import { z } from "zod";
import { configured, supabaseServer } from "@/lib/supabase/server";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!configured() || !z.uuid().safeParse(id).success)
    return new NextResponse("Not found", { status: 404 });
  const db = await supabaseServer();
  const { data } = await db
    .from("ncl_media")
    .select("path")
    .eq("id", id)
    .single();
  if (!data) return new NextResponse("Not found", { status: 404 });
  const { data: signed, error } = await db.storage
    .from("ncl-media")
    .createSignedUrl(data.path, 60);
  if (error || !signed) return new NextResponse("Not found", { status: 404 });
  const response = NextResponse.redirect(signed.signedUrl);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
