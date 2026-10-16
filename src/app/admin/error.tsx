"use client";
import Link from "next/link";
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div className="admin-setup">
      <span className="eyebrow">NCL / ACCESS UNAVAILABLE</span>
      <h1>
        We couldn’t open
        <br />
        this workspace.
      </h1>
      <p>
        Your account may lack the required role, or Supabase may be unavailable.
        Verify the migration and your role with the project owner. No operation
        is reported as saved unless Supabase confirms it.
      </p>
      <button className="admin-primary" onClick={reset}>
        Retry
      </button>{" "}
      <Link className="admin-secondary" href="/admin/login">
        Return to sign in
      </Link>
    </div>
  );
}
