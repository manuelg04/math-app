"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";

interface InitialData {
  email: string;
  fullName: string;
  profilePhoto: string;
}

const INITIAL_STATE = {
  fullName: "",
  profilePhoto: null as File | null,
  testType: "",
};

type Field = keyof typeof INITIAL_STATE;
type ChangeEvent = React.ChangeEvent<HTMLInputElement>;

export function useOnboardingViewModel(initialData: InitialData) {
  const [form, setForm] = React.useState({
    ...INITIAL_STATE,
    fullName: initialData.fullName,
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

  const handleFileChange = React.useCallback((file: File) => {
    setForm((prev) => ({ ...prev, profilePhoto: file }));
  }, []);

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
        let profilePhotoUrl = "";
        if (form.profilePhoto) {
          const formData = new FormData();
          formData.append("photo", form.profilePhoto);

          const uploadResponse = await fetch("/api/user/upload-photo", {
            method: "POST",
            body: formData,
          });

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            profilePhotoUrl = uploadData.url;
          }
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

        toast({ variant: "success", description: "Perfil actualizado" });
        setCurrentStep("test-selection");
      } catch (error) {
        toast({ variant: "error", description: error instanceof Error ? error.message : "Error inesperado" });
      } finally {
        setLoading(false);
      }
    },
    [form.fullName, form.profilePhoto, toast],
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