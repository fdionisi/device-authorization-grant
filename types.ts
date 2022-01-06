export interface DeviceCode {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

export interface TokenPayload {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
}

export interface Token {
  created_at: number;
  payload: TokenPayload;
}

export interface StorageProvider {
  delete(): Promise<boolean>;
  read(): Promise<Token | undefined>;
  save(credentials: Token): Promise<void>;
}
