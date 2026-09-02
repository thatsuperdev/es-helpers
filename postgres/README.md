# PostgreSQL helper

PostgreSQL pools, transactions, parameterized raw SQL, and safe table CRUD.

```js
const postgres = require("es-helpers/postgres");

const rows = await postgres.queryRows("SELECT * FROM users WHERE active = $1", [true]);
const user = await postgres.queryOne("SELECT * FROM users WHERE id = $1", [42]);
const changed = await postgres.execute("UPDATE users SET active = $1 WHERE id = $2", [false, 42]);
```

`query()` returns the native `pg` result. `queryRows()`, `queryOne()`, and
`execute()` return rows, one row or `null`, and affected-row count.

## Table API

```js
const users = postgres.table("users");

const created = await users.insert({ email: "me@example.com", active: true });
await users.update({ active: false }, { id: created.id });
await users.upsert({ id: created.id, email: "new@example.com" }, ["id"]);
await users.delete({ id: created.id });
```

Table methods are `find`, `findOne`, `insert`, `insertMany`, `update`,
`upsert`, `delete`, and `remove`. They support equality and `NULL` filters.
Identifiers are validated and quoted; values are parameterized. Empty update
and delete filters are rejected. Mutations return rows unless
`{ returning: false }` is supplied, in which case they return affected count.

## Configuration and transactions

The default client reads `POSTGRES_URL`, then `DATABASE_URL`.

```js
const db = postgres.create({
  connectionString: process.env.AIVEN_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 8,
});

await db.tx(async (tx) => {
  await tx.table("accounts").update({ balance: 90 }, { id: 1 });
  await tx.table("ledger").insert({ account_id: 1, amount: -10 });
});
```

Transactions expose `query`, `queryRows`, `queryOne`, `execute`, `table`, and
the checked-out native `client`. Use raw SQL for joins, ranges, expressions,
locking, aggregates, and database-specific features. Install `pg`.
