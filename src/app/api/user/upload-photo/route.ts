import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { readAuthToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const token = await readAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("photo") as File;

    if (!file) {
      return NextResponse.json({ success: false, message: "No se recibió ningún archivo" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Formato de imagen no válido. Use JPG, PNG o WebP" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "La imagen debe ser menor a 5MB" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const mimeType = file.type || "image/png";
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      message: "Imagen subida correctamente",
      url: dataUrl,
    });
  } catch (error) {
    console.error("Error subiendo imagen", error);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}
