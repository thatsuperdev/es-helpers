const path = require("path");
const { cert, getApps, initializeApp } = require("firebase-admin/app");
const firestore = require("firebase-admin/firestore");
const databases = new Map();

function loadCredentials(credentials) {
  return typeof credentials === "string"
    ? require(path.resolve(credentials))
    : credentials;
}

module.exports = {
  ...firestore,
  getInstance(credentials, options = {}) {
    const name = options.name;
    const cacheKey = name || "[DEFAULT]";
    if (databases.has(cacheKey)) return databases.get(cacheKey);
    const existing = name
      ? getApps().find((app) => app.name === name)
      : getApps().find((app) => app.name === "[DEFAULT]");
    const serviceAccount = loadCredentials(credentials);
    const app =
      existing ||
      initializeApp(
        serviceAccount ? { credential: cert(serviceAccount) } : undefined,
        name
      );
    const db = firestore.getFirestore(app);
    db.settings({
      ignoreUndefinedProperties: true,
      ...(options.settings || {}),
    });
    databases.set(cacheKey, db);
    return db;
  },
};
