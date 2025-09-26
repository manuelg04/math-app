"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRegisterViewModel } from "@/view-models/auth/use-register-vm";

export function RegisterForm() {
  const { form, handleChange, handleSelectChange, handleSubmit, loading } = useRegisterViewModel();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Crea tu cuenta</CardTitle>
        <CardDescription>Empieza a aprender con contenido adaptado a ti.</CardDescription>
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
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={handleChange("password")}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="academicProgram">Programa académico</Label>
              <Select
                value={form.academicProgram}
                onValueChange={handleSelectChange("academicProgram")}
                required
              >
                <SelectTrigger id="academicProgram">
                  <SelectValue placeholder="Selecciona tu facultad o programa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ingenieria">Facultad de ingeniería</SelectItem>
                  <SelectItem value="derecho">Facultad de derecho</SelectItem>
                  <SelectItem value="administracion">Administración de empresas</SelectItem>
                  <SelectItem value="economia">Economía</SelectItem>
                  <SelectItem value="ciencias">Ciencias Básicas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-start gap-3 text-sm text-muted-foreground">
              <Checkbox
                name="acceptedTos"
                checked={form.acceptedTos}
                onChange={handleChange("acceptedTos")}
                required
              />
              <span>
                Acepto los <Link href="#" className="font-semibold text-primary underline-offset-4 hover:underline">términos y condiciones</Link> de Math App.
              </span>
            </label>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creando cuenta..." : "Registrarme"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
              Inicia sesión aquí
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
