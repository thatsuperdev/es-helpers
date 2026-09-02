# Firestore helper

Creates and reuses Firebase Admin Firestore instances, including named apps.

```js
const firestore = require("es-helpers/firestore");

const db = firestore.getInstance(
  JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
);
const devDb = firestore.getInstance("./service-account.json", {
  name: "development",
  settings: { ignoreUndefinedProperties: true },
});
```

`getInstance(credentials?, options?)` accepts a service-account object or JSON
file path. Without credentials it uses Firebase Admin's default credentials.
Install `firebase-admin`.
