/**
 * https://auth0.github.io/device-flow-playground/
 */
import {
  DeviceAuthorizationGrant,
  StorageProvider,
  Token,
  YieldType,
} from "../mod.ts";

class InMemoryStorageProvider implements StorageProvider {
  #token: Token | undefined;

  async save(token: Token): Promise<void> {
    this.#token = token;
  }

  async read(): Promise<Token | undefined> {
    return this.#token;
  }

  async delete(): Promise<boolean> {
    const r = !!this.#token;
    this.#token = undefined;
    return r;
  }
}

const StorageProvider = new InMemoryStorageProvider();
const deviceAuthorizationGrant = new DeviceAuthorizationGrant(StorageProvider, {
  base_url: "https://acme-demo.auth0.com",
  client_id: "nZ8JDrV8Hklf3JumewRl2ke3ovPZn5Ho",
  audience: "urn:my-videos",
  grant_type: "urn:ietf:params:oauth:grant-type:device_code",
  scope: "offline_access openid profile",
});

const gen = deviceAuthorizationGrant.retrieveToken();
let nextState = await gen.next();
while (!nextState.done) {
  switch (nextState.value.state) {
    case YieldType.DeviceCode: {
      console.log(nextState.value.data.verification_uri_complete);
      break;
    }
    case YieldType.Token: {
      console.log(nextState.value.data);
      break;
    }
  }
  nextState = await gen.next();
}
