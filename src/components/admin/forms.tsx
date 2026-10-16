"use client";
import { ArrowUpRight } from "lucide-react";
import { useActionState, useState, useSyncExternalStore } from "react";
import { fields, type Field } from "@/lib/admin/fields";
import {
  type Kind,
  type Role,
  type ContentRecord,
  type MediaRecord,
  canPublish,
} from "@/lib/admin/schema";
import {
  saveContent,
  deleteContent,
  signIn,
  manageAdmin,
  uploadMedia,
  mediaVisibility,
  changePassword,
  type ActionState,
  generateBracket,
  acceptInvitation,
} from "@/lib/admin/actions";
const subscribeHydration = () => () => {};
export type Option = { id: string; label: string };
export function RecordForm({
  kind,
  record,
  role,
  options,
  media,
}: {
  kind: Kind;
  record: ContentRecord | null;
  role: Role;
  options: Partial<Record<Kind, Option[]>>;
  media: MediaRecord[];
}) {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const initial: Record<string, unknown> = Object.fromEntries(
    fields[kind]
      .filter((f) => !f.key.includes("."))
      .map((f) => [
        f.key,
        f.type === "localized" || f.type === "longLocalized"
          ? { uz: "", ru: "", en: "" }
          : f.type === "boolean"
            ? false
            : f.type === "number"
              ? 0
              : f.type === "maps"
                ? []
                : f.type === "select"
                  ? f.key === "teamLimit"
                    ? 16
                    : f.options![0]
                  : null,
      ]),
  );
  if (kind === "matches") {
    initial.teamIds = [null, null];
    initial.sourceIds = [null, null];
    initial.overrideReason = "";
  }
  if (kind === "teams") initial.slot = 1;
  const [publication, setPublication] = useState(record?.status ?? "draft");
  const [data, setData] = useState<Record<string, unknown>>(
    record?.data ?? initial,
  );
  const [locale, setLocale] = useState<"uz" | "ru" | "en">("uz");
  const action = saveContent.bind(
    null,
    kind,
    record?.id ?? null,
    record?.version ?? 0,
  );
  const [state, submit, pending] = useActionState(action, {});
  function get(key: string) {
    const [a, b] = key.split(".");
    return b ? (data[a] as unknown[])?.[Number(b)] : data[a];
  }
  function set(key: string, value: unknown) {
    const [a, b] = key.split(".");
    setData((old) =>
      b
        ? {
            ...old,
            [a]: (old[a] as unknown[]).map((v, i) =>
              i === Number(b) ? value : v,
            ),
          }
        : { ...old, [a]: value },
    );
  }
  function render(f: Field) {
    const value = get(f.key);
    const id = `field-${f.key}`;
    let input;
    if (f.type === "localized" || f.type === "longLocalized") {
      const values = value as Record<string, string>;
      const props = {
        id,
        lang: locale,
        value: values?.[locale] ?? "",
        onChange: (
          e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
        ) => set(f.key, { ...values, [locale]: e.target.value }),
        maxLength: f.type === "localized" ? 180 : 20000,
      };
      input = (
        <div className="translated-input">
          <small>{locale.toUpperCase()}</small>
          {f.type === "localized" ? (
            <input {...props} />
          ) : (
            <textarea {...props} rows={7} />
          )}
        </div>
      );
    } else if (
      f.type === "select" ||
      f.type === "relation" ||
      f.type === "media"
    ) {
      const opts =
        f.type === "select"
          ? f.options!.map((v) => ({ id: v, label: v.replaceAll("_", " ") }))
          : f.type === "media"
            ? media.map((m) => ({
                id: `/media/${m.id}`,
                label: `${m.name} ${m.published ? "(public)" : "(private)"}`,
              }))
            : (options[f.relation!] ?? []);
      input = (
        <select
          id={id}
          value={String(value ?? "")}
          onChange={(e) =>
            set(
              f.key,
              f.key === "teamLimit"
                ? Number(e.target.value)
                : f.key === "overrideReason"
                  ? e.target.value
                  : e.target.value || null,
            )
          }
        >
          {f.type !== "select" && (
            <option value="">{f.required ? "Select a record" : "None"}</option>
          )}
          {opts.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      );
    } else if (f.type === "boolean")
      input = (
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => set(f.key, e.target.checked)}
        />
      );
    else if (f.type === "maps") {
      const maps = (value ?? []) as {
        name: string;
        scores: [number, number];
      }[];
      input = (
        <div className="map-editor">
          {maps.map((m, i) => (
            <div key={i}>
              <label>
                <span>Map {i + 1}</span>
                <input
                  aria-label={`Map ${i + 1} name`}
                  value={m.name}
                  maxLength={60}
                  onChange={(e) =>
                    set(
                      f.key,
                      maps.map((m, j) =>
                        i === j ? { ...m, name: e.target.value } : m,
                      ),
                    )
                  }
                />
              </label>
              {[0, 1].map((side) => (
                <label key={side}>
                  <span>Team {side ? "B" : "A"}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    aria-label={`Map ${i + 1} team ${side ? "B" : "A"} score`}
                    value={m.scores[side]}
                    onChange={(e) =>
                      set(
                        f.key,
                        maps.map((m, j) =>
                          i === j
                            ? {
                                ...m,
                                scores: m.scores.map((s, n) =>
                                  n === side ? Number(e.target.value) : s,
                                ),
                              }
                            : m,
                        ),
                      )
                    }
                  />
                </label>
              ))}
              <button
                type="button"
                className="admin-icon-button"
                aria-label={`Remove map ${i + 1}`}
                onClick={() =>
                  set(
                    f.key,
                    maps.filter((_, j) => i !== j),
                  )
                }
              >
                ×
              </button>
            </div>
          ))}
          {maps.length < 5 && (
            <button
              className="admin-secondary"
              type="button"
              onClick={() =>
                set(f.key, [...maps, { name: "", scores: [0, 0] }])
              }
            >
              Add completed map
            </button>
          )}
        </div>
      );
    } else if (f.type === "date") {
      const local = value
        ? new Date(Date.parse(String(value)) + 5 * 3600000)
            .toISOString()
            .slice(0, 16)
        : "";
      input = (
        <input
          id={id}
          type="datetime-local"
          value={local}
          onChange={(e) =>
            set(
              f.key,
              e.target.value
                ? new Date(`${e.target.value}:00+05:00`).toISOString()
                : null,
            )
          }
        />
      );
    } else
      input = (
        <input
          id={id}
          type={
            f.type === "url" ? "url" : f.type === "number" ? "number" : "text"
          }
          value={String(value ?? "")}
          maxLength={f.key === "overrideReason" ? 2000 : 2048}
          min={0}
          onChange={(e) =>
            set(
              f.key,
              f.type === "number"
                ? Number(e.target.value)
                : f.key === "overrideReason"
                  ? e.target.value
                  : e.target.value || null,
            )
          }
        />
      );
    return (
      <div
        className={`admin-field ${f.type === "boolean" ? "checkbox-field" : ""} ${f.type === "maps" || f.type === "longLocalized" ? "wide" : ""}`}
        key={f.key}
      >
        <label htmlFor={id}>
          {f.label}
          {f.required && <span className="required-mark"> *</span>}
        </label>
        {input}
        {f.help && <small>{f.help}</small>}
        {f.type === "media" && Boolean(value) && (
          <a
            href={String(value)}
            target="_blank"
            rel="noreferrer"
            className="admin-inline-link"
          >
            Preview image <ArrowUpRight size={12} aria-hidden="true" />
          </a>
        )}
      </div>
    );
  }
  return (
    <>
      <form action={submit} className="admin-editor">
        <fieldset disabled={!hydrated || pending}>
          <div className="editor-top">
            <div>
              <span className="eyebrow">
                {record ? "EDIT RECORD" : "NEW RECORD"}
              </span>
              <p>
                All three translations are required. Plain text only; HTML is
                never executed.
              </p>
            </div>
            <div className="locale-tabs" aria-label="Editing language">
              {(["uz", "ru", "en"] as const).map((l) => (
                <button
                  type="button"
                  key={l}
                  aria-pressed={locale === l}
                  className={locale === l ? "active" : ""}
                  onClick={() => setLocale(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <input type="hidden" name="document" value={JSON.stringify(data)} />
          <div className="admin-fields">{fields[kind].map(render)}</div>
          <div className="editor-footer">
            <label>
              Publication
              <select
                name="publication"
                value={publication}
                onChange={(e) =>
                  setPublication(
                    e.target.value as "draft" | "published" | "archived",
                  )
                }
              >
                <option value="draft">Draft — private</option>
                {canPublish(role) && (
                  <>
                    <option value="published">
                      Published — visible publicly
                    </option>
                    <option value="archived">Archived — hidden</option>
                  </>
                )}
              </select>
            </label>
            <Submit pending={pending} label="Save record" />
          </div>
        </fieldset>
        <Feedback state={state} />
      </form>
      {record && canPublish(role) && <DeleteForm record={record} />}
    </>
  );
}
function Submit({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button className="admin-primary" disabled={pending}>
      {pending ? "Working…" : label}
    </button>
  );
}
export function Feedback({ state }: { state: ActionState }) {
  return state.error ? (
    <p role="alert" className="admin-error">
      {state.error}
    </p>
  ) : null;
}
function DeleteForm({ record }: { record: ContentRecord }) {
  const [state, action, pending] = useActionState(
    deleteContent.bind(null, record.id, record.version),
    {},
  );
  return (
    <form action={action} className="admin-danger">
      <h3>Permanent deletion</h3>
      <p>
        Referenced records cannot be deleted. Prefer archiving to preserve
        history.
      </p>
      <label>
        Type DELETE
        <input name="confirm" required autoComplete="off" />
      </label>
      <Submit pending={pending} label="Delete permanently" />
      <Feedback state={state} />
    </form>
  );
}
export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <form action={action}>
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
        />
      </label>
      <Submit pending={pending} label="Sign in securely" />
      <Feedback state={state} />
    </form>
  );
}
export function AdministratorForm() {
  const [state, action, pending] = useActionState(manageAdmin, {});
  return (
    <form action={action} className="admin-editor compact-form">
      <h2>Authorize an existing Auth user</h2>
      <p>
        Invite the user in Supabase Authentication first. Paste their user UUID
        here. Removing access takes effect on the next request. The final owner
        cannot be removed.
      </p>
      <label>
        Supabase Auth user UUID
        <input
          name="userId"
          required
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        />
      </label>
      <label>
        Role
        <select name="role">
          <option value="editor">Editor — drafts only</option>
          <option value="admin">Admin — publish content</option>
          <option value="owner">Owner — settings and administrators</option>
          <option value="remove">Remove access</option>
        </select>
      </label>
      <Submit pending={pending} label="Update administrator access" />
      <Feedback state={state} />
    </form>
  );
}
export function UploadForm() {
  const [state, action, pending] = useActionState(uploadMedia, {});
  return (
    <form action={action} className="admin-editor compact-form">
      <h2>Upload image</h2>
      <p>
        PNG, JPEG or WebP · maximum 3 MB and 16 megapixels. Images are decoded,
        resized and re-encoded to WebP with metadata removed. Uploads start
        private; an admin must publish them before public content can use them.
      </p>
      <label>
        Image file
        <input
          name="file"
          type="file"
          required
          accept="image/png,image/jpeg,image/webp"
        />
      </label>
      <Submit pending={pending} label="Upload private image" />
      <Feedback state={state} />
    </form>
  );
}
export function MediaVisibilityForm({ media }: { media: MediaRecord }) {
  const [state, action, pending] = useActionState(mediaVisibility, {});
  return (
    <form action={action}>
      <input type="hidden" name="id" value={media.id} />
      <input type="hidden" name="published" value={String(!media.published)} />
      <Submit
        pending={pending}
        label={media.published ? "Make private" : "Publish image"}
      />
      <Feedback state={state} />
    </form>
  );
}
export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {});
  return (
    <form action={action} className="admin-editor compact-form">
      <h2>Change your password</h2>
      <p>Use at least 12 characters. This signs you out of all sessions.</p>
      <label>
        Current password
        <input
          type="password"
          name="current"
          required
          autoComplete="current-password"
        />
      </label>
      <label>
        New password
        <input
          type="password"
          name="password"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
        />
      </label>
      <label>
        Repeat new password
        <input
          type="password"
          name="confirm"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
        />
      </label>
      <Submit pending={pending} label="Update password and sign out" />
      <Feedback state={state} />
    </form>
  );
}
export function BracketGenerator({ tournaments }: { tournaments: Option[] }) {
  const [state, action, pending] = useActionState(generateBracket, {});
  return (
    <form action={action} className="admin-editor compact-form">
      <h2>Generate knockout fixtures</h2>
      <p>
        Creates linked draft matches from the tournament’s seeded team slots.
        Requires a single-elimination tournament with every slot filled (2–64
        teams) and no existing matches. No outcomes or dates are generated.
      </p>
      <label>
        Tournament
        <select name="tournamentId" required>
          <option value="">Select tournament</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <Submit pending={pending} label="Generate draft bracket" />
      <Feedback state={state} />
    </form>
  );
}
export function InvitationForm({
  token,
  type,
}: {
  token: string;
  type: string;
}) {
  const [state, action, pending] = useActionState(acceptInvitation, {});
  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="type" value={type} />
      <label>
        New password
        <input
          type="password"
          name="password"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
        />
      </label>
      <label>
        Repeat new password
        <input
          type="password"
          name="confirm"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
        />
      </label>
      <Submit pending={pending} label="Set password" />
      <Feedback state={state} />
    </form>
  );
}
