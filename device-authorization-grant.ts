import type { DeviceCode, StorageProvider, TokenPayload } from "./types.ts";

export interface Config {
  base_url: string;
  client_id: string;
  scope: string;
  audience: string;
  grant_type: string;
}

export enum StateMachine {
  DeviceCode,
  Token,
}

interface YieldValueImpl<T, D> {
  state: T;
  data: D;
}

export type YieldValue =
  | YieldValueImpl<StateMachine.DeviceCode, DeviceCode>
  | YieldValueImpl<StateMachine.Token, TokenPayload>;

function toUrlencoded(input: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    params.append(key, value);
  }
  return params.toString();
}

export class DeviceAuthorizationGrant {
  #storage: StorageProvider;
  #config: Config;

  constructor(
    storage: StorageProvider,
    config: Config,
  ) {
    this.#storage = storage;
    this.#config = config;
  }

  async *retrieveToken(): AsyncIterableIterator<YieldValue> {
    let token = await this.#storage.read();
    if (token) {
      yield {
        state: StateMachine.Token,
        data: token.payload,
      };
      return;
    }

    const deviceCodeResponse = await this.#requestDeviceCode();
    yield {
      state: StateMachine.DeviceCode,
      data: deviceCodeResponse,
    };

    const tokenPayload = await this.#requestToken(
      deviceCodeResponse.device_code,
      deviceCodeResponse.interval,
      deviceCodeResponse.expires_in,
    );

    token = {
      created_at: Date.now(),
      payload: tokenPayload,
    };

    await this.#storage.save(token);

    yield {
      state: StateMachine.Token,
      data: token.payload,
    };
  }

  async #requestToken(
    deviceCode: string,
    interval: number,
    expiresIn: number,
  ): Promise<TokenPayload> {
    const expiresAt = Date.now() + (expiresIn * 1000);
    while (Date.now() < expiresAt) {
      const response = await fetch(`${this.#config.base_url}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: toUrlencoded({
          grant_type: this.#config.grant_type,
          device_code: deviceCode,
          client_id: this.#config.client_id,
        }),
      });

      if (response.status >= 400 && response.status < 500) {
        const json: any = await response.json();
        switch (json.error) {
          case "authorization_pending": {
            await new Promise<void>((resolve) =>
              setTimeout(() => resolve(), interval * 1000)
            );
          }
        }
        continue;
      }

      return response.json() as any;
    }

    throw new Error("Time expired");
  }

  async #requestDeviceCode(): Promise<DeviceCode> {
    const response = await fetch(`${this.#config.base_url}/oauth/device/code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: toUrlencoded({
        client_id: this.#config.client_id,
        scope: this.#config.scope,
        audience: this.#config.audience,
      }),
    });

    return response.json() as any;
  }
}
