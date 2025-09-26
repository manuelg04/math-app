"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoginViewModel } from "@/view-models/auth/use-login-vm";

export function LoginForm() {
  const { form, handleChange, handleSubmit, loading } = useLoginViewModel();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>¡Te damos la bienvenida!</CardTitle>
        <CardDescription>Inicia sesión para continuar con tu aprendizaje.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tucorreo@dominio.com"
                value={form.email}
                onChange={handleChange("email")}
                required
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={form.password}
                onChange={handleChange("password")}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="flex justify-end">
              <Link href="/recuperar" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Procesando..." : "Iniciar sesión"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿Aún no tienes cuenta?{" "}
            <Link href="/registro" className="font-semibold text-primary underline-offset-4 hover:underline">
              Regístrate gratis
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
