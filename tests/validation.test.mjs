import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {
  schemas,
  safeUrl,
  youtubeId,
  canPublish,
  canManage,
} from "../src/lib/admin/schema.ts";
import { sanitizeImage } from "../src/lib/admin/image.ts";
const loc = { uz: "Sinov", ru: "Тест", en: "Test" },
  uuid = "10000000-0000-4000-8000-000000000001";
test("all published translations are required and URL schemes/credentials are restricted", () => {
  assert.equal(
    schemas.universities.safeParse({
      name: { ...loc, ru: "" },
      logo: null,
      website: null,
    }).success,
    false,
  );
  for (const url of [
    "javascript:alert(1)",
    "data:image/svg+xml,test",
    "http://example.com",
    "https://user:password@example.com",
  ])
    assert.equal(safeUrl.safeParse(url).success, false);
  assert.equal(safeUrl.safeParse("https://example.com/path?x=1").success, true);
  assert.equal(
    schemas.universities.safeParse({
      name: loc,
      logo: "/media/not-a-uuid",
      website: null,
    }).success,
    false,
  );
  assert.equal(
    schemas.universities.safeParse({
      name: loc,
      logo: null,
      website: null,
      role: "owner",
    }).success,
    false,
  );
});
test("YouTube URLs are parsed without accepting unrelated hosts", () => {
  assert.equal(youtubeId("https://youtu.be/abcdefghijk"), "abcdefghijk");
  assert.equal(
    youtubeId("https://www.youtube.com/watch?v=abcdefghijk"),
    "abcdefghijk",
  );
  assert.equal(
    youtubeId("https://youtube.com/live/abcdefghijk"),
    "abcdefghijk",
  );
  for (const value of [
    "https://youtube.com.attacker.test/watch?v=abcdefghijk",
    "https://example.com/watch?v=abcdefghijk",
    "javascript:abcdefghijk",
    "https://youtu.be/short",
  ])
    assert.equal(youtubeId(value), null);
});
test("match validation requires confirmed, completed results and documented overrides", () => {
  const match = {
    tournamentId: uuid,
    teamIds: [uuid, null],
    sourceIds: [null, null],
    round: 0,
    position: 0,
    format: "BO3",
    status: "pending",
    startsAt: null,
    maps: [],
    winnerId: null,
    resultConfirmed: false,
    manualOverride: false,
    overrideReason: "",
  };
  assert.equal(schemas.matches.safeParse(match).success, true);
  assert.equal(
    schemas.matches.safeParse({ ...match, status: "scheduled" }).success,
    false,
  );
  assert.equal(
    schemas.matches.safeParse({
      ...match,
      status: "finished",
      winnerId: uuid,
      resultConfirmed: true,
    }).success,
    false,
  );
  assert.equal(
    schemas.matches.safeParse({ ...match, manualOverride: true }).success,
    false,
  );
  assert.equal(
    schemas.matches.safeParse({
      ...match,
      maps: [{ name: "Map", scores: [13, 13] }],
    }).success,
    false,
  );
  assert.equal(
    schemas.matches.safeParse({
      ...match,
      maps: [
        { name: "Map", scores: [13, 2] },
        { name: "map", scores: [2, 13] },
      ],
    }).success,
    false,
  );
});
test("permission helpers restrict publication and settings", () => {
  assert.equal(canPublish("editor"), false);
  assert.equal(canPublish("admin"), true);
  assert.equal(canManage("settings", "admin"), false);
  assert.equal(canManage("settings", "owner"), true);
});
test("image sanitizer rejects SVG/spoofed payloads and strips metadata while bounding output", async () => {
  await assert.rejects(
    sanitizeImage(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>',
      ),
    ),
    /Unsupported/,
  );
  await assert.rejects(sanitizeImage(Buffer.from("not an image")));
  await assert.rejects(
    sanitizeImage(Buffer.alloc(3 * 1024 * 1024 + 1)),
    /exceeds/,
  );
  const jpeg = await sharp({
    create: { width: 2400, height: 1200, channels: 3, background: "#c2ff45" },
  })
    .jpeg()
    .withMetadata()
    .toBuffer();
  const output = await sanitizeImage(jpeg);
  const meta = await sharp(output).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 2048);
  assert.equal(meta.height, 1024);
  assert.equal(meta.exif, undefined);
  assert.equal(meta.icc, undefined);
});

test("public dates format deterministically in Tashkent across timezone boundaries", async () => {
  const { formatUzt } = await import("../src/lib/format.ts");
  assert.equal(
    formatUzt("2026-10-16T22:30:00Z", true),
    "17.10.2026 · 03:30 UZT",
  );
  assert.equal(
    formatUzt("2026-10-16T12:30:00+05:00", true),
    "16.10.2026 · 12:30 UZT",
  );
  assert.equal(formatUzt("invalid"), "—");
});

test("Supabase configuration refuses insecure remote URLs and service keys", async () => {
  const { validatePublicConfig } =
    await import("../src/lib/supabase/config.ts");
  assert.throws(
    () => validatePublicConfig("http://example.com", "public-key"),
    /HTTPS/,
  );
  assert.throws(
    () =>
      validatePublicConfig("https://example.supabase.co", "sb_secret_testonly"),
    /never a secret/,
  );
  const payload = Buffer.from(
    JSON.stringify({ role: "service_role" }),
  ).toString("base64url");
  assert.throws(
    () =>
      validatePublicConfig(
        "https://example.supabase.co",
        `header.${payload}.signature`,
      ),
    /Service-role/,
  );
  assert.equal(
    validatePublicConfig("http://localhost:54329", "local-fixture-key").url,
    "http://localhost:54329",
  );
});
