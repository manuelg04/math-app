"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info";

export type ToastOptions = {
  title?: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
};

export type ToastItem = ToastOptions & {
  id: string;
};

type ToastContextValue = {
  toast: (options: ToastOptions) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4000;

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((items) => items.filter((toast) => toast.id !== id));
  }, []);

  const addToast = React.useCallback(
    ({ title, description, variant = "info", duration = DEFAULT_DURATION }: ToastOptions) => {
      const id = createId();
      setToasts((items) => [...items, { id, title, description, variant, duration }]);
      setTimeout(() => removeToast(id), duration);
    },
    [removeToast],
  );

  const contextValue = React.useMemo(() => ({ toast: addToast }), [addToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return context;
}

type ToastCardProps = {
  toast: ToastItem;
  onClose: () => void;
};

function ToastCard({ toast, onClose }: ToastCardProps) {
  const { title, description, variant } = toast;
  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className={cn(
        "pointer-events-auto rounded-xl border border-border bg-card p-4 shadow-lg backdrop-blur",
        variant === "success" && "border-transparent bg-primary text-primary-foreground",
        variant === "error" && "border-transparent bg-destructive text-white",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {title ? <p className="text-sm font-semibold">{title}</p> : null}
          <p className="text-sm leading-5">{description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-transparent p-1 text-sm font-semibold text-foreground/70 transition hover:text-foreground"
        >
          ×
        </button>
      </div>
    </div>
  );
}
