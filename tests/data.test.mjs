import { test } from "node:test";
import assert from "node:assert/strict";
import {
  teams,
  matches,
  participants,
  config,
  pages,
} from "../src/lib/data.ts";
test("sixteen unique anonymous slots have complete translations and five roster positions", () => {
  assert.equal(teams.length, 16);
  assert.equal(new Set(teams.map((t) => t.id)).size, 16);
  for (const team of teams) {
    assert.equal(team.roster.length, 5);
    for (const lang of ["uz", "ru", "en"]) assert.ok(team.name[lang]);
    assert.ok(team.roster.every((p) => p.name === null));
  }
});
test("knockout graph has fifteen unique matches and resolves valid preceding-round sources", () => {
  assert.equal(matches.length, 15);
  assert.equal(new Set(matches.map((m) => m.id)).size, 15);
  for (let round = 0; round < 4; round++)
    assert.equal(
      matches.filter((m) => m.round === round).length,
      8 / 2 ** round,
    );
  assert.equal(matches.find((m) => m.round === 3).format, "BO5");
  for (const match of matches) {
    if (match.round === 0) {
      assert.ok(participants(match).every(Boolean));
    } else {
      assert.equal(match.sources.length, 2);
      for (const source of match.sources)
        assert.equal(
          matches.find((m) => m.id === source).round,
          match.round - 1,
        );
    }
  }
  assert.equal(
    new Set(matches.filter((m) => m.round === 0).flatMap((m) => m.teamIds))
      .size,
    16,
  );
});
test("confirmed winners propagate without inventing unresolved participants", () => {
  const match = matches[0];
  const next = matches.find((m) => m.sources?.includes(match.id));
  assert.equal(participants(next)[0], undefined);
  try {
    match.winnerId = teams[0].id;
    assert.equal(participants(next)[0]?.id, teams[0].id);
    assert.equal(participants(next)[1], undefined);
  } finally {
    match.winnerId = null;
  }
});
test("demo has no fabricated outcomes, dates, active broadcast or official contact", () => {
  assert.equal(config.startsAt, null);
  assert.equal(config.youtubeVideoId, null);
  assert.equal(config.contactEmail, null);
  for (const m of matches) {
    assert.equal(m.startsAt, null);
    assert.equal(m.scores, null);
    assert.equal(m.winnerId, null);
    assert.equal(m.status, "pending");
    assert.deepEqual(m.maps, []);
  }
  assert.equal(pages.length, 8);
});
