"use client";
/* eslint-disable @next/next/no-img-element */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

type Option = {
  id: string;
  label: string;
  text: string;
};

type ExamOptionsProps = {
  options: Option[];
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
  disabled?: boolean;
};

export function ExamOptions({ options, selectedOptionId, onSelect, disabled = false }: ExamOptionsProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">Selecciona una opción:</p>
      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          const containsRichContent = /!\[[^\]]*\]\([^)]*\)|<[^>]+>/.test(option.text);
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(option.id)}
              className={cn(
                "w-full rounded-lg border-2 p-4 text-left transition-all",
                "hover:border-primary hover:bg-primary/5",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "border-primary bg-primary/10 font-medium"
                  : "border-border bg-white"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground bg-white"
                  )}
                >
                  {isSelected && (
                    <div className="h-3 w-3 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex-1 text-left text-sm text-foreground">
                  <span className="font-semibold text-primary">{option.label}.</span>
                  {containsRichContent ? (
                    <div className="mt-2 space-y-2">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                          img: ({ src, alt }) =>
                            src ? (
                              <img
                                src={src}
                                alt={alt || "Imagen de la opción"}
                                className="my-2 mx-auto max-h-64 w-auto rounded-md"
                                loading="lazy"
                              />
                            ) : null,
                        }}
                      >
                        {option.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <span className="ml-1 inline">{option.text}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
