import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { discoverySources, discoverySourceSchema } from "./discovery-source.validators.ts";

test("all displayed channels are accepted by both API and database", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20261027110000_create_discovery_sources.sql", import.meta.url), "utf8");
  const constraint = migration.split("source text not null check (source in (")[1].split("))")[0];
  const databaseSources = [...constraint.matchAll(/'([^']+)'/g)].map(match => match[1]);
  assert.deepEqual(databaseSources, [...discoverySources]);
  for (const source of discoverySources) {
    assert.equal(discoverySourceSchema.safeParse({ source }).success, true);
  }
});

test("rejects unknown channels, multiple answers, identity and private payload fields", () => {
  for (const input of [null, {}, { source: "" }, { source: "unknown" },
    { source: ["bilibili", "douyin"] }, { source: "bilibili", user_id: "another-user" },
    { source: "douyin", coordinates: [1, 2] }, { source: "other", text: "private details" },
    { status: "pending" }, { status: "submitted" }, { status: "skipped", source: null },
    { status: "skipped", source: "bilibili" }, { status: "skipped", user_id: "other" }]) {
    assert.equal(discoverySourceSchema.safeParse(input).success, false);
  }
});

test("skip has no source or other fields", () => {
  assert.equal(discoverySourceSchema.safeParse({ status: "skipped" }).success, true);
});
