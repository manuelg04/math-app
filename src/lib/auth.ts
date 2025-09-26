import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { TOKEN_TTL_SECONDS, verifyJwt, type AuthTokenPayload } from "@/lib/token";

const COOKIE_NAME = "math_app_token";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) {
    return false;
  }
  const salt = Buffer.from(saltHex, "hex");
  const derivedKey = scryptSync(password, salt, 64);
  const storedKey = Buffer.from(hashHex, "hex");
  if (derivedKey.length !== storedKey.length) {
    return false;
  }
  return timingSafeEqual(derivedKey, storedKey);
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function readAuthToken(): Promise<AuthTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return verifyJwt(token);
}
