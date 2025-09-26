"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRecoverViewModel } from "@/view-models/auth/use-recover-vm";

export function RecoverForm() {
  const { form, handleChange, handleSubmit, loading } = useRecoverViewModel();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Recupera tu acceso</CardTitle>
        <CardDescription>Te enviaremos un código de verificación a tu correo.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <CardContent>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="tucorreo@dominio.com"
              value={form.email}
              onChange={handleChange}
              required
            />
            <p className="text-xs text-muted-foreground">
              El código tendrá validez temporal. Revisa tu bandeja de entrada o spam.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Enviando código..." : "Enviar código"}
          </Button>
          <Link href="/login" className="text-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
            Volver al inicio de sesión
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
