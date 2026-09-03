const mysql2 = require("mysql2");
const debug = require("debug")(process.env.DEBUG || "DB");

let dbServers = {},
  dbEnvFile = global.__config ? global.__config + "db/db.env" : null;
let handle = null;
try {
  if (dbEnvFile) dbServers = require(dbEnvFile);
} catch (e) {
  debug("ENV files error %s", dbEnvFile);
  debug("Error: ", e);
}
const environmentConfig = () => {
  if (process.env.MYSQL_URL || process.env.DATABASE_URL?.startsWith("mysql")) {
    return process.env.MYSQL_URL || process.env.DATABASE_URL;
  }
  if (!process.env.MYSQL_HOST) return null;
  return {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT && Number(process.env.MYSQL_PORT),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || process.env.MYSQL_DB,
  };
};

let dbConfig = environmentConfig();
const mysql = {
  configure(config) {
    if (!config) throw new Error("MySQL configuration is required");
    dbConfig = config;
    this.end();
    return this;
  },
  selectConfig(name, skip) {
    if (!name) throw new Error("MySQL configuration name is required");
    this.selectedConfig = name.toLowerCase();
    let pickedConfig = dbServers[this.selectedConfig];
    if (pickedConfig && pickedConfig.host && pickedConfig.database) {
      dbConfig = pickedConfig;
    } else if (dbServers.host && dbServers.database) {
      dbConfig = dbServers;
    }
    if (!dbConfig) throw new Error(`Unknown MySQL configuration: ${name}`);
    debug('Loaded db config for "%s" mode', name, dbConfig.database || "URL");
    !skip && this.reconnect(); // not sure if this line should be here (could cause infinite recursion)
  },
  conn: handle,
  connect(withMode) {
    if (!handle || withMode) {
      const mode = withMode ||
        (typeof global.__isLocal !== "undefined"
          ? (global.__isLocal ? "local" : global.__mode)
          : null);
      if (mode && dbServers[mode]) this.selectConfig(mode, true);
      if (!dbConfig) {
        throw new Error(
          "MySQL configuration is required; call configure() or set MYSQL_URL/MYSQL_HOST"
        );
      }

      handle = mysql2.createConnection(dbConfig);
      handle.connect(function (err) {
        if (err) {
          console.log("Error connecting to Db:", err);
          return false;
        }
        console.log("Database connected");
        return true;
      });
    }
    return handle;
  },
  reconnect() {
    this.end();
    this.connect();
  },
  end() {
    handle && handle.end && handle.end();
    handle = null;
  },
  getDbHandle() {
    return handle || this.connect();
  },
  selectDb(config, callback) {
    let newConfig;
    if (!config) {
      return callback && callback("Required config missing");
    }
    if (typeof config === "string") {
      newConfig = { database: config };
    } else {
      newConfig = {
        ...config,
        database: config.database || config.db || config.dbName,
      };
    }
    handle && handle.changeUser(newConfig, callback);
  },
  query(query, options, callback, failFlag) {
    const self = this;
    const params = typeof options == "function" ? null : options;
    callback =
      callback === undefined
        ? typeof options == "function"
          ? options
          : null
        : callback;
    callback =
      callback ||
      ((err, res) => console.warn("db.query defCallback::result: ", err, res));
    const handle = self.getDbHandle();
    try {
      return handle.query(query, params, callback);
    } catch (e) {
      console.log("Error in performing query:\n", e);
      callback(e);
    }
  },
  async queryRows(query, values = []) {
    const [rows] = await this.getDbHandle().promise().query(query, values);
    return rows;
  },
  async queryOne(query, values = []) {
    const rows = await this.queryRows(query, values);
    return rows[0] || null;
  },
  async execute(query, values = []) {
    const [result] = await this.getDbHandle().promise().execute(query, values);
    return result.affectedRows || 0;
  },
  insert(data, table, callback) {
    var query = "INSERT INTO " + table + " SET ?";
    /*
                 var inserts = [data];
                 var sql = mysql2.format(query, inserts);
                 return this.query(sql, data, callback);*/
    return this.query(query, data, callback);
  },
  update(table, data, condition, callback) {
    const keys = Object.keys(data)
      .map((i) => i + "=?")
      .join(",");
    let values = Object.values(data);

    const conditions = Object.keys(condition)
      .map((i) => i + "=?")
      .join(" AND ");
    values = values.concat(Object.values(condition));

    const query = `UPDATE ${table} SET ${keys} WHERE ${conditions}`;

    this.query(query, values, callback);
  },
  insertBatch(rows, table, callback) {
    var keys = [];
    var values = [];
    rows.forEach(function (row, index) {
      var temp = [];
      for (var key in row) {
        if (index == 0) keys.push(key);
        temp.push(row[key]);
      }
      values.push(temp);
    });
    var query = "INSERT INTO " + table + " (" + keys.join(", ") + ") VALUES ?";
    return this.query(query, [values], callback);
  },
  escape: (str) => {
    return mysql2.escape(str);
  },
  getInstance(forDB) {
    if (forDB) {
      this.tempDbChange = true;
      this.connect(forDB);
    } else if (this.tempDbChange) {
      // go back to using previous db config before when config was changed
      this.tempDbChange = false;
      this.reconnect();
    }
    return this;
  },
};

Object.defineProperty(mysql, "conn", {
  configurable: true,
  enumerable: true,
  get: () => handle,
});

module.exports = mysql;
