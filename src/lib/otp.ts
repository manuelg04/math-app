const DEFAULT_WINDOW_MINUTES = 10;

export function generateOtpCode(): string {
  const code = Math.floor(100000 + Math.random() * 900000);
  return String(code);
}

export function getOtpWindowMinutes(): number {
  const fromEnv = Number(process.env.OTP_WINDOW_MINUTES);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_WINDOW_MINUTES;
}

export function isOtpExpired(updatedAt: Date): boolean {
  const now = Date.now();
  const windowMs = getOtpWindowMinutes() * 60 * 1000;
  return now - updatedAt.getTime() > windowMs;
}
