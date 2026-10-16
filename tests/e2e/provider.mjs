// Local test-only Supabase API fixture backed by the real migration in PostgreSQL.
import { PGlite } from "@electric-sql/pglite";
import { createServer } from "node:http";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
if (process.env.NCL_E2E_FIXTURE !== "1")
  throw new Error(
    "This test-only fixture must be explicitly enabled. It is not an authentication service.",
  );
const db = new PGlite();
await db.exec(
  `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select,insert,delete on storage.objects to anon,authenticated;create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;`,
);
await db.exec(
  await readFile(
    new URL(
      "../../supabase/migrations/202610160001_ncl_admin.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
const users = ["owner", "admin", "editor"].map((role, i) => ({
  id: `10000000-0000-4000-8000-00000000000${i + 1}`,
  aud: "authenticated",
  role: "authenticated",
  email: `${role}@ncl.test`,
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: new Date().toISOString(),
  identities: [],
  nclRole: role,
}));
for (const u of users) {
  await db.query("insert into auth.users values($1)", [u.id]);
  await db.query("insert into ncl_admins(user_id,role) values($1,$2)", [
    u.id,
    u.nclRole,
  ]);
}
function jwt(u) {
  const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64url"),
    payload = Buffer.from(
      JSON.stringify({
        sub: u.id,
        aud: "authenticated",
        iss: "http://localhost:54329/auth/v1",
        role: "authenticated",
        email: u.email,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      }),
    ).toString("base64url");
  return `${header}.${payload}.${createHmac("sha256", "local-fixture-only").update(`${header}.${payload}`).digest("base64url")}`;
}
const files = new Map();
let queue = Promise.resolve();
createServer(async (req, res) => {
  const buffers = [];
  for await (const chunk of req) buffers.push(chunk);
  const raw = Buffer.concat(buffers);
  const url = new URL(req.url, "http://localhost:54329");
  const token = req.headers.authorization?.replace("Bearer ", "");
  let user;
  try {
    user = users.find(
      (u) =>
        u.id === JSON.parse(Buffer.from(token.split(".")[1], "base64url")).sub,
    );
  } catch {}
  function out(status, data) {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify(data));
  }
  if (url.pathname === "/auth/v1/token") {
    const body = JSON.parse(raw);
    const u = users.find((u) => u.email === body.email);
    if (!u || body.password !== "local-test-password")
      return out(400, { message: "Invalid login credentials" });
    return out(200, {
      access_token: jwt(u),
      refresh_token: "fixture-refresh",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user: u,
    });
  }
  if (url.pathname === "/auth/v1/user")
    return out(user ? 200 : 401, user ?? { message: "Unauthorized" });
  if (url.pathname === "/auth/v1/logout") {
    res.writeHead(204);
    return res.end();
  }
  if (url.pathname.startsWith("/storage/v1/object/sign/")) {
    const path = decodeURIComponent(
      url.pathname.slice("/storage/v1/object/sign/ncl-media/".length),
    );
    if (req.method === "POST")
      return out(200, {
        signedURL: `/object/sign/ncl-media/${path}?token=testonly`,
      });
    if (files.has(path)) {
      res.writeHead(200, { "Content-Type": "image/webp" });
      return res.end(files.get(path));
    }
    return out(404, { message: "Not found" });
  }
  if (url.pathname.startsWith("/storage/v1/object/ncl-media/")) {
    const path = decodeURIComponent(
      url.pathname.slice("/storage/v1/object/ncl-media/".length),
    );
    if (!user) return out(401, { message: "Unauthorized" });
    files.set(path, raw);
    return out(200, { Key: `ncl-media/${path}`, Id: crypto.randomUUID() });
  }
  const run = async () => {
    try {
      const result = await db.transaction(async (tx) => {
        await tx.exec(`set local role ${user ? "authenticated" : "anon"}`);
        await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
          user?.id ?? "",
        ]);
        if (url.pathname.startsWith("/rest/v1/rpc/")) {
          const fn = url.pathname.slice("/rest/v1/rpc/".length);
          if (!/^ncl_[a-z_]+$/.test(fn)) throw Error("Invalid function");
          const args = JSON.parse(raw);
          const keys = Object.keys(args);
          return {
            rpc: true,
            result: (
              await tx.query(
                `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(",")}) as result`,
                keys.map((k) =>
                  typeof args[k] === "object" && args[k] !== null
                    ? JSON.stringify(args[k])
                    : args[k],
                ),
              )
            ).rows[0].result,
          };
        }
        const table = url.pathname.slice("/rest/v1/".length);
        if (
          !["ncl_content", "ncl_admins", "ncl_media", "ncl_audit"].includes(
            table,
          )
        )
          throw Error("Invalid table");
        if (req.method === "POST") {
          const body = JSON.parse(raw);
          const columns = Object.keys(body);
          await tx.query(
            `insert into ${table}(${columns.join(",")}) values(${columns.map((_, i) => `$${i + 1}`).join(",")})`,
            Object.values(body),
          );
          return { rows: [] };
        }
        const values = [],
          where = [];
        for (const [key, v] of url.searchParams) {
          if (/^[a-z_]+$/.test(key) && v.startsWith("eq.")) {
            values.push(v.slice(3));
            where.push(`${key}=$${values.length}`);
          }
        }
        let sql = `select * from ${table}${where.length ? " where " + where.join(" and ") : ""}`;
        const order = url.searchParams.get("order");
        if (order && /^[a-z_,.]+$/.test(order))
          sql +=
            " order by " +
            order
              .split(",")
              .map((o) => {
                const [k, dir] = o.split(".");
                return `${k} ${dir === "desc" ? "desc" : "asc"}`;
              })
              .join(",");
        sql += ` limit ${Math.min(500, Number(url.searchParams.get("limit")) || 500)} offset ${Number(url.searchParams.get("offset")) || 0}`;
        return { rows: (await tx.query(sql, values)).rows };
      });
      if (result.rpc) return out(200, result.result);
      const single = req.headers.accept?.includes(
        "application/vnd.pgrst.object+json",
      );
      if (single && result.rows.length !== 1)
        return out(406, { message: "Single row not found", code: "PGRST116" });
      return out(200, single ? result.rows[0] : result.rows);
    } catch (e) {
      return out(400, { message: e.message, code: e.code ?? "error" });
    }
  };
  queue = queue.then(run, run);
}).listen(54329, "127.0.0.1", () =>
  console.log("Local PostgreSQL/Supabase fixture ready on 54329"),
);
