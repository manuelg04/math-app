import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { createJwt } from "@/lib/token";
import { generateOtpCode, isOtpExpired } from "@/lib/otp";
import { sendMail } from "@/lib/email";
import { AuthErrorCode } from "@/lib/errors";
import type { Role } from "@prisma/client";

export type BasicUser = {
  id: string;
  email: string;
  role: Role;
};

function toBasicUser(user: { id: string; email: string; role: Role }): BasicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

export async function registerUser(email: string, password: string, academicProgram: string): Promise<
  | { success: true; user: BasicUser; token: string }
  | { success: false; error: string; code: AuthErrorCode }
> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "El correo ya está registrado", code: AuthErrorCode.EMAIL_ALREADY_EXISTS };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      acceptedTos: true,
      role: "STUDENT",
      academicProgram,
      onboardingComplete: false,
    },
  });

  const token = await createJwt({ sub: user.id, email: user.email, role: user.role });
  return { success: true, user: toBasicUser(user), token };
}

export async function authenticateUser(email: string, password: string): Promise<
  | { success: true; user: BasicUser; token: string }
  | { success: false; error: string; code: AuthErrorCode }
> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { success: false, error: "Credenciales inválidas", code: AuthErrorCode.INVALID_CREDENTIALS };
  }

  const isCorrectPassword = await verifyPassword(password, user.passwordHash);
  if (!isCorrectPassword) {
    return { success: false, error: "Credenciales inválidas", code: AuthErrorCode.INVALID_CREDENTIALS };
  }

  const token = await createJwt({ sub: user.id, email: user.email, role: user.role });
  return { success: true, user: toBasicUser(user), token };
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { success: true, message: "Si el correo existe, enviaremos un código" };
  }

  const otp = generateOtpCode();
  await prisma.user.update({ where: { id: user.id }, data: { otpCode: otp } });

  await sendMail({
    to: email,
    subject: "Código de recuperación",
    text: `Tu código de verificación es ${otp}`,
  });

  return { success: true, message: "Código enviado" };
}

export async function confirmPasswordReset(
  email: string,
  otpCode: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string; code?: AuthErrorCode }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.otpCode) {
    return { success: false, error: "Código inválido", code: AuthErrorCode.INVALID_OTP };
  }

  if (user.otpCode !== otpCode) {
    return { success: false, error: "Código inválido", code: AuthErrorCode.INVALID_OTP };
  }

  if (isOtpExpired(user.updatedAt)) {
    return { success: false, error: "El código ha expirado", code: AuthErrorCode.OTP_EXPIRED };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, otpCode: null },
  });

  return { success: true };
}
