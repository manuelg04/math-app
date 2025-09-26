import { NextResponse } from "next/server";
import { readAuthToken } from "@/lib/auth";
import { completeOnboarding } from "@/server/services/onboarding-service";

export async function POST() {
  try {
    const token = await readAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
    }

    const result = await completeOnboarding(token.sub);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Onboarding completado",
      redirect: "/dashboard",
    });
  } catch (error) {
    console.error("Error completando onboarding", error);
    return NextResponse.json({ success: false, message: "Error interno" }, { status: 500 });
  }
}