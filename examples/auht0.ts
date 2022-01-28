/**
 * https://auth0.github.io/device-flow-playground/
 */
import { DeviceAuthorizationGrant, Storage, Token } from "../mod.ts";

class InMemoryStorage implements Storage {
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

const storage = new InMemoryStorage();
const deviceAuthorizationGrant = new DeviceAuthorizationGrant(storage, {
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
    case "device_code": {
      console.log(nextState.value.data.verification_uri_complete);
      break;
    }
    case "token": {
      console.log(nextState.value.data);
      break;
    }
  }
  nextState = await gen.next();
}
