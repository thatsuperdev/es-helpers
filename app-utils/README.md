# App utilities

Shared application globals, transformations, tokens, and helper lookup.

```js
const appUtils = require("es-helpers/app-utils");

appUtils.setCommonGlobals(process.cwd());
const encoded = appUtils.base64({ active: true });
const token = appUtils.createUserToken(user, {
  jwtSecret: process.env.JWT_SECRET,
  expiresIn: "1h",
});
```

Main methods: `setCommonGlobals`, `setRequestGlobals`, `loadHelper`,
`toCamelCase`, `reverseCamelCase`, `base64`, `decodeBase64`,
`createUserToken`, and `queryStringToJSON`.

Install `debug` and `dotenv`; `jsonwebtoken` and `qs` are needed only by the
methods that use them. `location` delegates to the location helper.
