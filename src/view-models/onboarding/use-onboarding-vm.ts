"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";

interface InitialData {
  email: string;
  fullName: string;
  profilePhoto: string | null;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const INITIAL_STATE = {
  fullName: "",
  profilePhoto: null as File | null,
  profilePhotoUrl: "",
  testType: "saber-pro",
};

type Field = keyof typeof INITIAL_STATE;
type ChangeEvent = React.ChangeEvent<HTMLInputElement>;

export function useOnboardingViewModel(initialData: InitialData) {
  const [form, setForm] = React.useState({
    ...INITIAL_STATE,
    fullName: initialData.fullName,
    profilePhotoUrl: initialData.profilePhoto || "",
  });
  const [loading, setLoading] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState<"profile" | "test-selection">("profile");
  const { toast } = useToast();

  const handleChange = React.useCallback(
    (field: Field) =>
      (event: ChangeEvent) => {
        const value = event.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
      },
    [],
  );

  const handleSelectChange = React.useCallback(
    (field: Field) =>
      (value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
      },
    [],
  );

  const handleFileChange = React.useCallback(
    (file: File | null): boolean => {
      if (!file) {
        setForm((prev) => ({ ...prev, profilePhoto: null }));
        return true;
      }

      if (!file.type.startsWith("image/")) {
        toast({ variant: "error", description: "El archivo debe ser una imagen" });
        return false;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ variant: "error", description: "La imagen debe pesar máximo 10MB" });
        return false;
      }

      setForm((prev) => ({ ...prev, profilePhoto: file }));
      return true;
    },
    [toast],
  );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!form.fullName.trim()) {
        toast({ variant: "error", description: "El nombre completo es obligatorio" });
        return;
      }

      setLoading(true);
      try {
        // Upload photo if exists
        let profilePhotoUrl = form.profilePhotoUrl || "";
        if (form.profilePhoto) {
          const formData = new FormData();
          formData.append("photo", form.profilePhoto);

          const uploadResponse = await fetch("/api/user/upload-photo", {
            method: "POST",
            body: formData,
          });

          const uploadData = await uploadResponse.json();
          if (!uploadResponse.ok || !uploadData?.url) {
            throw new Error(uploadData?.message ?? "No se pudo subir la imagen");
          }
          profilePhotoUrl = uploadData.url;
        }

        // Save profile data
        const response = await fetch("/api/onboarding/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: form.fullName,
            profilePhoto: profilePhotoUrl,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message ?? "Error al guardar el perfil");
        }

        setForm((prev) => ({
          ...prev,
          profilePhoto: null,
          profilePhotoUrl,
        }));

        toast({ variant: "success", description: "Perfil actualizado" });
        setCurrentStep("test-selection");
      } catch (error) {
        toast({ variant: "error", description: error instanceof Error ? error.message : "Error inesperado" });
      } finally {
        setLoading(false);
      }
    },
    [form.fullName, form.profilePhoto, form.profilePhotoUrl, toast],
  );

  const goToTestSelection = React.useCallback(() => {
    setCurrentStep("test-selection");
  }, []);

  return {
    form,
    loading,
    currentStep,
    handleChange,
    handleSelectChange,
    handleFileChange,
    handleSubmit,
    goToTestSelection,
  };
}
