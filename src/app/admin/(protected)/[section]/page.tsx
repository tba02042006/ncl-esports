import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { allRecords, allMedia, recordTitle } from "@/lib/admin/records";
import { kinds, type Kind } from "@/lib/admin/schema";
import { descriptions } from "@/lib/admin/fields";
import {
  AdministratorForm,
  UploadForm,
  MediaVisibilityForm,
  PasswordForm,
  BracketGenerator,
} from "@/components/admin/forms";
export default async function Collection({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    saved?: string;
    tournament?: string;
    p?: string;
  }>;
}) {
  const { section } = await params;
  const query = await searchParams;
  const special = ["media", "administrators", "account", "bracket", "audit"];
  if (!kinds.includes(section as Kind) && !special.includes(section))
    notFound();
  const { db, role } = await requireAdmin(
    ["settings", "administrators"].includes(section)
      ? ["owner"]
      : section === "audit"
        ? ["owner", "admin"]
        : undefined,
  );
  const records = await allRecords(db);
  const title =
    section === "live"
      ? "Broadcast"
      : section === "content"
        ? "Site content"
        : section === "account"
          ? "My account"
          : section === "audit"
            ? "Audit log"
            : section;
  const heading = (
    <div className="admin-page-heading">
      <div>
        <span className="eyebrow">NCL / CONTROL CENTER</span>
        <h1>
          {title}
          <span>.</span>
        </h1>
        <p>
          {descriptions[section as Kind] ??
            "Manage your authorized league workspace."}
        </p>
      </div>
      {kinds.includes(section as Kind) &&
        !(
          ["settings", "live"].includes(section) &&
          records.some((r) => r.kind === section)
        ) && (
          <Link href={`/admin/${section}/new`} className="admin-primary">
            Create record <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        )}
    </div>
  );
  const saved =
    query.saved === "1" ? (
      <p role="status" className="admin-success">
        Saved to Supabase successfully.
      </p>
    ) : null;
  if (section === "account")
    return (
      <>
        {heading}
        <PasswordForm />
      </>
    );
  if (section === "administrators") {
    const { data, error } = await db
      .from("ncl_admins")
      .select("*")
      .order("created_at");
    if (error) throw new Error("Administrator query failed");
    return (
      <>
        {heading}
        {saved}
        <AdministratorForm />
        <section className="admin-panel">
          <h2>Authorized users</h2>
          <p>
            UUIDs refer to Supabase Authentication users. Never grant roles
            through user-editable metadata.
          </p>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User UUID</th>
                  <th>Role</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.user_id}>
                    <td>
                      <code>{row.user_id}</code>
                    </td>
                    <td>{row.role}</td>
                    <td>{row.after_data?.data?.overrideReason || "—"}</td>
                    <td>
                      {new Date(row.created_at).toLocaleDateString("en-GB", {
                        timeZone: "Asia/Tashkent",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  }
  if (section === "media") {
    const data = await allMedia(db);
    const mediaPage = Math.max(
      0,
      Math.min(399, Math.floor(Number(query.p) || 0)),
    );
    const displayed = data.slice(mediaPage * 50, mediaPage * 50 + 50);
    return (
      <>
        {heading}
        {saved}
        <UploadForm />
        <div className="admin-media-grid">
          {displayed.map((m) => (
            <article className="admin-panel" key={m.id}>
              <a
                className="admin-media-preview"
                href={`/media/${m.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/media/${m.id}`} alt={m.name} loading="lazy" />
              </a>
              <h3>{m.name}</h3>
              <p
                className={`admin-badge ${m.published ? "published" : "draft"}`}
              >
                {m.published ? "public" : "private"}
              </p>
              <code>/media/{m.id}</code>
              {role !== "editor" && <MediaVisibilityForm media={m} />}
            </article>
          ))}
        </div>
        {!data.length && (
          <div className="admin-empty">No uploaded images yet.</div>
        )}
        <div className="admin-pagination">
          {mediaPage > 0 && (
            <Link href={`/admin/media?p=${mediaPage - 1}`}>← Previous</Link>
          )}
          {(mediaPage + 1) * 50 < data.length && (
            <Link href={`/admin/media?p=${mediaPage + 1}`}>Next →</Link>
          )}
        </div>
      </>
    );
  }
  if (section === "audit") {
    const { data, error } = await db
      .from("ncl_audit")
      .select("id,actor,action,entity_id,created_at,after_data")
      .order("id", { ascending: false })
      .limit(100);
    if (error) throw new Error("Audit query failed");
    return (
      <>
        {heading}
        <section className="admin-panel">
          <p>
            Last 100 recorded changes. Audit records are append-only for
            application users.
          </p>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Entity</th>
                  <th>Override reason</th>
                  <th>Time (UZT)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id}>
                    <td>{row.action}</td>
                    <td>
                      <code>{row.actor}</code>
                    </td>
                    <td>
                      <code>{row.entity_id}</code>
                    </td>
                    <td>{row.after_data?.data?.overrideReason || "—"}</td>
                    <td>
                      {new Date(row.created_at).toLocaleString("en-GB", {
                        timeZone: "Asia/Tashkent",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  }
  if (section === "bracket") {
    const tournaments = records.filter((r) => r.kind === "tournaments");
    const selected =
      tournaments.find((r) => r.id === query.tournament) ?? tournaments[0];
    const fixtures = records
      .filter(
        (r) => r.kind === "matches" && r.data.tournamentId === selected?.id,
      )
      .sort(
        (a, b) =>
          Number(a.data.round) - Number(b.data.round) ||
          Number(a.data.position) - Number(b.data.position),
      );
    return (
      <>
        {heading}
        {saved}
        {role !== "editor" && (
          <BracketGenerator
            tournaments={tournaments.map((r) => ({
              id: r.id,
              label: recordTitle(r),
            }))}
          />
        )}
        <form className="admin-list-filter">
          <label>
            Inspect tournament
            <select name="tournament" defaultValue={selected?.id}>
              {tournaments.map((r) => (
                <option key={r.id} value={r.id}>
                  {recordTitle(r)}
                </option>
              ))}
            </select>
          </label>
          <button className="admin-secondary">Show bracket</button>
        </form>
        <div className="admin-bracket">
          {Array.from(new Set(fixtures.map((r) => Number(r.data.round)))).map(
            (round) => (
              <section key={round}>
                <h2>Round {round + 1}</h2>
                {fixtures
                  .filter((r) => Number(r.data.round) === round)
                  .map((r) => (
                    <Link
                      className="admin-bracket-match"
                      href={`/admin/matches/${r.id}`}
                      key={r.id}
                    >
                      <span>{recordTitle(r)}</span>
                      <strong>
                        {String(r.data.status)} · {r.status}
                      </strong>
                      <small>
                        Sources:{" "}
                        {(r.data.sourceIds as (string | null)[])
                          .map((id) =>
                            id
                              ? recordTitle(records.find((r) => r.id === id)!)
                              : "Direct seed",
                          )
                          .join(" / ")}
                      </small>
                      <small>
                        Winner:{" "}
                        {r.data.winnerId
                          ? recordTitle(
                              records.find((t) => t.id === r.data.winnerId)!,
                            )
                          : "Not confirmed"}
                      </small>
                    </Link>
                  ))}
              </section>
            ),
          )}
        </div>
        {!fixtures.length && (
          <div className="admin-empty">
            No fixtures. Fill team slots, then generate a bracket or create
            matches manually.
          </div>
        )}
      </>
    );
  }
  const filtered = records.filter(
    (r) =>
      r.kind === section &&
      (!query.status || r.status === query.status) &&
      (!query.q ||
        recordTitle(r).toLowerCase().includes(query.q.toLowerCase())),
  );
  const page = Math.max(0, Math.min(399, Math.floor(Number(query.p) || 0)));
  const rows = filtered.slice(page * 50, page * 50 + 50);
  return (
    <>
      {heading}
      {saved}
      <form className="admin-list-filter">
        <label>
          Search records
          <input
            name="q"
            defaultValue={query.q}
            placeholder="Search by title…"
          />
        </label>
        <label>
          Publication
          <select name="status" defaultValue={query.status ?? ""}>
            <option value="">All states</option>
            <option>draft</option>
            <option>published</option>
            <option>archived</option>
          </select>
        </label>
        <button className="admin-secondary">Apply filters</button>
      </form>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <h2>
            {filtered.length} saved{" "}
            {filtered.length === 1 ? "record" : "records"}
          </h2>
          <span className="admin-meta">PAGE {page + 1}</span>
        </div>
        {rows.length ? (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Record</th>
                  <th>Publication</th>
                  <th>Updated (UZT)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{recordTitle(r)}</strong>
                      <small>{r.id}</small>
                    </td>
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
                    <td>
                      <Link
                        className="admin-inline-link"
                        href={`/admin/${section}/${r.id}`}
                      >
                        Edit ↗
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <h3>No records found.</h3>
            <p>
              Create a record or change your filters. No unsaved operations are
              treated as persistent.
            </p>
          </div>
        )}
        <div className="admin-pagination">
          {page > 0 && (
            <Link
              href={`/admin/${section}?${new URLSearchParams({ q: query.q ?? "", status: query.status ?? "", p: String(page - 1) })}`}
            >
              ← Previous
            </Link>
          )}
          {(page + 1) * 50 < filtered.length && (
            <Link
              href={`/admin/${section}?${new URLSearchParams({ q: query.q ?? "", status: query.status ?? "", p: String(page + 1) })}`}
            >
              Next →
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
