import { NextResponse } from "next/server";
import { readAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const token = await readAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: token.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        academicProgram: true,
        profilePhoto: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error obteniendo perfil:", error);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
