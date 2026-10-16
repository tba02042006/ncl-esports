import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const uid = {
  owner: "10000000-0000-4000-8000-000000000001",
  admin: "10000000-0000-4000-8000-000000000002",
  editor: "10000000-0000-4000-8000-000000000003",
  outsider: "10000000-0000-4000-8000-000000000004",
};
const loc = { uz: "Sinov", ru: "Тест", en: "Test" };
test("PostgreSQL migration: RLS, role boundaries, publication, concurrency, graph integrity and audit", async (t) => {
  const db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select,insert,delete on storage.objects to anon,authenticated;create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;`,
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610160001_ncl_admin.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (const [role, id] of Object.entries(uid)) {
    await db.query("insert into auth.users values($1)", [id]);
    if (role !== "outsider")
      await db.query("insert into ncl_admins(user_id,role) values($1,$2)", [
        id,
        role,
      ]);
  }
  async function as(role) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      uid[role] ?? "",
    ]);
    await db.exec(role === "anon" ? "set role anon" : "set role authenticated");
  }
  const save = async (kind, data, status = "draft", id = null, version = 0) =>
    (
      await db.query("select ncl_save($1,$2,$3,$4::jsonb,$5) as id", [
        id,
        kind,
        status,
        JSON.stringify(data),
        version,
      ])
    ).rows[0].id;
  const tournamentData = {
    name: loc,
    slug: "test-cup",
    startsAt: null,
    endsAt: null,
    format: "single_elimination",
    teamLimit: 4,
    rules: loc,
    banner: null,
  };
  let tournament,
    teamIds = [],
    fixtures = [];
  await t.test(
    "outsiders and anonymous clients cannot mutate or call internal helpers",
    async () => {
      await as("outsider");
      await assert.rejects(
        save("tournaments", tournamentData),
        /Administrator access/,
      );
      await assert.rejects(
        db.exec(
          `insert into ncl_admins(user_id,role) values('${uid.outsider}','owner')`,
        ),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select ncl_team_for(gen_random_uuid(),0)"),
        /permission denied/,
      );
      await as("anon");
      await assert.rejects(
        save("tournaments", tournamentData),
        /permission denied/,
      );
    },
  );
  await t.test(
    "editor can draft but cannot publish, manage users or set media public",
    async () => {
      await as("editor");
      tournament = await save("tournaments", tournamentData);
      await assert.rejects(
        save("tournaments", {
          ...tournamentData,
          slug: "bad-null-format",
          format: null,
        }),
        /cannot be null/,
      );
      await assert.rejects(
        save("universities", { name: loc, logo: null, website: 13 }),
        /must be text/,
      );

      await assert.rejects(
        save("tournaments", tournamentData, "published", tournament, 1),
        /Editors may edit drafts/,
      );
      await assert.rejects(
        db.query("select ncl_manage_admin($1,$2)", [uid.outsider, "owner"]),
        /Owner required/,
      );
      await assert.rejects(
        db.query("select ncl_media_visibility(gen_random_uuid(),true)"),
        /Publishing administrator/,
      );
    },
  );
  await t.test(
    "drafts stay private, admins publish and stale writes are rejected",
    async () => {
      await as("anon");
      assert.equal(
        (await db.query("select * from ncl_content")).rows.length,
        0,
      );
      await as("admin");
      await save("tournaments", tournamentData, "published", tournament, 1);
      await assert.rejects(
        save("tournaments", tournamentData, "published", tournament, 1),
        /Record changed/,
      );
      await as("anon");
      assert.equal(
        (await db.query("select * from ncl_content")).rows.length,
        1,
      );
    },
  );
  await t.test(
    "complete seeds generate a linked draft bracket, never a fake result",
    async () => {
      await as("admin");
      for (let slot = 1; slot <= 4; slot++)
        teamIds.push(
          await save(
            "teams",
            {
              name: loc,
              tournamentId: tournament,
              universityId: null,
              slot,
              logo: null,
            },
            "published",
          ),
        );
      await db.query("select ncl_generate_bracket($1)", [tournament]);
      fixtures = (
        await db.query(
          "select * from ncl_content where kind='matches' order by (data->>'round')::int,(data->>'position')::int",
        )
      ).rows;
      assert.equal(fixtures.length, 3);
      assert.ok(
        fixtures.every(
          (r) =>
            r.status === "draft" &&
            r.data.winnerId === null &&
            r.data.maps.length === 0,
        ),
      );
      await assert.rejects(
        db.query("select ncl_generate_bracket($1)", [tournament]),
        /already has fixtures/,
      );
      for (const f of fixtures)
        await save("matches", f.data, "published", f.id, 1);
    },
  );
  await t.test(
    "wrong winners, source cycles and overrides without reasons are rejected",
    async () => {
      await as("admin");
      const first = fixtures[0];
      await assert.rejects(
        save("matches", { ...first.data, round: 3 }, "published", first.id, 2),
        /Remove downstream source links/,
      );
      await assert.rejects(
        save("matches", first.data, "published", first.id, null),
        /Record changed/,
      );
      const maps = [
        { name: "Mirage", scores: [13, 6] },
        { name: "Nuke", scores: [13, 8] },
      ];
      await assert.rejects(
        save(
          "matches",
          {
            ...first.data,
            status: "finished",
            resultConfirmed: true,
            winnerId: teamIds[1],
            maps,
          },
          "published",
          first.id,
          2,
        ),
        /winner must match/,
      );
      await assert.rejects(
        save(
          "matches",
          {
            ...first.data,
            sourceIds: [fixtures[2].id, null],
            teamIds: [null, teamIds[1]],
          },
          "published",
          first.id,
          2,
        ),
        /preceding match/,
      );
      await assert.rejects(
        save(
          "matches",
          { ...first.data, manualOverride: true, overrideReason: "" },
          "published",
          first.id,
          2,
        ),
        /reason/,
      );
      await save(
        "matches",
        {
          ...first.data,
          status: "finished",
          resultConfirmed: true,
          winnerId: teamIds[0],
          maps,
        },
        "published",
        first.id,
        2,
      );
      await db.exec("reset role");
      assert.equal(
        (await db.query("select ncl_team_for($1,0) as team", [fixtures[2].id]))
          .rows[0].team,
        teamIds[0],
      );
    },
  );
  await t.test(
    "started descendants freeze upstream results; references prevent unsafe deletion",
    async () => {
      await as("admin");
      const second = fixtures[1];
      await save(
        "matches",
        {
          ...second.data,
          status: "finished",
          resultConfirmed: true,
          winnerId: teamIds[2],
          maps: [
            { name: "Mirage", scores: [13, 1] },
            { name: "Nuke", scores: [13, 2] },
          ],
        },
        "published",
        second.id,
        2,
      );
      await save(
        "matches",
        { ...fixtures[2].data, status: "live" },
        "published",
        fixtures[2].id,
        2,
      );
      await assert.rejects(
        save(
          "matches",
          { ...fixtures[0].data },
          "published",
          fixtures[0].id,
          3,
        ),
        /dependent match has started/,
      );
      await assert.rejects(
        db.query("select ncl_delete($1,1)", [teamIds[0]]),
        /referenced/,
      );
    },
  );
  await t.test("archiving a parent hides its public descendants", async () => {
    await save("tournaments", tournamentData, "archived", tournament, 2);
    await as("anon");
    assert.equal((await db.query("select * from ncl_content")).rows.length, 0);
  });
  await t.test(
    "only owner manages administrators; final owner cannot be removed; audit is append-only",
    async () => {
      await as("admin");
      await assert.rejects(
        db.query("select ncl_manage_admin($1,$2)", [uid.outsider, "admin"]),
        /Owner required/,
      );
      await as("owner");
      await assert.rejects(
        db.query("select ncl_manage_admin($1,null)", [uid.owner]),
        /final owner/,
      );
      await db.query("select ncl_manage_admin($1,$2)", [
        uid.outsider,
        "editor",
      ]);
      assert.ok((await db.query("select * from ncl_audit")).rows.length >= 12);
      await assert.rejects(
        db.exec("delete from ncl_audit"),
        /permission denied/,
      );
    },
  );

  await t.test(
    "storage policies expose only explicitly published image objects",
    async () => {
      await as("admin");
      const imageId = "20000000-0000-4000-8000-000000000001",
        otherId = "20000000-0000-4000-8000-000000000002";
      const path = `${uid.admin}/${imageId}.webp`;
      await db.query(
        "insert into storage.objects(bucket_id,name) values($1,$2),($1,$3)",
        ["ncl-media", path, `${uid.admin}/${otherId}.webp`],
      );
      await db.query(
        "insert into ncl_media(id,path,name,created_by) values($1,$2,$3,$4)",
        [imageId, path, "Logo", uid.admin],
      );
      await as("anon");
      assert.equal(
        (await db.query("select * from storage.objects")).rows.length,
        0,
      );
      await as("admin");
      await db.query("select ncl_media_visibility($1,true)", [imageId]);
      await as("anon");
      assert.equal(
        (await db.query("select * from storage.objects")).rows.length,
        1,
      );
      assert.equal((await db.query("select * from ncl_media")).rows.length, 1);
      await as("admin");
      const sponsor = await save(
        "sponsors",
        {
          name: loc,
          tier: "official",
          logo: `/media/${imageId}`,
          banner: null,
          website: "https://example.com",
          description: loc,
          order: 1,
        },
        "published",
      );
      assert.ok(sponsor);
      await assert.rejects(
        db.query("select ncl_media_visibility($1,false)", [imageId]),
        /published content/,
      );
      await assert.rejects(
        db.exec("truncate ncl_content"),
        /permission denied/,
      );
    },
  );

  await db.close();
});
