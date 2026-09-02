const helpers = [
  "appUtils",
  "encrypt",
  "file",
  "firestore",
  "git",
  "location",
  "mysql",
  "postgres",
];

for (const name of helpers) {
  const file = name === "appUtils" ? "app-utils" : name;
  Object.defineProperty(module.exports, name, {
    enumerable: true,
    get: () => require(`./${file}`),
  });
}
