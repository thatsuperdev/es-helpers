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
npm install firebase-admin                       # firestore
npm install debug jsonwebtoken qs               # app-utils
npm install bcrypt                               # encrypt
npm install folder-zip                          # file (zipFolder only)
npm install simple-git                           # git
```

The package exposes each helper separately, so requiring one subpath does not
load the others. PostgreSQL, MySQL, and their drivers are included; other
integration packages remain optional peer dependencies.

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
| [`es-helpers/app-utils`](app-utils/README.md) | Shared app globals, transformations, and tokens |
| [`es-helpers/encrypt`](encrypt/README.md) | Password matching, hashing, and random strings |
| [`es-helpers/file`](file/README.md) | JSON, copy, download, archive, and removal utilities |
| [`es-helpers/firestore`](firestore/README.md) | Firebase Admin Firestore instances, including named apps |
| [`es-helpers/git`](git/README.md) | Clone, pull, commit, and push utilities |
| [`es-helpers/location`](location/README.md) | IP geolocation provider clients |
| [`es-helpers/mysql`](mysql/README.md) | MySQL connection and query helpers |
| [`es-helpers/postgres`](postgres/README.md) | PostgreSQL pools, transactions, raw queries, and table CRUD/upserts |

Each helper folder contains its own API, configuration, and usage guide.

## Public API policy

- Subpath imports are the stable API and avoid loading unrelated integrations.
- Database credentials and provider-specific connection policy belong to the consumer.
- Integration packages are optional peer dependencies.
- Project-specific helpers and conventions belong in the consumer's local app utility extension.
- Existing callback APIs remain for compatibility; new database APIs are Promise-based.

## Development

```sh
npm install
npm test
npm pack --dry-run
```
