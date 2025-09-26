import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/server/services/auth-service";
import { isValidEmail } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").toLowerCase();

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, message: "Correo inválido" }, { status: 400 });
    }

    const result = await requestPasswordReset(email);
    return NextResponse.json({ success: result.success, message: result.message });
  } catch (error) {
    console.error("Error al solicitar OTP", error);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
