const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type AuthTokenPayload = {
  sub: string;
  email: string;
  role: "STUDENT" | "TEACHER";
  iat: number;
  exp: number;
};

export const TOKEN_TTL_SECONDS = 60 * 60 * 24;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET ?? process.env.JWT_SECREAT;
  if (!secret) {
    throw new Error("JWT_SECRET no está configurado");
  }
  return secret;
}

if (typeof globalThis.crypto === "undefined" || !globalThis.crypto?.subtle) {
  throw new Error("El runtime no expone Web Crypto");
}

const subtleCryptoPromise: Promise<SubtleCrypto> = Promise.resolve(globalThis.crypto.subtle);

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes)
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlEncodeString(value: string): string {
  return base64UrlEncodeBytes(encoder.encode(value));
}

function base64UrlDecode(value: string): Uint8Array {
  const padLength = (4 - (value.length % 4 || 4)) % 4;
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(value.length + padLength, "=");
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(normalized, "base64"));
  }
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function hmacSha256(data: string, secret: string): Promise<Uint8Array> {
  const subtle = await subtleCryptoPromise;
  const key = await subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await subtle.sign("HMAC", key, encoder.encode(data));
  return new Uint8Array(signature);
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a[i]! ^ b[i]!;
  }
  return result === 0;
}

export async function createJwt(
  payload: { sub: string; email: string; role: "STUDENT" | "TEACHER" },
  ttlSeconds = TOKEN_TTL_SECONDS,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const fullPayload: AuthTokenPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };

  const baseHeader = base64UrlEncodeString(JSON.stringify(header));
  const basePayload = base64UrlEncodeString(JSON.stringify(fullPayload));
  const data = `${baseHeader}.${basePayload}`;

  const signatureBytes = await hmacSha256(data, getJwtSecret());
  const signature = base64UrlEncodeBytes(signatureBytes);

  return `${data}.${signature}`;
}

export async function verifyJwt(token: string): Promise<AuthTokenPayload | null> {
  if (!token) {
    return null;
  }
  const [headerEncoded, payloadEncoded, signatureProvided] = token.split(".");
  if (!headerEncoded || !payloadEncoded || !signatureProvided) {
    return null;
  }

  const data = `${headerEncoded}.${payloadEncoded}`;
  const expectedSignatureBytes = await hmacSha256(data, getJwtSecret());
  const providedSignatureBytes = base64UrlDecode(signatureProvided);

  if (!timingSafeEqualBytes(providedSignatureBytes, expectedSignatureBytes)) {
    return null;
  }

  try {
    const payloadBytes = base64UrlDecode(payloadEncoded);
    const payload = JSON.parse(decoder.decode(payloadBytes)) as AuthTokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch (error) {
    console.error("Error al analizar el token JWT", error);
    return null;
  }
}
