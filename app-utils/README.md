# App utilities

Shared application globals, transformations, and tokens.

```js
const appUtils = require("es-helpers/app-utils");

appUtils.setCommonGlobals(process.cwd());
const encoded = appUtils.base64({ active: true });
const token = appUtils.createUserToken(user, {
  jwtSecret: process.env.JWT_SECRET,
  expiresIn: "1h",
});
```

Main methods: `setCommonGlobals`, `setRequestGlobals`, `toCamelCase`,
`reverseCamelCase`, `base64`, `decodeBase64`, `createUserToken`, and
`queryStringToJSON`.

Install `debug`; `jsonwebtoken` and `qs` are needed only by the methods that
use them. This helper does not load dotenv, preload databases, or resolve
project-specific helpers. Extend it from the consumer's local `app.util.js`.
