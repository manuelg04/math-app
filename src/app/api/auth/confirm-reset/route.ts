import { NextResponse } from "next/server";
import { confirmPasswordReset } from "@/server/services/auth-service";
import { isValidEmail, isValidPassword } from "@/lib/validators";

const otpRegex = /^\d{6}$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").toLowerCase();
    const otp = String(body?.otp ?? body?.code ?? "");
    const password = String(body?.password ?? body?.newPassword ?? "");

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, message: "Correo inválido" }, { status: 400 });
    }

    if (!otpRegex.test(otp)) {
      return NextResponse.json({ success: false, message: "Código inválido" }, { status: 400 });
    }

    if (!isValidPassword(password)) {
      return NextResponse.json({ success: false, message: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
    }

    const result = await confirmPasswordReset(email, otp, password);
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error ?? "Código inválido" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Contraseña actualizada" });
  } catch (error) {
    console.error("Error al confirmar OTP", error);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
