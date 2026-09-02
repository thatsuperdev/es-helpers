# Location helper

IP geolocation clients for IPinfo, ipdata, ipstack, and IP2Location.

```js
const location = require("es-helpers/location");

const provider = location.use("ipinfo").setApiKey(process.env.IPINFO_TOKEN);
const details = await provider.getIpInfo({ ip: "8.8.8.8" });
```

`use(name)` selects a provider. Each provider supports `setApiKey`,
`setFields`, and `getIpInfo`; IPinfo also exposes `getGeo`. Methods return a
Promise when no callback is supplied. Install `axios`.
