"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useResetPasswordViewModel } from "@/view-models/auth/use-reset-vm";

interface ResetFormProps {
  initialEmail?: string;
}

export function ResetForm({ initialEmail = "" }: ResetFormProps) {
  const { form, handleChange, handleSubmit, loading } = useResetPasswordViewModel(initialEmail);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Restablece tu contraseña</CardTitle>
        <CardDescription>Introduce el código de 6 dígitos y crea una nueva contraseña segura.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={handleChange("email")}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="otp">Código de verificación</Label>
              <Input
                id="otp"
                inputMode="numeric"
                maxLength={6}
                pattern="\\d{6}"
                placeholder="000000"
                value={form.otp}
                onChange={handleChange("otp")}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={handleChange("password")}
                required
                autoComplete="new-password"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Actualizando..." : "Guardar contraseña"}
          </Button>
          <Link href="/login" className="text-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
            Regresar al inicio de sesión
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
