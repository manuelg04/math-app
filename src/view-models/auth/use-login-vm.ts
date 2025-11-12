"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const INITIAL_STATE = {
  email: "",
  password: "",
};

type Field = keyof typeof INITIAL_STATE;

type ChangeEvent = React.ChangeEvent<HTMLInputElement>;

export function useLoginViewModel() {
  const [form, setForm] = React.useState(INITIAL_STATE);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  React.useEffect(() => {
    try {
      router.prefetch("/dashboard");
    } catch {
      // ignore prefetch failures (offline, etc.)
    }
  }, [router]);

  const handleChange = React.useCallback(
    (field: Field) =>
      (event: ChangeEvent) => {
        setForm((prev) => ({ ...prev, [field]: event.target.value }));
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
        };

        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message ?? "No pudimos iniciar sesión");
        }

        const redirect = (data?.redirect as string | undefined) ?? searchParams.get("from") ?? "/dashboard";

        toast({ variant: "success", title: "Bienvenido", description: data.message ?? "Inicio de sesión exitoso" });
        setForm(INITIAL_STATE);
        React.startTransition(() => {
          router.push(redirect);
        });
      } catch (error) {
        toast({ variant: "error", description: error instanceof Error ? error.message : "Error inesperado" });
      } finally {
        setLoading(false);
      }
    },
    [form.email, form.password, router, searchParams, toast],
  );

  return {
    form,
    loading,
    handleChange,
    handleSubmit,
  };
}
