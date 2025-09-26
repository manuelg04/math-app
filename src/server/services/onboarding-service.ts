import { prisma } from "@/lib/prisma";

export type ProfileUpdate = {
  fullName: string;
  profilePhoto?: string;
};

export async function updateUserProfile(userId: string, data: ProfileUpdate): Promise<
  | { success: true; user: { fullName: string; profilePhoto: string | null } }
  | { success: false; error: string }
> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingComplete: true },
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado" };
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName,
        profilePhoto: data.profilePhoto,
      },
      select: {
        fullName: true,
        profilePhoto: true,
      },
    });

    return {
      success: true,
      user: {
        fullName: updatedUser.fullName || "",
        profilePhoto: updatedUser.profilePhoto,
      }
    };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return { success: false, error: "Error al actualizar el perfil" };
  }
}

export async function completeOnboarding(userId: string): Promise<
  | { success: true }
  | { success: false; error: string }
> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true,
        onboardingComplete: true,
      },
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado" };
    }

    if (!user.fullName) {
      return { success: false, error: "Debes completar tu perfil primero" };
    }

    if (user.onboardingComplete) {
      return { success: true };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingComplete: true,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return { success: false, error: "Error al completar el onboarding" };
  }
}

export async function getUserOnboardingStatus(userId: string): Promise<{
  onboardingComplete: boolean;
  hasFullName: boolean;
  hasProfilePhoto: boolean;
} | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        onboardingComplete: true,
        fullName: true,
        profilePhoto: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      onboardingComplete: user.onboardingComplete,
      hasFullName: Boolean(user.fullName),
      hasProfilePhoto: Boolean(user.profilePhoto),
    };
  } catch (error) {
    console.error("Error getting onboarding status:", error);
    return null;
  }
}