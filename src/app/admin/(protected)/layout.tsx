import Link from "next/link";
import { AdminNavLink, AdminMobileMenu } from "@/components/admin/navigation";
import {
  LayoutDashboard,
  Trophy,
  GraduationCap,
  Users,
  UserRound,
  Swords,
  GitBranch,
  Radio,
  Handshake,
  Newspaper,
  FileText,
  ImageIcon,
  Settings,
  ShieldCheck,
  KeyRound,
  ScrollText,
  LogOut,
  ArrowUpRight,
} from "lucide-react";
import { configured } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import { signOut } from "@/lib/admin/actions";
import { SetupNotice } from "@/components/admin/setup-notice";
export const dynamic = "force-dynamic";
const links = [
  ["", "Overview", LayoutDashboard],
  ["tournaments", "Tournaments", Trophy],
  ["universities", "Universities", GraduationCap],
  ["teams", "Teams", Users],
  ["players", "Players", UserRound],
  ["matches", "Matches", Swords],
  ["bracket", "Bracket", GitBranch],
  ["live", "Broadcast", Radio],
  ["sponsors", "Partners", Handshake],
  ["news", "News", Newspaper],
  ["content", "Site content", FileText],
  ["media", "Media library", ImageIcon],
  ["settings", "Settings", Settings],
  ["administrators", "Administrators", ShieldCheck],
  ["audit", "Audit log", ScrollText],
  ["account", "My account", KeyRound],
] as const;
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!configured()) return <SetupNotice />;
  const { user, role } = await requireAdmin();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand">
          <span>N</span>NCL<small>CONTROL CENTER</small>
        </Link>
        <div className="admin-workspace">
          <span className="admin-online-dot" />
          CONNECTED WORKSPACE<small>Supabase · {role.toUpperCase()}</small>
        </div>
        <nav aria-label="Admin navigation">
          {links
            .filter(
              ([key]) =>
                (!["settings", "administrators"].includes(key) ||
                  role === "owner") &&
                (key !== "audit" || role !== "editor"),
            )
            .map(([key, label, Icon]) => (
              <AdminNavLink key={key} href={`/admin${key ? "/" + key : ""}`}>
                <Icon size={17} />
                {label}
              </AdminNavLink>
            ))}
        </nav>
        <Link href="/" className="admin-public-link">
          Public website
          <ArrowUpRight size={16} />
        </Link>
      </aside>
      <div className="admin-main">
        <div className="admin-topbar">
          <AdminMobileMenu>
            {links
              .filter(
                ([key]) =>
                  (!["settings", "administrators"].includes(key) ||
                    role === "owner") &&
                  (key !== "audit" || role !== "editor"),
              )
              .map(([key, label]) => (
                <AdminNavLink key={key} href={`/admin${key ? "/" + key : ""}`}>
                  {label}
                </AdminNavLink>
              ))}
          </AdminMobileMenu>
          <span className="admin-breadcrumb">NCL / LEAGUE OPERATIONS</span>
          <div className="admin-session">
            <span>
              {user.email}
              <small>{role}</small>
            </span>
            <form action={signOut}>
              <button aria-label="Sign out">
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>
        <div className="admin-page">{children}</div>
      </div>
    </div>
  );
}
