import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { allRecords, allMedia, recordTitle } from "@/lib/admin/records";
import { kinds, canManage, type Kind } from "@/lib/admin/schema";
import { RecordForm, type Option } from "@/components/admin/forms";
export default async function EditPage({
  params,
}: {
  params: Promise<{ section: string; id: string }>;
}) {
  const { section, id } = await params;
  if (!kinds.includes(section as Kind)) notFound();
  const kind = section as Kind;
  const { db, role } = await requireAdmin(
    kind === "settings" ? ["owner"] : undefined,
  );
  if (!canManage(kind, role)) notFound();
  const records = await allRecords(db);
  const record =
    id === "new" ? null : records.find((r) => r.id === id && r.kind === kind);
  if (id !== "new" && !record) notFound();
  const options = Object.fromEntries(
    kinds.map((k) => [
      k,
      records
        .filter((r) => r.kind === k)
        .map((r) => ({ id: r.id, label: `${recordTitle(r)} [${r.status}]` })),
    ]),
  ) as Partial<Record<Kind, Option[]>>;
  const media = await allMedia(db);
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <Link href={`/admin/${kind}`} className="eyebrow">
            ← {kind}
          </Link>
          <h1>
            {record ? "Edit" : "Create"}{" "}
            {kind === "universities"
              ? "university"
              : kind === "matches"
                ? "match"
                : kind.endsWith("s")
                  ? kind.slice(0, -1)
                  : kind}
            <span>.</span>
          </h1>
          <p>
            {record
              ? `Version ${record.version} · Concurrent changes are checked before saving.`
              : "New records start as drafts. Nothing is public until explicitly published."}
          </p>
        </div>
      </div>
      {role === "editor" && record?.status !== "draft" && record ? (
        <p className="admin-error">
          Editors cannot modify published or archived records. Ask an admin.
        </p>
      ) : (
        <RecordForm
          key={`${kind}:${record?.id ?? "new"}:${record?.version ?? 0}`}
          kind={kind}
          record={record ?? null}
          role={role}
          options={options}
          media={media}
        />
      )}
    </>
  );
}
