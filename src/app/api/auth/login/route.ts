import { NextResponse } from "next/server";
import { authenticateUser } from "@/server/services/auth-service";
import { isValidEmail, isValidPassword } from "@/lib/validators";
import { setAuthCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").toLowerCase();
    const password = String(body?.password ?? "");

    if (!isValidEmail(email) || !isValidPassword(password)) {
      return NextResponse.json({ success: false, message: "Credenciales inválidas" }, { status: 400 });
    }

    const result = await authenticateUser(email, password);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error }, { status: 401 });
    }

    await setAuthCookie(result.token);

    return NextResponse.json({
      success: true,
      message: "Inicio de sesión exitoso",
      redirect: "/dashboard",
      user: result.user,
    });
  } catch (error) {
    console.error("Error en login", error);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
