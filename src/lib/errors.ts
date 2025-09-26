export enum AuthErrorCode {
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS",
  INVALID_TOKEN = "INVALID_TOKEN",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  INVALID_OTP = "INVALID_OTP",
  OTP_EXPIRED = "OTP_EXPIRED",
}

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  [AuthErrorCode.INVALID_CREDENTIALS]: "Credenciales inválidas",
  [AuthErrorCode.USER_NOT_FOUND]: "Usuario no encontrado",
  [AuthErrorCode.EMAIL_ALREADY_EXISTS]: "El correo ya está registrado",
  [AuthErrorCode.INVALID_TOKEN]: "Token inválido",
  [AuthErrorCode.TOKEN_EXPIRED]: "Token expirado",
  [AuthErrorCode.INVALID_OTP]: "Código inválido",
  [AuthErrorCode.OTP_EXPIRED]: "El código ha expirado",
};

export function getAuthErrorMessage(code: AuthErrorCode): string {
  return AUTH_ERROR_MESSAGES[code] || "Error de autenticación";
}