import { NextResponse } from "next/server";
import { registerUser } from "@/server/services/auth-service";
import { isValidEmail, isValidPassword } from "@/lib/validators";
import { setAuthCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").toLowerCase();
    const password = String(body?.password ?? "");
    const academicProgram = String(body?.academicProgram ?? "");
    const acceptedTos = Boolean(body?.acceptedTos);

    if (!acceptedTos) {
      return NextResponse.json({ success: false, message: "Debes aceptar los términos" }, { status: 400 });
    }

    if (!academicProgram) {
      return NextResponse.json({ success: false, message: "Debes seleccionar un programa académico" }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, message: "Correo inválido" }, { status: 400 });
    }

    if (!isValidPassword(password)) {
      return NextResponse.json({ success: false, message: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
    }

    const result = await registerUser(email, password, academicProgram);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    }

    await setAuthCookie(result.token);
    return NextResponse.json({
      success: true,
      message: "Registro exitoso",
      redirect: "/dashboard",
      user: result.user,
    });
  } catch (error) {
    console.error("Error en registro", error);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
