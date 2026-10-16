import "server-only";
import { redirect } from "next/navigation";
import { supabaseServer, configured } from "@/lib/supabase/server";
import type { Role } from "./schema";
export async function requireAdmin(
  roles: Role[] = ["owner", "admin", "editor"],
) {
  if (!configured())
    throw new Error(
      "Supabase is not connected. Follow docs/SUPABASE_SETUP.md.",
    );
  const db = await supabaseServer();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) redirect("/admin/login");
  const { data: membership, error: roleError } = await db
    .from("ncl_admins")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (!membership && !roleError) redirect("/admin/login?denied=1");
  if (roleError || !membership || !roles.includes(membership.role as Role))
    throw new Error(
      "This account is not authorized for this operation. Ask an NCL owner to grant the required role.",
    );
  return { db, user, role: membership.role as Role };
}
