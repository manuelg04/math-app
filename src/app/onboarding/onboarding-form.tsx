"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOnboardingViewModel } from "@/view-models/onboarding/use-onboarding-vm";

interface OnboardingFormProps {
  initialData: {
    email: string;
    fullName: string;
    profilePhoto: string;
  };
}

export function OnboardingForm({ initialData }: OnboardingFormProps) {
  const {
    form,
    loading,
    currentStep,
    handleChange,
    handleSelectChange,
    handleFileChange,
    handleSubmit,
  } = useOnboardingViewModel(initialData);

  const [previewUrl, setPreviewUrl] = useState<string>(initialData.profilePhoto || "");

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      handleFileChange(file);
    }
  };

  if (currentStep === "test-selection") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>¿Para qué te quieres preparar?</CardTitle>
          <CardDescription>Selecciona el tipo de prueba para iniciar tu diagnóstico</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Label htmlFor="testType">Tipo de prueba</Label>
            <Select value={form.testType} onValueChange={handleSelectChange("testType")}>
              <SelectTrigger id="testType">
                <SelectValue placeholder="Selecciona una prueba" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="saber-pro">Prueba Saber Pro</SelectItem>
                <SelectItem value="icfes">ICFES</SelectItem>
                <SelectItem value="tyt">TyT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={() => window.location.href = `/onboarding/test-placeholder/${form.testType}`}
            disabled={!form.testType || loading}
            className="mt-6 w-full"
          >
            Iniciar prueba diagnóstica
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Completa tu perfil</CardTitle>
        <CardDescription>Necesitamos algunos datos para personalizar tu experiencia</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-32 w-32 overflow-hidden rounded-full bg-muted">
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Foto de perfil"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-16 w-16"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
            <div>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <Label htmlFor="photo" className="cursor-pointer">
                <Button type="button" variant="secondary" className="h-9 px-4 text-sm">
                  Subir foto de perfil
                </Button>
              </Label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Tu nombre completo"
              value={form.fullName}
              onChange={handleChange("fullName")}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              value={initialData.email}
              disabled
              className="bg-muted"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Guardando..." : "Continuar"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}