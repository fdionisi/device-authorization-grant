import type { DeviceCode, StorageProvider, TokenPayload } from "./types.ts";

export interface Config {
  base_url: string;
  client_id: string;
  client_secret?: string;
  scope: string;
  audience: string;
  grant_type: string;
}

export enum YieldType {
  DeviceCode,
  Token,
}

interface YieldValueImpl<T, D> {
  state: T;
  data: D;
}

export type YieldValue =
  | YieldValueImpl<YieldType.DeviceCode, DeviceCode>
  | YieldValueImpl<YieldType.Token, TokenPayload>;

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
      if (Date.now() - token.created_at < token.payload.expires_in * 1000) {
        yield {
          state: YieldType.Token,
          data: token.payload,
        };
        return;
      } else if (token.payload.refresh_token && this.#config.client_secret) {
        const refreshed_token = {
          payload: await this.#refreshToken(token.payload.refresh_token),
          created_at: Date.now(),
        };

        await this.#storage.save(refreshed_token);

        yield {
          state: YieldType.Token,
          data: refreshed_token.payload,
        };
      }
    }

    const device_code_response = await this.#requestDeviceCode();
    yield {
      state: YieldType.DeviceCode,
      data: device_code_response,
    };

    const token_payload = await this.#requestToken(
      device_code_response.device_code,
      device_code_response.interval,
      device_code_response.expires_in,
    );

    token = {
      created_at: Date.now(),
      payload: token_payload,
    };

    await this.#storage.save(token);

    yield {
      state: YieldType.Token,
      data: token.payload,
    };
  }

  async #requestToken(
    device_code: string,
    interval: number,
    expires_in: number,
  ): Promise<TokenPayload> {
    const expires_at = Date.now() + (expires_in * 1000);

    while (Date.now() < expires_at) {
      const response = await fetch(`${this.#config.base_url}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: toUrlencoded({
          grant_type: this.#config.grant_type,
          device_code,
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

      if (response.ok) {
        return response.json()
      }
  
      throw new Error(await response.text())
    }

    throw new Error("Time expired");
  }

  async #refreshToken(refresh_token: string): Promise<TokenPayload> {
    const response = await fetch(`${this.#config.base_url}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: toUrlencoded({
        grant_type: "refresh_token",
        client_id: this.#config.client_id,
        client_secret: this.#config.client_secret!,
        refresh_token,
      }),
    });

    if (response.ok) {
      return response.json()
    }

    throw new Error(await response.text())
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

    if (response.ok) {
      return response.json()
    }

    throw new Error(await response.text())
  }
}
