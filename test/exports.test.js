const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

global.__config = __dirname + "/fixtures/";
global.__home = __dirname + "/";
global.__isLocal = true;
global.__mode = "test";

for (const name of [
  "app-utils",
  "encrypt",
  "file",
  "firestore",
  "git",
  "location",
  "mysql",
  "postgres",
]) {
  test(`loads es-helpers/${name}`, () => {
    assert.ok(require(`es-helpers/${name}`));
  });
}

test("subpath exports resolve from helper folders", () => {
  for (const name of [
    "app-utils",
    "encrypt",
    "file",
    "firestore",
    "git",
    "location",
    "mysql",
    "postgres",
  ]) {
    const resolved = require.resolve(`es-helpers/${name}`);
    assert.equal(path.basename(resolved), "index.js");
    assert.equal(path.basename(path.dirname(resolved)), name);
  }
});

test("package root exposes helpers lazily", () => {
  const helpers = require("es-helpers");
  assert.equal(helpers.postgres, require("es-helpers/postgres"));
  assert.equal(helpers.location, require("es-helpers/location"));
});

test("mysql imports without project globals", () => {
  execFileSync(
    process.execPath,
    ["-e", "delete global.__config; require('./mysql')"],
    { cwd: __dirname + "/.." }
  );
});

test("app-utils resolves packaged helpers", () => {
  assert.equal(
    require("es-helpers/app-utils").loadHelper("encrypt"),
    require("es-helpers/encrypt")
  );
});

test("firestore reuses a named app", () => {
  const firestore = require("es-helpers/firestore");
  const first = firestore.getInstance(undefined, { name: "es-helpers-test" });
  const second = firestore.getInstance(undefined, { name: "es-helpers-test" });
  assert.equal(first, second);
});

test("postgres table operations parameterize values and quote identifiers", async () => {
  const calls = [];
  const db = require("es-helpers/postgres").create({
    pool: {
      async query(text, values) {
        calls.push({ text, values });
        return { rows: [{ id: 7 }] };
      },
    },
  });
  const users = db.table("public.users");

  assert.deepEqual(await users.findOne({ email: "me@example.com" }), { id: 7 });
  assert.deepEqual(calls[0], {
    text: 'SELECT * FROM "public"."users" WHERE "email" = $1 LIMIT 1',
    values: ["me@example.com"],
  });

  await users.update({ full_name: "Sayed" }, { id: 7 });
  assert.deepEqual(calls[1], {
    text: 'UPDATE "public"."users" SET "full_name" = $1 WHERE "id" = $2 RETURNING *',
    values: ["Sayed", 7],
  });

  await users.upsert(
    [
      { id: 7, email: "first@example.com" },
      { id: 8, email: "second@example.com" },
    ],
    ["id"],
    { updateColumns: ["email"] }
  );
  assert.deepEqual(calls[2], {
    text: 'INSERT INTO "public"."users" ("id", "email") VALUES ($1, $2), ($3, $4) ON CONFLICT ("id") DO UPDATE SET "email" = EXCLUDED."email" RETURNING *',
    values: [7, "first@example.com", 8, "second@example.com"],
  });
});

test("postgres rejects unsafe identifiers and unbounded writes", async () => {
  const postgres = require("es-helpers/postgres");
  const db = postgres.create({ pool: { query: async () => ({ rows: [] }) } });
  assert.throws(() => db.table("users; drop table users"), /Invalid SQL identifier/);
  await assert.rejects(() => db.table("users").delete({}), /non-empty where/);
  await assert.rejects(
    () => db.table("users").update({ active: false }, {}),
    /non-empty where/
  );
});

test("postgres raw helpers preserve results, rows, one row, and affected counts", async () => {
  const db = require("es-helpers/postgres").create({
    pool: {
      async query(text, values) {
        assert.equal(text, "SELECT $1::int AS id");
        assert.deepEqual(values, [7]);
        return { rows: [{ id: 7 }], rowCount: 1 };
      },
    },
  });

  assert.deepEqual(await db.query("SELECT $1::int AS id", [7]), {
    rows: [{ id: 7 }],
    rowCount: 1,
  });
  assert.deepEqual(await db.queryRows("SELECT $1::int AS id", [7]), [{ id: 7 }]);
  assert.deepEqual(await db.queryOne("SELECT $1::int AS id", [7]), { id: 7 });
  assert.equal(await db.execute("SELECT $1::int AS id", [7]), 1);
});

test("postgres resolves custom connection environments and owns SSL parsing", async () => {
  process.env.ES_HELPERS_TEST_DATABASE_URL =
    "postgres://user:pass@localhost:5432/db?sslmode=require";
  const db = require("es-helpers/postgres").create({
    connectionStringEnv: "ES_HELPERS_TEST_DATABASE_URL",
    ssl: { rejectUnauthorized: false },
  });

  const pool = db.getPool();
  assert.deepEqual(pool.options.ssl, { rejectUnauthorized: false });
  assert.equal(
    pool.options.connectionString,
    "postgres://user:pass@localhost:5432/db"
  );
  await db.close();
  delete process.env.ES_HELPERS_TEST_DATABASE_URL;
});

test("postgres mutations return affected counts when RETURNING is disabled", async () => {
  const db = require("es-helpers/postgres").create({
    pool: {
      async query() {
        return { rows: [], rowCount: 2 };
      },
    },
  });

  assert.equal(
    await db.table("users").insertMany([{ id: 1 }, { id: 2 }], { returning: false }),
    2
  );
  assert.equal(await db.table("users").update({ active: false }, { role: "guest" }, { returning: false }), 2);
  assert.equal(await db.table("users").delete({ role: "guest" }, { returning: false }), 2);
  assert.equal(await db.table("users").insertMany([], { returning: false }), 0);
});

test("postgres transaction raw helpers use the checked-out client", async () => {
  const calls = [];
  const client = {
    async query(text) {
      calls.push(text);
      return { rows: text === "SELECT 1" ? [{ ok: true }] : [], rowCount: 1 };
    },
    release() {
      calls.push("RELEASE");
    },
  };
  const db = require("es-helpers/postgres").create({
    pool: { connect: async () => client },
  });

  const row = await db.tx((tx) => tx.queryOne("SELECT 1"));
  assert.deepEqual(row, { ok: true });
  assert.deepEqual(calls, ["BEGIN", "SELECT 1", "COMMIT", "RELEASE"]);
});

test("file JSON helpers create parent directories and round-trip data", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-helpers-"));
  const filename = path.join(dir, "nested", "settings");
  const file = require("es-helpers/file");
  try {
    await new Promise((resolve, reject) =>
      file.saveToJSON(filename, { enabled: true }, (error) => error ? reject(error) : resolve())
    );
    const result = await new Promise((resolve, reject) =>
      file.getStoredJSON(filename, (error, value) => error ? reject(error) : resolve(value))
    );
    assert.deepEqual(result, { enabled: true });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
