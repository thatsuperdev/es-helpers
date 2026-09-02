# File utilities

Callback-compatible JSON, copy, download, archive, and removal helpers.

```js
const file = require("es-helpers/file");

file.saveToJSON("./data/settings", { active: true }, callback);
file.getStoredJSON("./data/settings", callback);
file.copyDirRecursive("./source", "./target", {}, callback);
```

Main methods: `saveToJSON`, `getStoredJSON`, `pathExists`, `copyFile`,
`copyRemoteFile`, `copyDirRecursive`, `replaceContentIn`, `removeDir`,
`removeFile`, `zipFolder`, and `git`.

Most methods use Node.js built-ins. Install `folder-zip` for `zipFolder` and
`simple-git` for the `git` integration.
