# Encryption utilities

Password hashing, verification, and cryptographically secure random strings.

```js
const encrypt = require("es-helpers/encrypt");

const hash = await encrypt.hashPassword("secret");
const valid = await encrypt.verifyPassword("secret", hash);
const token = encrypt.randomString(32);
```

Install `bcrypt`. `getHashedPassword`, `toMD5`, `matchPassword`, and
`matchUsingSalt` exist for legacy hashes only; do not use MD5 or SHA-1 for new
passwords or tokens.
