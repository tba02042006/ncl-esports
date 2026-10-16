import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import sharp from "sharp";
const base = process.env.NCL_E2E_APP_URL || "http://localhost:3100";
const b = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
try {
  const errors = [];
  p.on("pageerror", (e) => errors.push(`${p.url()}: ${e.message}`));
  p.setDefaultTimeout(15000);
  await p.goto(base + "/admin");
  await p.waitForURL("**/admin/login");
  await p.getByLabel("Email", { exact: true }).fill("owner@ncl.test");
  await p.getByLabel("Password", { exact: true }).fill("local-test-password");
  await p.getByRole("button", { name: "Sign in securely" }).click();
  await p.getByRole("heading", { name: "Operations overview." }).waitFor();
  console.log("login + protected redirect pass");
  async function localized(label, value) {
    for (const l of ["UZ", "RU", "EN"]) {
      await p.getByRole("button", { name: l, exact: true }).click();
      await p.getByLabel(label).fill(value);
    }
  }
  async function save() {
    await p.getByRole("button", { name: "Save record", exact: true }).click();
    await p
      .getByRole("status")
      .filter({ hasText: "Saved to Supabase successfully." })
      .waitFor();
  }
  await p.goto(base + "/admin/tournaments/new");
  await localized("Name / title", "Test Campus Cup");
  await localized("Rules", "Test competition rules — not official.");
  await p.getByLabel("URL slug").fill("test-campus-cup");
  await p.getByLabel("Team capacity").selectOption("2");
  await save();
  console.log("draft create pass");
  let publicTab = await b.newPage();
  await publicTab.goto(base + "/tournaments?lang=en");
  assert.equal(
    await publicTab
      .getByRole("heading", { name: "Test Campus Cup", exact: true })
      .count(),
    0,
  );
  await publicTab.close();
  await p.getByRole("link", { name: "Edit ↗" }).first().click();
  await p.locator(".editor-footer select").selectOption("published");
  await save();
  console.log("tournament publish pass");
  for (let i = 1; i <= 2; i++) {
    await p.goto(base + "/admin/teams/new");
    await localized("Name / title", `Test Team ${i}`);
    await p
      .locator("select#field-tournamentId, select[name=tournamentId]")
      .selectOption({ label: "Test Campus Cup [published]" });
    await p.getByLabel("Tournament slot").fill(String(i));
    await p.locator(".editor-footer select").selectOption("published");
    await save();
  }
  console.log("team create pass");
  await p.goto(base + "/admin/bracket");
  await p
    .locator("select#field-tournamentId, select[name=tournamentId]")
    .selectOption({ label: "Test Campus Cup" });
  await p.getByRole("button", { name: "Generate draft bracket" }).click();
  await p
    .getByRole("status")
    .filter({ hasText: "Saved to Supabase successfully." })
    .waitFor();
  assert.equal(await p.locator(".admin-bracket-match").count(), 1);
  await p.locator(".admin-bracket-match").first().click();
  await p.getByLabel("Series format").selectOption("BO1");
  await p.getByLabel("Match status").selectOption("finished");
  await p.getByRole("button", { name: "Add completed map" }).click();
  await p.getByRole("textbox", { name: "Map 1 name" }).fill("Mirage");
  await p.getByRole("spinbutton", { name: "Map 1 team A score" }).fill("13");
  await p.getByRole("spinbutton", { name: "Map 1 team B score" }).fill("6");
  await p
    .getByLabel("Confirmed winning team")
    .selectOption({ label: "Test Team 1 [published]" });
  await p.getByLabel("I have checked and confirmed this result").check();
  await p.locator(".editor-footer select").selectOption("published");
  await save();
  console.log("bracket generation + confirmed result pass");
  await p.goto(base + "/teams?lang=en");
  await p.getByRole("heading", { name: "Test Team 1", exact: true }).waitFor();
  assert.equal(await p.locator(".team-card").count(), 2);
  await p.goto(base + "/matches?lang=en");
  assert.equal(await p.locator(".match-card").count(), 1);
  await p.locator(".match-card").click();
  await p.getByRole("dialog").getByText("Mirage · 13 : 6").waitFor();
  await p.keyboard.press("Escape");
  console.log("public published teams/results pass");
  await p.goto(base + "/admin/news/new");
  await localized("Name / title", "Test News Article");
  await localized("Article body", "Test article body in all three languages.");
  await p.getByLabel("URL slug").fill("test-news-article");
  await p.locator(".editor-footer select").selectOption("published");
  await save();
  await p.goto(base + "/news/test-news-article?lang=ru");
  await p
    .getByRole("heading", { name: "Test News Article", exact: true })
    .waitFor();
  await p.getByText("Test article body in all three languages.").waitFor();
  console.log("published news integration pass");
  await p.goto(base + "/admin/administrators");
  await p
    .getByLabel("Supabase Auth user UUID")
    .fill("10000000-0000-4000-8000-000000000001");
  await p.locator("form.admin-editor select[name=role]").selectOption("remove");
  await p.getByRole("button", { name: "Update administrator access" }).click();
  await p.getByRole("alert").filter({ hasText: "final owner" }).waitFor();
  console.log("last owner UI protection pass");
  await sharp({
    create: { width: 400, height: 200, channels: 3, background: "#c2ff45" },
  })
    .png()
    .toFile("/tmp/ncl-upload-test.png");
  await p.goto(base + "/admin/media");
  await p.getByLabel("Image file").setInputFiles("/tmp/ncl-upload-test.png");
  await p.getByRole("button", { name: "Upload private image" }).click();
  await p
    .getByRole("status")
    .filter({ hasText: "Saved to Supabase successfully." })
    .waitFor();
  await p.getByRole("button", { name: "Publish image", exact: true }).click();
  await p
    .getByRole("status")
    .filter({ hasText: "Saved to Supabase successfully." })
    .waitFor();
  console.log("sanitized upload + publish pass");
  await p.goto(base + "/admin/universities/new");
  await localized("Name / title", "Test University");
  await p.getByLabel("University website").fill("https://example.test");
  await p.locator(".editor-footer select").selectOption("published");
  await save();
  await p.goto(base + "/admin/players/new");
  await localized("Name / title", "Test Player");
  await localized("Player role", "Captain");
  await p.getByLabel("Player nickname").fill("TestCaptain");
  await p
    .locator("#field-teamId")
    .selectOption({ label: "Test Team 1 [published]" });
  await p
    .getByLabel("Steam profile")
    .fill("https://steamcommunity.com/id/testcaptain");
  await p
    .locator("#field-photo")
    .selectOption({ label: "ncl-upload-test.png (public)" });
  await p.locator(".editor-footer select").selectOption("published");
  await save();
  await p.goto(base + "/teams?lang=en");
  await p.locator(".team-card").first().click();
  await p
    .getByRole("dialog")
    .getByText("TestCaptain", { exact: false })
    .waitFor();
  await p.getByRole("dialog").getByRole("link", { name: "Steam ↗" }).waitFor();
  await p.keyboard.press("Escape");
  await p.goto(base + "/admin/sponsors/new");
  await localized("Name / title", "Test Partner");
  await localized("Partner profile", "Test-only partner profile.");
  await p
    .locator("#field-logo")
    .selectOption({ label: "ncl-upload-test.png (public)" });
  await p.getByLabel("Display order").fill("1");
  await p.locator(".editor-footer select").selectOption("published");
  await save();
  await p.goto(base + "/sponsors?lang=en");
  await p.getByRole("heading", { name: "Test Partner", exact: true }).waitFor();
  await p.goto(base + "/admin/live/new");
  await localized("Name / title", "Test Broadcast");
  await localized("Broadcast information", "Test broadcast remains offline.");
  await p.locator(".editor-footer select").selectOption("published");
  await save();
  await p.goto(base + "/live?lang=en");
  await p
    .getByRole("heading", { name: "Test Broadcast", exact: true })
    .waitFor();
  assert.equal(await p.locator("iframe").count(), 0);
  await p.goto(base + "/admin/content/new");
  await localized("Name / title", "Test intro placement");
  await localized("Content", "Integration-only league introduction.");
  await p.locator(".editor-footer select").selectOption("published");
  await save();
  await p.goto(base + "/?lang=en");
  await p
    .locator(".hero")
    .getByText("Integration-only league introduction.", { exact: true })
    .waitFor();
  await p.goto(base + "/admin/settings/new");
  await localized("Name / title", "Test league settings");
  await p
    .getByLabel("Featured tournament")
    .selectOption({ label: "Test Campus Cup [published]" });
  await p.getByLabel("Official contact email").fill("league@example.test");
  await p.locator(".editor-footer select").selectOption("published");
  await save();
  await p.goto(base + "/about?lang=en");
  await p.getByRole("link", { name: "league@example.test" }).waitFor();
  console.log(
    "university/player/sponsor/live/content/settings CRUD + public integration pass",
  );

  await p.goto(base + "/admin/news");
  await p.getByRole("link", { name: "Edit ↗" }).first().click();
  await p.locator(".editor-footer select").selectOption("archived");
  await save();
  await p.goto(base + "/admin/news");
  await p.getByRole("link", { name: "Edit ↗" }).first().click();
  await p.getByLabel("Type DELETE").fill("DELETE");
  await p.getByRole("button", { name: "Delete permanently" }).click();
  await p.waitForURL("**/admin?saved=1");
  await p.getByRole("heading", { name: "Operations overview." }).waitFor();
  const removed = await p.goto(base + "/news/test-news-article?lang=en");
  assert.equal(removed.status(), 404);
  console.log("archive + permanent delete flow pass");
  for (const route of [
    "/admin",
    "/admin/tournaments",
    "/admin/tournaments/new",
    "/admin/teams",
    "/admin/teams/new",
    "/admin/players/new",
    "/admin/matches",
    "/admin/matches/new",
    "/admin/bracket",
    "/admin/live/new",
    "/admin/sponsors/new",
    "/admin/news/new",
    "/admin/content/new",
    "/admin/settings/new",
    "/admin/administrators",
    "/admin/media",
    "/admin/audit",
    "/admin/account",
  ]) {
    await p.goto(base + route);
    await p.locator(".admin-page-heading h1").waitFor();
    assert.equal(await p.locator(".admin-error").count(), 0, route + " error");
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      route + " desktop overflow",
    );
    await p.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      route + " mobile overflow",
    );
    await p.setViewportSize({ width: 1440, height: 1000 });
  }
  console.log("18 admin desktop/mobile layouts pass");
  await p.goto(base + "/admin");
  await p.getByRole("heading", { name: "Operations overview." }).waitFor();
  await p.screenshot({ path: "/tmp/ncl-admin-dashboard.png", fullPage: true });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.screenshot({ path: "/tmp/ncl-admin-mobile.png", fullPage: true });
  await p.locator(".admin-mobile-nav summary").click();
  await p
    .locator(".admin-mobile-nav")
    .getByRole("link", { name: "Teams", exact: true })
    .click();
  await p.getByRole("heading", { name: /teams\./i }).waitFor();
  assert.equal(await p.locator(".admin-mobile-nav").getAttribute("open"), null);
  await p.getByRole("button", { name: "Sign out", exact: true }).click();
  await p.getByLabel("Email", { exact: true }).fill("editor@ncl.test");
  await p.getByLabel("Password", { exact: true }).fill("local-test-password");
  await p.getByRole("button", { name: "Sign in securely" }).click();
  await p.getByRole("heading", { name: "Operations overview." }).waitFor();
  await p.goto(base + "/admin/tournaments/new");
  assert.deepEqual(
    await p
      .locator(".editor-footer select")
      .locator("option")
      .allTextContents(),
    ["Draft — private"],
  );
  await p.goto(base + "/admin/administrators");
  await p
    .getByRole("heading", { name: "We couldn’t open this workspace." })
    .waitFor();
  console.log("editor boundaries pass");
  assert.deepEqual(
    errors.filter(
      (e) =>
        !(
          e.includes("/admin/administrators") &&
          e.includes("Server Components render")
        ),
    ),
    [],
  );
  console.log(
    "PASS: local PostgreSQL-backed CRUD/public integration checks. Hosted Supabase Auth/Storage remains unverified.",
  );
} finally {
  await b.close();
}
