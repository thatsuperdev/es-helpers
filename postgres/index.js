const { Pool } = require("pg");

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_$]*$/;

function quoteIdentifier(identifier) {
  if (typeof identifier !== "string" || !identifier) {
    throw new TypeError("SQL identifier must be a non-empty string");
  }
  return identifier
    .split(".")
    .map((part) => {
      if (!IDENTIFIER.test(part)) {
        throw new Error(`Invalid SQL identifier: ${identifier}`);
      }
      return `"${part}"`;
    })
    .join(".");
}

function quoteColumns(columns = "*") {
  if (columns === "*") return "*";
  if (!Array.isArray(columns) || !columns.length) {
    throw new TypeError("columns must be '*' or a non-empty array");
  }
  return columns.map(quoteIdentifier).join(", ");
}

function assertRecord(record, label = "record") {
  if (!record || Array.isArray(record) || typeof record !== "object") {
    throw new TypeError(`${label} must be an object`);
  }
  const keys = Object.keys(record);
  if (!keys.length) throw new Error(`${label} cannot be empty`);
  for (const key of keys) {
    quoteIdentifier(key);
    if (record[key] === undefined) {
      throw new Error(`${label}.${key} cannot be undefined`);
    }
  }
  return keys;
}

function buildWhere(where, startAt = 1) {
  if (!where || Array.isArray(where) || typeof where !== "object") {
    throw new TypeError("where must be an object");
  }
  const values = [];
  let parameter = startAt;
  const clauses = Object.entries(where).map(([key, value]) => {
    const column = quoteIdentifier(key);
    if (value === undefined) throw new Error(`where.${key} cannot be undefined`);
    if (value === null) return `${column} IS NULL`;
    values.push(value);
    return `${column} = $${parameter++}`;
  });
  return {
    sql: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
}

function create(options = {}) {
  const suppliedPool = options.pool;
  let pool = suppliedPool || null;

  function getPool() {
    if (pool) return pool;
    const connectionStringEnv = options.connectionStringEnv;
    const connectionString =
      options.connectionString ||
      (connectionStringEnv && process.env[connectionStringEnv]) ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        connectionStringEnv
          ? `${connectionStringEnv} is required`
          : "POSTGRES_URL or DATABASE_URL is required"
      );
    }
    const {
      pool: ignoredPool,
      connectionString: ignoredUrl,
      connectionStringEnv: ignoredEnv,
      ...poolOptions
    } = options;
    let url = connectionString;
    if (poolOptions.ssl) {
      const parsed = new URL(connectionString);
      parsed.searchParams.delete("sslmode");
      url = parsed.toString();
    }
    pool = new Pool({ ...poolOptions, connectionString: url });
    return pool;
  }

  function query(text, values, client) {
    const target = client || getPool();
    return values === undefined ? target.query(text) : target.query(text, values);
  }

  async function queryRows(text, values, client) {
    return (await query(text, values, client)).rows;
  }

  async function queryOne(text, values, client) {
    return (await queryRows(text, values, client))[0] || null;
  }

  async function execute(text, values, client) {
    return (await query(text, values, client)).rowCount || 0;
  }

  function makeTable(name, client) {
    const tableName = quoteIdentifier(name);

    function returningClause(returning) {
      if (returning === false) return "";
      return ` RETURNING ${quoteColumns(returning || "*")}`;
    }

    async function find(where = {}, findOptions = {}) {
      const builtWhere = buildWhere(where);
      let sql = `SELECT ${quoteColumns(findOptions.columns)} FROM ${tableName}${builtWhere.sql}`;
      if (findOptions.limit !== undefined) {
        if (!Number.isInteger(findOptions.limit) || findOptions.limit < 1) {
          throw new Error("limit must be a positive integer");
        }
        sql += ` LIMIT ${findOptions.limit}`;
      }
      const result = await query(sql, builtWhere.values, findOptions.client || client);
      return result.rows;
    }

    async function findOne(where = {}, findOptions = {}) {
      const rows = await find(where, { ...findOptions, limit: 1 });
      return rows[0] || null;
    }

    async function insertMany(records, insertOptions = {}) {
      if (!Array.isArray(records)) throw new TypeError("records must be an array");
      if (!records.length) return insertOptions.returning === false ? 0 : [];
      const keys = assertRecord(records[0], "records[0]");
      const columns = keys.map(quoteIdentifier).join(", ");
      const values = [];
      const rowsSql = records.map((record, rowIndex) => {
        const recordKeys = assertRecord(record, `records[${rowIndex}]`);
        if (
          recordKeys.length !== keys.length ||
          keys.some((key) => !Object.prototype.hasOwnProperty.call(record, key))
        ) {
          throw new Error("All records must have the same columns");
        }
        const placeholders = keys.map((key) => {
          values.push(record[key]);
          return `$${values.length}`;
        });
        return `(${placeholders.join(", ")})`;
      });
      const sql = `INSERT INTO ${tableName} (${columns}) VALUES ${rowsSql.join(", ")}${returningClause(insertOptions.returning)}`;
      const result = await query(sql, values, insertOptions.client || client);
      return insertOptions.returning === false ? result.rowCount || 0 : result.rows;
    }

    async function insert(record, insertOptions = {}) {
      const result = await insertMany([record], insertOptions);
      return insertOptions.returning === false ? result : result[0] || null;
    }

    async function update(changes, where, updateOptions = {}) {
      const keys = assertRecord(changes, "changes");
      const whereClause = buildWhere(where, keys.length + 1);
      if (!whereClause.sql) throw new Error("update requires a non-empty where");
      const setClause = keys
        .map((key, index) => `${quoteIdentifier(key)} = $${index + 1}`)
        .join(", ");
      const values = keys.map((key) => changes[key]).concat(whereClause.values);
      const sql = `UPDATE ${tableName} SET ${setClause}${whereClause.sql}${returningClause(updateOptions.returning)}`;
      const result = await query(sql, values, updateOptions.client || client);
      return updateOptions.returning === false ? result.rowCount || 0 : result.rows;
    }

    async function remove(where, deleteOptions = {}) {
      const whereClause = buildWhere(where);
      if (!whereClause.sql) throw new Error("delete requires a non-empty where");
      const sql = `DELETE FROM ${tableName}${whereClause.sql}${returningClause(deleteOptions.returning)}`;
      const result = await query(sql, whereClause.values, deleteOptions.client || client);
      return deleteOptions.returning === false ? result.rowCount || 0 : result.rows;
    }

    async function upsert(records, conflictColumns, upsertOptions = {}) {
      const many = Array.isArray(records);
      const list = many ? records : [records];
      if (!list.length) return upsertOptions.returning === false ? 0 : [];
      if (!Array.isArray(conflictColumns) || !conflictColumns.length) {
        throw new Error("conflictColumns must be a non-empty array");
      }
      const keys = assertRecord(list[0]);
      const updateColumns = upsertOptions.updateColumns ||
        keys.filter((key) => !conflictColumns.includes(key));
      const values = [];
      const rowsSql = list.map((record, rowIndex) => {
        const recordKeys = assertRecord(record, `records[${rowIndex}]`);
        if (
          recordKeys.length !== keys.length ||
          keys.some((key) => !Object.prototype.hasOwnProperty.call(record, key))
        ) {
          throw new Error("All records must have the same columns");
        }
        return `(${keys.map((key) => {
          values.push(record[key]);
          return `$${values.length}`;
        }).join(", ")})`;
      });
      const conflict = conflictColumns.map(quoteIdentifier).join(", ");
      const action = updateColumns.length
        ? `DO UPDATE SET ${updateColumns.map((column) => {
          const quoted = quoteIdentifier(column);
          return `${quoted} = EXCLUDED.${quoted}`;
        }).join(", ")}`
        : "DO NOTHING";
      const sql = `INSERT INTO ${tableName} (${keys.map(quoteIdentifier).join(", ")}) VALUES ${rowsSql.join(", ")} ON CONFLICT (${conflict}) ${action}${returningClause(upsertOptions.returning)}`;
      const result = await query(sql, values, upsertOptions.client || client);
      if (upsertOptions.returning === false) return result.rowCount || 0;
      return many ? result.rows : result.rows[0] || null;
    }

    return {
      delete: remove,
      find,
      findOne,
      insert,
      insertMany,
      remove,
      update,
      upsert,
    };
  }

  async function tx(callback) {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const result = await callback({
        client,
        execute: (text, values) => execute(text, values, client),
        query: (text, values) => query(text, values, client),
        queryOne: (text, values) => queryOne(text, values, client),
        queryRows: (text, values) => queryRows(text, values, client),
        table: (name) => makeTable(name, client),
      });
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async function close() {
    if (!pool || suppliedPool) return;
    await pool.end();
    pool = null;
  }

  return {
    close,
    execute: (text, values) => execute(text, values),
    getPool,
    query: (text, values) => query(text, values),
    queryOne: (text, values) => queryOne(text, values),
    queryRows: (text, values) => queryRows(text, values),
    table: (name) => makeTable(name),
    tx,
  };
}

module.exports = {
  ...create(),
  create,
  quoteIdentifier,
};
