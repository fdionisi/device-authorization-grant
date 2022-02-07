export enum DeviceAuthorizationGrantErrorType {
  AccessDenied = "access_denied",
  ExpiredToken = "expired_token",
  NotFound = "not_found",
  Timeout = "timeout",
  Unknown = "unknown",
}

export class DeviceAuthorizationGrantError extends Error {
  readonly type: DeviceAuthorizationGrantErrorType;

  constructor(
    type: DeviceAuthorizationGrantErrorType,
    message: string,
  ) {
    super(message);
    this.type = type;
  }

  get name(): string {
    return `DeviceAuthorizationGrantError(${this.type})`;
  }
}

export class UnknownError extends DeviceAuthorizationGrantError {
  constructor(message?: string) {
    super(
      DeviceAuthorizationGrantErrorType.Unknown,
      message || "Unknown error",
    );
  }
}
