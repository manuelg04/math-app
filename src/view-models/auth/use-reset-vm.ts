"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const INITIAL_STATE = {
  email: "",
  otp: "",
  password: "",
};

type Field = keyof typeof INITIAL_STATE;

export function useResetPasswordViewModel(initialEmail = "") {
  const [form, setForm] = React.useState({ ...INITIAL_STATE, email: initialEmail });
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  React.useEffect(() => {
    if (initialEmail) {
      setForm((prev) => ({ ...prev, email: initialEmail }));
    }
  }, [initialEmail]);

  const handleChange = React.useCallback(
    (field: Field) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [field]: event.target.value }));
      },
    [],
  );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoading(true);
      try {
        const response = await fetch("/api/auth/confirm-reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email,
            otp: form.otp,
            password: form.password,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message ?? "No pudimos actualizar la contraseña");
        }
        toast({ variant: "success", description: data.message ?? "Contraseña actualizada" });
        router.push("/login");
      } catch (error) {
        toast({ variant: "error", description: error instanceof Error ? error.message : "Error inesperado" });
      } finally {
        setLoading(false);
      }
    },
    [form.email, form.otp, form.password, router, toast],
  );

  return {
    form,
    loading,
    handleChange,
    handleSubmit,
  };
}
