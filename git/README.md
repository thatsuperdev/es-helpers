# Git utilities

Small callback-based helpers around `simple-git`.

```js
const git = require("es-helpers/git");

git.simplePull(process.cwd(), callback);
git.cloneRepo("git@github.com:org/repo.git#main", { dest: "./repo" }, callback);
git.commitFile("README.md", "Update docs", { baseDir: process.cwd() }, callback);
```

Main methods: `simplePull`, `cloneRepo`, and `commitFile`. `commitFile` pushes
after a successful commit. Install `simple-git` and use it only when that
automatic push behavior is intended.
