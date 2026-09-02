const debug = require("debug")(process.env.DEBUG || "app");
require("dotenv").config();
module.exports = {
  preloads: { mysql: true },
  presets: {
    api: true,
    middleware: true,
    images: true,
    data: true,
    json: true,
    modules: true,
    helpers: true,
    mode: true,
    config: true,
    public: true,
    lang: true,
  },
  setCommonGlobals(baseDir) {
    if (this.globals) return console.log("Globals already set. Returning");

    debug("setting common globals!");
    const PRESETS = this.presets;
    const PRELOADS = this.preloads;

    this.globals = true;

    baseDir = baseDir || require("path").resolve(__dirname, "..");
    baseDir = baseDir.replace(/\/+$/, "") + "/"; // remove trailing slashes
    global.__home = baseDir;

    PRESETS.modules && (global.__modules = global.__home + "modules/");

    PRESETS.json && (global.__jsonPath = baseDir + "data/");
    PRESETS.data && (global.__data = baseDir + "data/");

    PRESETS.helpers && (global.__helpers = baseDir + "helpers/");

    PRESETS.config && (global.__config = baseDir + "configs/");
    PRESETS.lang && (global.__lang = global.__config + "lang");
    PRESETS.middleware && (global.__middleware = baseDir + "middleware/");
    PRESETS.public && (global.__public = baseDir + "public/");
    PRESETS.images && (global.__images = global.__public + "images/");

    PRELOADS.mysql && (global.dbo = this.loadHelper("mysql"));

    const paths = require("path");
    const basename = paths.basename(global.__home);

    // https://stackoverflow.com/questions/8683895/how-do-i-determine-the-current-operating-system-with-node-js
    const platform = process.platform; // 'darwin', 'freebsd', 'linux', 'sunos' or 'win32'
    global.__isMac = Boolean(platform.match(/darwin/i));
    debug("isMac ?", (global.__isMac && "Yes") || "No");

    global.__isLocal = Boolean(global.__isMac || platform.match(/win32/i));
    debug("isLocal ?", (global.__isLocal && "Yes") || "No");

    if (PRESETS.mode) {
      if (process.env.MODE) {
        global.__mode = process.env.MODE;
        debug("Using mode from env: ", process.env.MODE);
      } else {
        global.__mode = !(global.__isMac || global.__isLocal)
          ? basename.match(/live/i)
            ? "live"
            : "dev"
          : "local";
      }
      debug("__mode: ", global.__mode);
    }

    if (PRESETS.api) {
      global.__api =
        global.__mode === "live" ? "/prod" : global.__isMac || global.__isLocal ? "" : "/dev";
      debug("__api: ", global.__api);
    }
  },
  setRequestGlobals(req, res, next) {
    const protocol =
      "http" +
      ((req.connection && req.connection.encrypted && "s") || "") +
      "://";
    global.__server = protocol + req.headers.host; //contains path ONLY upto server AND DOES NOT POINT to specific API environment
    global.__apiPath = global.__server + global.__api; //contains for API referred by this request
    next();
  },
  loadHelper(name) {
    const baseUrl = global.__helpers;
    if (baseUrl) {
      if (global.helpers && global.helpers.list[name])
        return require(baseUrl + global.helpers.list[name]);
      try {
        return require(baseUrl + name);
      } catch (e) {
        if (e.code !== "MODULE_NOT_FOUND") throw e;
      }
    }
    const helperName = name.replace(/^es-helper-/i, "");
    const packagedHelpers = ["encrypt", "file", "git", "mysql", "postgres"];
    if (!packagedHelpers.includes(helperName))
      throw new Error(`Unknown helper: ${name}`);
    return require("../" + helperName);
  },
  location: require("../location"),
  // removed: .loadModules function

  parentUrl(url) {
    return url.substr(0, url.lastIndexOf("/"));
  },
  toCamelCase(obj) {
    var self = this;
    if (typeof obj == "string") {
      return obj.replace(/_[a-z]/g, function (match) {
        return match.substr(1, 1).toUpperCase() + match.substr(2);
      });
    } else {
      var temp = typeof obj == "object" ? {} : [];
      for (var key in obj) {
        var val = obj[key];
        var newKey = self.toCamelCase(key);
        temp[newKey] = val;
      }
      return temp;
    }
  },
  reverseCamelCase(obj) {
    var self = this;
    if (typeof obj == "string") {
      return obj.replace(/[A-Z]/g, function (match) {
        return "_" + match.toLowerCase();
      });
    } else {
      var temp = typeof obj === "object" ? {} : [];
      for (var key in obj) {
        var val = obj[key];
        var newKey = self.reverseCamelCase(key);
        temp[newKey] = val;
      }
      return temp;
    }
  },

  base64(str) {
    str = typeof str === "string" ? str : JSON.stringify(str);
    return Buffer.from(str).toString("base64");
  },
  decodeBase64(b64Encoded) {
    return Buffer.from(b64Encoded, "base64").toString();
  },
  get(key) {
    key = key.toLowerCase().split(":");
    switch (key[0]) {
      case "date":
      case "timestamp":
      case "ts":
        if (key[0] === "ts" || key[0] === "timestamp") {
          // return Math.floor(Date.now() / 1000);//is buggy
          var ts = +new Date();
          return ts;
        }
        var d = new Date();

        var format = (key[1] || "dd-mm-yy").toLowerCase().split("-");
        var data = [];
        format.forEach(function (field) {
          if (field == "dd") data.push(d.getDate());
          else if (field == "mm")
            data.push(("0" + (d.getMonth() + 1)).substr(-2));
          else if (field == "yy") data.push(d.getFullYear());
        });
        return data.join("-");
        break;
    }
  },
  createUserToken(userObj, config) {
    let jwt = require("jsonwebtoken");
    const temp = this.toCamelCase(userObj);
    const { jwtSecret } = config || {};
    if (!jwtSecret) {
      if (!global.__config) {
        throw new Error("jwtSecret is required when app globals are not configured");
      }
      config = {
        ...(config || {}),
        ...require(global.__config + "/app/app.config"),
      };
    }
    var tokenObj = {
      userId: temp.userId,
      userEmail: temp.userEmail || temp.email,
      name: temp.fullName || temp.name,
      timestamp: Date.now(),
      // anything additional that needs to be added to token
      ...(userObj.additional || {}),
    };
    const options = {
      noTimestamp: !(config && config.expiresIn),
    };
    if (!options.noTimestamp) {
      delete options.noTimestamp;
      options.expiresIn = config.expiresIn;
    }
    return jwt.sign(tokenObj, config.jwtSecret, options);
  },
  queryStringToJSON(str) {
    if (typeof str !== "string" || !str.match(/(.*=.*&?)+/)) return str;
    const advancedQueryString = require("qs");
    let parsed = advancedQueryString.parse(str, { depth: 10 });
    console.log("parsed queryToJSON: ", parsed);

    return parsed;
  },
};
