export interface AuthFormProps {
  readonly name?: string;
  readonly location?: string;
  readonly login: string;
  readonly password: string;
}

export interface BannerFormProps {
  readonly name?: string;
  readonly location?: string;
}

export enum GuestDisconnectedReason {
  NotAuthorized = "not_authorized",
  TimeAfterExpire = "time_after_expire",
  // TimeBeforeStart = "time_before_start",
  // TimeExpired = "time_expired",
  DuplicatedName = "duplicated_name",
  MaxConnectionsExceeded = "max_connections_exceeded",
  AuthValidateConnectionFailed = "auth_validate_connect_failed",
  Unknown = "unknown",
}
