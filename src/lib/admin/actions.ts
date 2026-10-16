"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sanitizeImage } from "./image";
import { requireAdmin } from "./auth";
import { schemas, kinds, canManage, canPublish, type Kind } from "./schema";
import { configured, supabaseServer } from "@/lib/supabase/server";
export interface ActionState {
  error?: string;
}
function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Operation failed. Please retry.";
}
export async function signIn(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!configured()) return { error: "Supabase is not connected yet." };
  const email = String(form.get("email") || "").trim(),
    password = String(form.get("password") || "");
  if (!z.email().safeParse(email).success || !password || password.length > 256)
    return { error: "Enter a valid email and password." };
  const db = await supabaseServer();
  const { data: authData, error } = await db.auth.signInWithPassword({
    email,
    password,
  });
  if (error)
    return {
      error: "Sign-in failed. Check your credentials or try again later.",
    };
  const { data } = await db
    .from("ncl_admins")
    .select("role")
    .eq("user_id", authData.user!.id)
    .single();
  if (!data) {
    await db.auth.signOut();
    return {
      error:
        "This account has no administrator access. Contact the league owner.",
    };
  }
  redirect("/admin");
}
export async function signOut() {
  const db = await supabaseServer();
  await db.auth.signOut();
  redirect("/admin/login");
}
export async function changePassword(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db, user } = await requireAdmin();
  const current = String(form.get("current") || ""),
    password = String(form.get("password") || "");
  if (
    password.length < 12 ||
    password.length > 128 ||
    password !== form.get("confirm")
  )
    return { error: "Use a matching password of 12–128 characters." };
  const { error: verify } = await db.auth.signInWithPassword({
    email: user.email!,
    password: current,
  });
  if (verify) return { error: "Current password is incorrect." };
  const { error } = await db.auth.updateUser({ password });
  if (error) return { error: "Password change failed. Please retry." };
  await db.auth.signOut({ scope: "global" });
  redirect("/admin/login?password=changed");
}
export async function saveContent(
  kind: Kind,
  id: string | null,
  version: number,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db, role } = await requireAdmin();
  if (!kinds.includes(kind) || !canManage(kind, role))
    return { error: "Not authorized." };
  try {
    const publication = z
      .enum(["draft", "published", "archived"])
      .parse(form.get("publication"));
    if (!canPublish(role) && publication !== "draft")
      return { error: "Editors may save drafts only." };
    const raw = String(form.get("document") || "");
    if (raw.length > 100000) return { error: "Record is too large." };
    const result = schemas[kind].safeParse(JSON.parse(raw));
    if (!result.success)
      return {
        error: result.error.issues
          .map((i) => `${i.path.join(".") || "Record"}: ${i.message}`)
          .join(" · "),
      };
    const { error } = await db.rpc("ncl_save", {
      record_id: id,
      record_kind: kind,
      publication,
      document: result.data,
      expected_version: version,
    });
    if (error) return { error: error.message };
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/", "layout");
  redirect(`/admin/${kind}?saved=1`);
}
export async function deleteContent(
  id: string,
  version: number,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db } = await requireAdmin(["owner", "admin"]);
  if (form.get("confirm") !== "DELETE")
    return { error: "Type DELETE to confirm permanent deletion." };
  const { error } = await db.rpc("ncl_delete", {
    record_id: z.uuid().parse(id),
    expected_version: version,
  });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect("/admin?saved=1");
}
export async function manageAdmin(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db, user } = await requireAdmin(["owner"]);
  const id = z.uuid().safeParse(form.get("userId"));
  const role = z
    .enum(["owner", "admin", "editor", "remove"])
    .safeParse(form.get("role"));
  if (!id.success || !role.success)
    return { error: "Choose a valid Auth user UUID and role." };
  const { error } = await db.rpc("ncl_manage_admin", {
    target_id: id.data,
    new_role: role.data === "remove" ? null : role.data,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin");
  if (id.data === user.id) redirect("/admin");
  redirect("/admin/administrators?saved=1");
}
export async function uploadMedia(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db, user } = await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 1 || file.size > 3 * 1024 * 1024)
    return { error: "Choose a PNG, JPEG or WebP image up to 3 MB." };
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    return {
      error:
        "Only PNG, JPEG and WebP are accepted. SVG and animated media are not allowed.",
    };
  const id = crypto.randomUUID(),
    path = `${user.id}/${id}.webp`;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const buffer = await sanitizeImage(input);
    const { error } = await db.storage.from("ncl-media").upload(path, buffer, {
      contentType: "image/webp",
      upsert: false,
      cacheControl: "60",
    });
    if (error) return { error: error.message };
    const { error: insert } = await db.from("ncl_media").insert({
      id,
      path,
      name:
        file.name.replace(/[^\p{L}\p{N} ._-]/gu, "").slice(0, 180) || "Image",
      created_by: user.id,
      published: false,
    });
    if (insert) {
      await db.storage.from("ncl-media").remove([path]);
      return { error: insert.message };
    }
  } catch {
    return {
      error:
        "Image could not be safely decoded or uploaded. Try a standard PNG, JPEG or WebP.",
    };
  }
  revalidatePath("/admin/media");
  redirect("/admin/media?saved=1");
}
export async function mediaVisibility(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db } = await requireAdmin(["owner", "admin"]);
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Invalid image ID." };
  const { error } = await db.rpc("ncl_media_visibility", {
    media_id: id.data,
    is_public: form.get("published") === "true",
  });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect("/admin/media?saved=1");
}
export async function generateBracket(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db } = await requireAdmin(["owner", "admin"]);
  const id = z.uuid().safeParse(form.get("tournamentId"));
  if (!id.success) return { error: "Select a tournament." };
  const { error } = await db.rpc("ncl_generate_bracket", {
    tournament_id: id.data,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/bracket");
  redirect(`/admin/bracket?tournament=${id.data}&saved=1`);
}
export async function acceptInvitation(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!configured()) return { error: "Supabase is not configured." };
  const token = String(form.get("token") || ""),
    type = form.get("type"),
    password = String(form.get("password") || "");
  if (
    !/^[a-fA-F0-9]{32,256}$/.test(token) ||
    (type !== "invite" && type !== "recovery") ||
    password.length < 12 ||
    password.length > 128 ||
    password !== form.get("confirm")
  )
    return {
      error:
        "Use a valid invitation/recovery link and matching passwords of 12–128 characters.",
    };
  const db = await supabaseServer();
  const { data, error } = await db.auth.verifyOtp({ token_hash: token, type });
  if (error || !data.user)
    return {
      error:
        "This link is invalid or expired. Ask your project owner to send a new one.",
    };
  const { data: member } = await db
    .from("ncl_admins")
    .select("role")
    .eq("user_id", data.user.id)
    .single();
  if (!member) {
    await db.auth.signOut();
    return {
      error:
        "This account has not been authorized by an NCL owner. Ask the owner to grant access and send a new link.",
    };
  }
  const { error: update } = await db.auth.updateUser({ password });
  await db.auth.signOut();
  if (update)
    return {
      error: "Password update failed. Request a fresh recovery link and retry.",
    };
  redirect("/admin/login?password=changed");
}
