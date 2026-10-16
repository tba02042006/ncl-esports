import Link from "next/link";
import { ArrowUpRight, Activity } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { allRecords, recordTitle } from "@/lib/admin/records";
export default async function Dashboard() {
  const { db, role } = await requireAdmin();
  const records = await allRecords(db);
  const counts = ["tournaments", "teams", "matches", "players"].map((kind) => ({
    kind,
    total: records.filter((r) => r.kind === kind).length,
    published: records.filter(
      (r) => r.kind === kind && r.status === "published",
    ).length,
  }));
  const fixture = records.filter((r) => r.kind === "matches");
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">YOUR LEAGUE. IN FOCUS.</span>
          <h1>
            Operations overview<span>.</span>
          </h1>
          <p>
            Live database counts. Drafts are private; only published records
            appear publicly.
          </p>
        </div>
        <Link className="admin-primary" href="/admin/tournaments/new">
          Create tournament <ArrowUpRight size={17} />
        </Link>
      </div>
      <div className="admin-stats">
        {counts.map((c) => (
          <Link href={`/admin/${c.kind}`} key={c.kind}>
            <span>{c.kind}</span>
            <strong>{c.total.toString().padStart(2, "0")}</strong>
            <small>
              {c.published} published <ArrowUpRight size={15} />
            </small>
          </Link>
        ))}
      </div>
      <div className="admin-overview-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Competition pulse</h2>
            <Activity size={20} />
          </div>
          {["pending", "scheduled", "live", "finished"].map((status) => {
            const count = fixture.filter(
              (r) => r.data.status === status,
            ).length;
            return (
              <div className="admin-pulse" key={status}>
                <span>{status}</span>
                <div>
                  <i
                    style={{
                      width: `${fixture.length ? (count / fixture.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <strong>{count}</strong>
              </div>
            );
          })}
          <p>
            {fixture.length
              ? `${fixture.length} saved fixtures across all tournaments.`
              : "No fixtures saved. Create teams and generate a bracket to begin."}
          </p>
        </section>
        <section className="admin-panel">
          <span className="eyebrow">PUBLISHING WORKFLOW</span>
          <h2>Build. Verify. Publish.</h2>
          <ol className="admin-workflow">
            <li>
              <b>01</b>
              <span>Create a tournament and team identities.</span>
            </li>
            <li>
              <b>02</b>
              <span>Upload and publish approved images.</span>
            </li>
            <li>
              <b>03</b>
              <span>Schedule fixtures and verify translations.</span>
            </li>
            <li>
              <b>04</b>
              <span>
                {role === "editor"
                  ? "Ask an admin to publish your drafts."
                  : "Publish the tournament, teams and then fixtures."}
              </span>
            </li>
          </ol>
        </section>
      </div>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <h2>Recent content updates</h2>
          <Link href="/admin/tournaments" className="admin-inline-link">
            Manage content <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
        {records.length ? (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Record</th>
                  <th>Collection</th>
                  <th>Publication</th>
                  <th>Updated (UZT)</th>
                </tr>
              </thead>
              <tbody>
                {[...records]
                  .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
                  .slice(0, 8)
                  .map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/admin/${r.kind}/${r.id}`}>
                          {recordTitle(r)}
                        </Link>
                      </td>
                      <td>{r.kind}</td>
                      <td>
                        <span className={`admin-badge ${r.status}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        {new Date(r.updated_at).toLocaleString("en-GB", {
                          timeZone: "Asia/Tashkent",
                        })}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <h3>Your workspace is connected.</h3>
            <p>
              No official records exist yet. Public demo content remains labeled
              until you publish.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
