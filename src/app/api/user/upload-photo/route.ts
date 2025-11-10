import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { readAuthToken } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  try {
    const token = await readAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
    }

    const rwToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!rwToken) {
      console.error("Missing BLOB_READ_WRITE_TOKEN env variable");
      return NextResponse.json({ success: false, message: "Configuración de almacenamiento incompleta" }, { status: 500 });
    }

    const formData = await request.formData();
    const photo = formData.get("photo");

    if (!(photo instanceof File)) {
      return NextResponse.json({ success: false, message: "Archivo no válido" }, { status: 400 });
    }

    if (!photo.type.startsWith("image/")) {
      return NextResponse.json({ success: false, message: "El archivo debe ser una imagen" }, { status: 400 });
    }

    if (photo.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ success: false, message: "La imagen debe pesar máximo 10MB" }, { status: 400 });
    }

    const fileBuffer = await photo.arrayBuffer();
    const timestamp = Date.now();
    const extension = photo.name?.split(".").pop()?.toLowerCase() || "jpg";
    const key = `profile-photos/${token.sub}/${timestamp}-${Math.random().toString(36).slice(2)}.${extension}`;

    const blob = await put(key, fileBuffer, {
      access: "public",
      contentType: photo.type,
      token: rwToken,
      cacheControlMaxAge: 60 * 60 * 24 * 365, // 1 año
    });

    return NextResponse.json({ success: true, url: blob.url });
  } catch (error) {
    console.error("Error subiendo foto de perfil", error);
    return NextResponse.json({ success: false, message: "No se pudo subir la imagen" }, { status: 500 });
  }
}
