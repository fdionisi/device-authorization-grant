import {
  DeviceAuthorizationGrantError,
  DeviceAuthorizationGrantErrorType,
  UnknownError,
} from "./error.ts";
import type { DeviceCode, Storage, TokenPayload } from "./types.ts";

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

type YieldValueImpl<T, D> = {
  state: T;
  data: D;
};

export type YieldValue =
  | YieldValueImpl<"device_code", DeviceCode>
  | YieldValueImpl<"token", TokenPayload>;

function toUrlencoded(input: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    params.append(key, value);
  }
  return params.toString();
}

export class DeviceAuthorizationGrant {
  #storage: Storage;
  #config: Config;

  constructor(
    storage: Storage,
    config: Config,
  ) {
    this.#storage = storage;
    this.#config = config;
  }

  async *retrieveToken(
    failOnEmptyStorage = false,
  ): AsyncIterableIterator<YieldValue> {
    let token = await this.#storage.read();
    if (token) {
      if (Date.now() - token.created_at < token.payload.expires_in * 1000) {
        yield {
          state: "token",
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
          state: "token",
          data: refreshed_token.payload,
        };
        return;
      }
    } 
    
    if (failOnEmptyStorage) {
      throw new DeviceAuthorizationGrantError(
        DeviceAuthorizationGrantErrorType.NotFound,
        "Token not present in the underlying `Storage`. " +
          "This error is caused by the parameter `failOnEmptyStorage` being set to `true`; " +
          "to proceed with the normal authentication flow, ensure to set `failOnEmptyStorage` to explicitly set it to `false`, or leave it `undefined`.",
      );
    }

    const device_code_response = await this.#requestDeviceCode();
    yield {
      state: "device_code",
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
      state: "token",
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
          case "slow_down": {
            interval *= 2;
          }
          case "authorization_pending": {
            await new Promise<void>((resolve) =>
              setTimeout(() => resolve(), interval * 1000)
            );
            break;
          }
          case DeviceAuthorizationGrantErrorType.AccessDenied:
          case DeviceAuthorizationGrantErrorType.ExpiredToken: {
            throw new DeviceAuthorizationGrantError(
              json.error,
              json.error_description,
            );
          }
          default: {
            throw new UnknownError(`${json.error} - ${json.error_description}`);
          }
        }
        continue;
      }

      if (response.ok) {
        return response.json() as any;
      }

      throw new UnknownError(await response.text());
    }

    throw new DeviceAuthorizationGrantError(
      DeviceAuthorizationGrantErrorType.Timeout,
      "The initiated authorization flow reached its expiration time.",
    );
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
      return response.json() as any;
    }

    throw new UnknownError(await response.text());
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
      return response.json() as any;
    }

    throw new UnknownError(await response.text());
  }
}
