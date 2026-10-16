import Link from "next/link";
export function SetupNotice() {
  return (
    <div className="admin-setup">
      <span className="eyebrow">NCL / CONTROL CENTER</span>
      <h1>
        Connect Supabase
        <br />
        <em>to unlock Admin.</em>
      </h1>
      <p>
        The admin backend is not configured on this deployment. No edits or
        uploads can be saved yet. The public website continues to use clearly
        labeled demo data.
      </p>
      <ol>
        <li>
          Create a Supabase project and run the migration in{" "}
          <code>supabase/migrations/</code>.
        </li>
        <li>
          Add the project URL and publishable key to your deployment
          environment.
        </li>
        <li>
          Invite your Auth user, disable public signup and grant the first owner
          role using the setup guide.
        </li>
        <li>
          Redeploy and return to <code>/admin/login</code>.
        </li>
      </ol>
      <p>
        Complete instructions: <code>docs/SUPABASE_SETUP.md</code>. Never enter
        secret keys in chat or commit them.
      </p>
      <Link href="/" className="admin-secondary">
        Return to the public website ↗
      </Link>
    </div>
  );
}
