import Link from "next/link";
import { configured } from "@/lib/supabase/server";
import { LoginForm } from "@/components/admin/forms";
import { SetupNotice } from "@/components/admin/setup-notice";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ password?: string; denied?: string }>;
}) {
  const query = await searchParams;
  if (!configured()) return <SetupNotice />;
  return (
    <div className="admin-login">
      <div className="admin-login-art" aria-hidden="true">
        <span>NCL</span>
        <p>
          THE LEAGUE.
          <br />
          UNDER CONTROL.
        </p>
        <small>NATIONAL CYBER LEAGUE / UZBEKISTAN</small>
      </div>
      <div className="admin-login-card">
        <Link href="/" className="eyebrow">
          ← NCL / PUBLIC WEBSITE
        </Link>
        <h1>
          Control
          <br />
          <em>the next stage.</em>
        </h1>
        <p>
          Authorized league personnel only. Public administrator signup is
          disabled.
        </p>
        {query.password === "changed" && (
          <p className="admin-success">
            Password changed. Sign in with your new password.
          </p>
        )}
        {query.denied && (
          <p role="alert" className="admin-error">
            This account has no administrator role. Contact the league owner.
          </p>
        )}
        <LoginForm />
        <p className="admin-help">
          Forgot your password? Ask the project owner to send a password
          recovery email through Supabase Authentication. Recovery instructions
          are in the setup guide.
        </p>
      </div>
    </div>
  );
}
