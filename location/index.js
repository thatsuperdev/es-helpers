const getRandomKey = (keys) => {
  keys = Array.isArray(keys) ? keys : [keys];
  let index = 0;
  if (keys.length > 1) {
    index = Math.floor(Math.random() * keys.length);
  }
  return keys[index];
};

module.exports = {
  use(name) {
    name = name || "";
    switch (name.toLowerCase()) {
      case "ipstack":
        return this.ipStack;
      case "ipdata":
        return this.ipData;
      case "ipinfo":
        return this.ipInfo;
      case "ip2location":
        return this.ip2Location;
      default:
        return this.ipStack;
    }
  },
  ipInfo: {
    apiKey: null,
    apiPath: "https://ipinfo.io/",
    setApiKey(keys) {
      this.apiKey = getRandomKey(keys);
      return this;
    },
    setFields(fields) {
      this.fields = fields || this.fields;
    },
    getGeo(params, callback) {
      params = params || {};
      params.fields = "geo";
      return this.getIpInfo(params, callback);
    },
    getIpInfo(params, callback) {
      let ip = params.ip || "";
      let localIPs = ["::ffff:127.0.0.1", "::1", "127.0.0.1"];
      if (localIPs.indexOf(ip) >= 0) {
        ip = ""; //get requester details if request is from localhost
      }
      let url = this.apiPath + ip;
      if (params.field || params.fields) {
        let field = params.field || params.fields;
        url += "/" + (field === true ? this.fields : field);
      }
      url = url.replace(/\/+$/, "");
      url += "?token=" + this.apiKey;

      const axios = require("axios");
      return axios
        .get(url, {
          headers: {
            Accept: "application/json",
          },
        })
        .then(({ data }) => {
          const json = data;
          json.location = json.loc.split(",");
          json.latittude = json.location[0];
          json.longitude = json.location[1];
          return callback ? callback(null, json) : json;
        })
        .catch((err) => {
          if (callback) return callback(err);
          throw err;
        });
    },
  },
  ipData: {
    apiKey: null,
    apiPath: "https://api.ipdata.co/",
    setApiKey(keys) {
      this.apiKey = getRandomKey(keys);
      return this;
    },
    setFields(fields) {
      this.fields = fields || this.fields;
    },
    getIpInfo(params, callback) {
      let ip = params.ip || "";
      let localIPs = ["::ffff:127.0.0.1", "::1", "127.0.0.1"];
      if (localIPs.indexOf(ip) >= 0) {
        ip = ""; //get requester details if request is from localhost
      }
      let url = this.apiPath + ip;
      if (params.field || params.fields) {
        let field = params.field || params.fields;
        url += "/" + (field === true ? this.fields : field);
      }
      url = url.replace(/\/+$/, "");
      url += "?api-key=" + this.apiKey;

      const axios = require("axios");
      return axios
        .get(url)
        .then(({ data }) => (callback ? callback(null, data) : data))
        .catch((err) => {
          if (callback) return callback(err);
          throw err;
        });
    },
  },
  ipStack: {
    apiKey: null,
    apiPath: "https://api.ipstack.com/",
    setApiKey(keys) {
      this.apiKey = getRandomKey(keys);
      return this;
    },
    setFields(fields) {
      this.fields = fields || this.fields;
    },
    getIpInfo(params, callback) {
      let ip = params.ip || "";
      let localIPs = ["::ffff:127.0.0.1", "::1", "127.0.0.1"];
      if (localIPs.indexOf(ip) >= 0 || !ip) {
        ip = "check"; //get requester details if request is from localhost
      }
      let url = this.apiPath + ip + "?access_key=" + this.apiKey;

      if (params.field || params.fields) {
        let field = params.field || params.fields;
        field += field === true ? this.fields : field;
        field = Array.isArray(field) ? field.join(",") : field;
        if (field) {
          url += "&fields=" + field;
        }
      }

      const axios = require("axios");
      return axios
        .get(url)
        .then(({ data }) => (callback ? callback(null, data) : data))
        .catch((err) => {
          if (callback) return callback(err);
          throw err;
        });
    },
  },
  ip2Location: {
    apiKey: null,
    apiPath: "https://api.ip2location.io/?ip=",
    setApiKey(keys) {
      this.apiKey = getRandomKey(keys);
      return this;
    },
    setFields(fields) {
      this.fields = fields || this.fields;
    },
    getIpInfo(params, callback) {
      let ip = params.ip || "";
      let localIPs = ["::ffff:127.0.0.1", "::1", "127.0.0.1"];
      if (localIPs.indexOf(ip) >= 0) {
        ip = null; //get requester details if request is from localhost
      }
      const query = [];
      if (ip) {
        query.push("ip=" + ip);
      }
      // when key is missing, 500/day is the limit
      if (this.apiKey) {
        query.push("key=" + this.apiKey);
      }
      let url = this.apiPath + query.join("&");

      if (params.field || params.fields) {
        let field = params.field || params.fields;
        field += field === true ? this.fields : field;
        field = Array.isArray(field) ? field.join(",") : field;
        if (field) {
          url += "&fields=" + field;
        }
      }

      const axios = require("axios");
      return axios
        .get(url)
        .then(({ data }) => (callback ? callback(null, data) : data))
        .catch((err) => {
          if (callback) return callback(err);
          throw err;
        });
    },
  },
};
