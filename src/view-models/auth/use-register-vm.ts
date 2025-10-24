"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const INITIAL_STATE = {
  email: "",
  password: "",
  academicProgram: "",
  acceptedTos: false,
};

type Field = keyof typeof INITIAL_STATE;

type ChangeEvent = React.ChangeEvent<HTMLInputElement>;

export function useRegisterViewModel() {
  const [form, setForm] = React.useState(INITIAL_STATE);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleChange = React.useCallback(
    (field: Field) =>
      (event: ChangeEvent) => {
        const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
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

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoading(true);
      try {
        const requestBody = {
          email: form.email,
          password: form.password,
          academicProgram: form.academicProgram,
          acceptedTos: form.acceptedTos,
        };

        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message ?? "No pudimos crear tu cuenta");
        }

        toast({ variant: "success", title: "Cuenta creada", description: data.message ?? "Registro exitoso" });
        setForm(INITIAL_STATE);
        router.push((data?.redirect as string | undefined) ?? "/dashboard");
      } catch (error) {
        toast({ variant: "error", description: error instanceof Error ? error.message : "Error inesperado" });
      } finally {
        setLoading(false);
      }
    },
    [form.acceptedTos, form.email, form.password, form.academicProgram, router, toast],
  );

  return {
    form,
    loading,
    handleChange,
    handleSelectChange,
    handleSubmit,
  };
}
