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
      console.log("Login form submission started");
      setLoading(true);
      try {
        const requestBody = {
          email: form.email,
          password: form.password,
        };
        console.log("Login request body:", { ...requestBody, password: "[REDACTED]" });
        
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        
        console.log("Login response status:", response.status, response.statusText);
        
        const data = await response.json();
        console.log("Login response data:", data);
        
        if (!response.ok) {
          console.error("Login failed with error:", data?.message);
          throw new Error(data?.message ?? "No pudimos iniciar sesión");
        }
        
        const redirect = (data?.redirect as string | undefined) ?? searchParams.get("from") ?? "/dashboard";
        console.log("Login successful, redirecting to:", redirect);
        
        toast({ variant: "success", title: "Bienvenido", description: data.message ?? "Inicio de sesión exitoso" });
        setForm(INITIAL_STATE);
        router.push(redirect);
      } catch (error) {
        console.error("Login error:", error);
        toast({ variant: "error", description: error instanceof Error ? error.message : "Error inesperado" });
      } finally {
        setLoading(false);
        console.log("Login form submission completed");
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
