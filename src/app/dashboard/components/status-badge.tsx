"use client";

const statusStyles: Record<string, string> = {
  PENDIENTE: "bg-blue-100 text-blue-700",
  "EN CURSO": "bg-amber-100 text-amber-800",
  COMPLETADO: "bg-emerald-100 text-emerald-700",
  BLOQUEADO: "bg-slate-100 text-slate-600",
  DISPONIBLE: "bg-green-100 text-green-700",
  "SALIDA DESBLOQUEADA": "bg-emerald-100 text-emerald-700",
  PROGRESO: "bg-blue-100 text-blue-700",
};

export function StatusBadge({ label }: { label: string }) {
  const className = statusStyles[label.toUpperCase()] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}
