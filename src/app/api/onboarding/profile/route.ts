import { NextResponse } from "next/server";
import { readAuthToken } from "@/lib/auth";
import { updateUserProfile } from "@/server/services/onboarding-service";

export async function POST(request: Request) {
  try {
    const token = await readAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const fullName = String(body?.fullName ?? "").trim();
    const profilePhoto = String(body?.profilePhoto ?? "");

    if (!fullName) {
      return NextResponse.json({ success: false, message: "El nombre completo es obligatorio" }, { status: 400 });
    }

    const result = await updateUserProfile(token.sub, {
      fullName,
      profilePhoto: profilePhoto || undefined,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Perfil actualizado correctamente",
      user: result.user,
    });
  } catch (error) {
    console.error("Error en actualización de perfil", error);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}