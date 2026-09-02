# es-helpers

Reusable CommonJS database and application helpers for Node.js 18+.

Each helper has its own package subpath. A project loads only the helpers it
requires and installs only their optional peer dependencies.

## Install

From the public GitHub repository:

```sh
npm install github:thatsuperdev/es-helpers
```

SSH remains available for contributors with GitHub keys configured:

```sh
npm install git+ssh://git@github.com/thatsuperdev/es-helpers.git
```

For local development:

```sh
npm install ../es-helpers
```

Install only the peer dependencies required by the helpers a project uses:

```sh
npm install mysql2 debug                         # mysql
npm install pg                                   # postgres
npm install firebase-admin                       # firestore
npm install debug dotenv jsonwebtoken qs axios  # app-utils
npm install bcrypt                               # encrypt
npm install folder-zip                          # file (zipFolder only)
npm install simple-git                           # git
```

The package exposes each helper separately, so requiring one subpath does not
load the others. npm still installs the small source package as a whole; optional
peer dependencies prevent unused integrations from being installed.

## Use

```js
const $mysql = require("es-helpers/mysql");
const $postgres = require("es-helpers/postgres");
const $fsdb = require("es-helpers/firestore");
const appUtils = require("es-helpers/app-utils");
const file = require("es-helpers/file");
const encrypt = require("es-helpers/encrypt");
const git = require("es-helpers/git");
const location = require("es-helpers/location");
```

The package root is also supported and loads each helper only when accessed:

```js
const { postgres, firestore } = require("es-helpers");
```

## Helpers

| Import | Purpose |
| --- | --- |
| `es-helpers/app-utils` | Shared app globals, tokens, locations, and helper resolution |
| `es-helpers/encrypt` | Password matching, hashing, and random strings |
| `es-helpers/file` | JSON, copy, download, archive, and removal utilities |
| `es-helpers/firestore` | Firebase Admin Firestore instances, including named apps |
| `es-helpers/git` | Clone, pull, commit, and push utilities |
| `es-helpers/location` | IP geolocation provider clients |
| `es-helpers/mysql` | MySQL connection and query helpers |
| `es-helpers/postgres` | PostgreSQL pools, transactions, raw queries, and table CRUD/upserts |

## PostgreSQL

Use `query()` for unrestricted parameterized SQL. It returns the native `pg`
result, so fields such as `rows`, `rowCount`, and `command` remain available.

```js
const postgres = require("es-helpers/postgres");

const result = await postgres.query(
  "SELECT u.* FROM users u WHERE u.created_at >= $1 ORDER BY u.created_at DESC",
  [new Date("2026-01-01")]
);
const rows = await postgres.queryRows("SELECT * FROM users WHERE active = $1", [true]);
const user = await postgres.queryOne("SELECT * FROM users WHERE id = $1", [42]);
const changed = await postgres.execute("UPDATE users SET active = $1 WHERE id = $2", [false, 42]);
```

`queryRows()`, `queryOne()`, and `execute()` are convenience methods over the
same raw-SQL path. They return rows, one row or `null`, and the affected-row
count respectively.

Use the table API for ordinary equality-based CRUD:

```js
const $postgres = require("es-helpers/postgres");
const users = $postgres.table("users");

const user = await users.findOne({ email: "me@example.com" });
const created = await users.insert({ email: "me@example.com", active: true });
await users.update({ active: false }, { id: created.id });
await users.upsert(
  { id: created.id, email: "new@example.com" },
  ["id"]
);
await users.delete({ id: created.id });
const removed = await users.delete({ active: false }, { returning: false });
```

The default client reads `POSTGRES_URL`, then `DATABASE_URL`. For explicit
configuration or tests, create an isolated client:

```js
const db = $postgres.create({
  connectionString: process.env.AIVEN_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 8,
});

await db.tx(async (tx) => {
  await tx.table("accounts").update({ balance: 90 }, { id: 1 });
  await tx.table("ledger").insert({ account_id: 1, amount: -10 });
});
```

Transactions expose `query()`, `queryRows()`, `queryOne()`, `execute()`,
`table()`, and the checked-out native `client`.

Table methods support equality and `NULL` filters. Use raw SQL for joins,
ranges, expressions, locking, aggregates, and database-specific features.
Identifiers are validated and quoted; values are parameterized. Empty update
and delete filters are rejected. Mutations return rows by default and return
the affected-row count when `{ returning: false }` is supplied.

## MySQL

The MySQL helper can use standard environment variables or explicit config:

```js
const mysql = require("es-helpers/mysql");

// MYSQL_URL, or MYSQL_HOST/MYSQL_PORT/MYSQL_USER/MYSQL_PASSWORD/MYSQL_DATABASE
const rows = await mysql.queryRows("SELECT * FROM users WHERE id = ?", [42]);

mysql.configure({
  host: "127.0.0.1",
  user: "app",
  password: "secret",
  database: "app",
});
```

`query()` retains the callback-compatible `mysql2` API. New code can use
`queryRows()`, `queryOne()`, and `execute()`.

## Encryption

Use `hashPassword()`, `verifyPassword()`, and `randomString()` for new code.
The SHA-1/MD5 methods remain only for compatibility with legacy stored hashes;
do not use them for new passwords or tokens.

Firestore accepts a service-account object or JSON file path:

```js
const db = $fsdb.getInstance("./service-account.json");
const devDb = $fsdb.getInstance("./dev-service-account.json", {
  name: "development",
});
```

Credentials and environment-specific file paths stay in the consuming project.

## Public API policy

- Subpath imports are the stable API and avoid loading unrelated integrations.
- Database credentials and provider-specific connection policy belong to the consumer.
- Integration packages are optional peer dependencies.
- Existing callback APIs remain for compatibility; new database APIs are Promise-based.

## Development

```sh
npm install
npm test
npm pack --dry-run
```
