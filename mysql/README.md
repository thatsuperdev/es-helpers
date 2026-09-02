# MySQL helper

Standard MySQL connections with legacy callbacks and Promise conveniences.

```js
const mysql = require("es-helpers/mysql");

const rows = await mysql.queryRows("SELECT * FROM users WHERE id = ?", [42]);
const user = await mysql.queryOne("SELECT * FROM users WHERE id = ?", [42]);
const changed = await mysql.execute("UPDATE users SET active = ? WHERE id = ?", [false, 42]);
```

Configure with `MYSQL_URL`, or `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`,
`MYSQL_PASSWORD`, and `MYSQL_DATABASE`. You can also call `configure(config)`.
`query` retains the callback-compatible `mysql2` API. Install `mysql2` and
`debug`.
