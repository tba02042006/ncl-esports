import type { Metadata } from "next";
import { InvitationForm } from "@/components/admin/forms";
import { configured } from "@/lib/supabase/server";
import "@/app/admin/admin.css";
export const metadata: Metadata = {
  title: "NCL — Set administrator password",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";
export default async function Confirm({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { token_hash, type } = await searchParams;
  return (
    <div className="admin-root" lang="en">
      <div className="admin-login-card">
        <span className="eyebrow">NCL / ACCOUNT ACTIVATION</span>
        <h1>
          Secure your
          <br />
          <em>league account.</em>
        </h1>
        {configured() &&
        token_hash &&
        (type === "invite" || type === "recovery") ? (
          <>
            <p>
              This link is used only when you submit a new password. Only
              previously authorized NCL administrators can activate access.
            </p>
            <InvitationForm token={token_hash} type={type} />
          </>
        ) : (
          <p>
            This invitation is incomplete or the backend is not configured. Ask
            the owner for a new invitation.
          </p>
        )}
      </div>
    </div>
  );
}
