"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const INITIAL_STATE = {
  email: "",
};

type ChangeEvent = React.ChangeEvent<HTMLInputElement>;

export function useRecoverViewModel() {
  const [form, setForm] = React.useState(INITIAL_STATE);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleChange = React.useCallback((event: ChangeEvent) => {
    setForm({ email: event.target.value });
  }, []);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoading(true);
      try {
        const response = await fetch("/api/auth/request-reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message ?? "No pudimos enviar el código");
        }
        toast({ variant: "success", description: data.message ?? "Código enviado" });
        router.push(`/restablecer?email=${encodeURIComponent(form.email)}`);
      } catch (error) {
        toast({ variant: "error", description: error instanceof Error ? error.message : "Error inesperado" });
      } finally {
        setLoading(false);
      }
    },
    [form.email, router, toast],
  );

  return {
    form,
    loading,
    handleChange,
    handleSubmit,
  };
}
