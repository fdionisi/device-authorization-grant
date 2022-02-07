<div align="center">
  <h1>DeviceAuthorizationGrant</h1>
  <p>
    <b>
      A library to help implement the OAuth 2.0 Device Authorization Grant.
    </b>
  </p>
</div>

## Usage

### Deno

```ts
import { DeviceAuthorizationGrant } from "https://github.com/fdionisi/device-authorization-grant/blob/0.2.0/device-authorization-grant.ts";

const deviceAuthorizationGrant = new DeviceAuthorizationGrant(
  myStorage,
  config,
);
```

### Node.js

```ts
// ES Module
import { DeviceAuthorizationGrant } from "@fdionisi/device-authorization-grant";

// Common.js
const { DeviceAuthorizationGrant } = require(
  "@fdionisi/device-authorization-grant",
);

const deviceAuthorizationGrant = new DeviceAuthorizationGrant(
  myStorage,
  config,
);
```

## License

This library is distributed under the terms the MIT license.

See [LICENSE](LICENSE) for details.
