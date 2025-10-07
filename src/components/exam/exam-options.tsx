"use client";
/* eslint-disable @next/next/no-img-element */

import * as React from "react";
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

// Detecta si el texto contiene una tabla GFM (líneas con | y separadores ---)
function containsMarkdownTable(text: string): boolean {
  if (!text) return false;
  // Header con pipes y una línea siguiente con separadores |---|
  const tablePattern = /(^|\n)\s*\|.+\|\s*(\n\|[ :\-|]+)+/m;
  return tablePattern.test(text);
}

function containsMarkdownImage(text: string): boolean {
  return /!\[[^\]]*\]\([^)]*\)/.test(text);
}

function containsHtml(text: string): boolean {
  return /<[^>]+>/.test(text);
}

export function ExamOptions({
  options,
  selectedOptionId,
  onSelect,
  disabled = false,
}: ExamOptionsProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">Selecciona una opción:</p>

      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = selectedOptionId === option.id;

          const isTable = containsMarkdownTable(option.text);
          const isRich = isTable || containsMarkdownImage(option.text) || containsHtml(option.text);

          const handleActivate = () => {
            if (!disabled) onSelect(option.id);
          };

          const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
            if (disabled) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(option.id);
            }
          };

          return (
            <div
              key={option.id}
              role="button"
              aria-pressed={isSelected}
              aria-disabled={disabled}
              tabIndex={disabled ? -1 : 0}
              onClick={handleActivate}
              onKeyDown={handleKeyDown}
              className={cn(
                "w-full rounded-lg border-2 p-4 text-left transition-all",
                "hover:border-primary hover:bg-primary/5",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                disabled && "cursor-not-allowed opacity-50 pointer-events-none",
                isSelected ? "border-primary bg-primary/10 font-medium" : "border-border bg-white"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground bg-white"
                  )}
                >
                  {isSelected && <div className="h-3 w-3 rounded-full bg-white" />}
                </div>

                <div className="flex-1 text-left text-sm text-foreground">
                  <span className="font-semibold text-primary">{option.label}.</span>

                  {/* Contenido de la opción */}
                  {isRich ? (
                    <div className={cn("mt-2", isTable && "overflow-x-auto")}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // Párrafos estándar como bloques cuando hay contenido rico
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
                          table: ({ children }) => (
                            <table className="min-w-full border border-gray-300 text-sm">{children}</table>
                          ),
                          thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
                          tbody: ({ children }) => <tbody>{children}</tbody>,
                          th: ({ children }) => (
                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="border border-gray-300 px-3 py-2 align-top">{children}</td>
                          ),
                        }}
                      >
                        {option.text?.trim() ?? ""}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    // Para texto simple, renderizamos Markdown en línea (p => span)
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <span className="ml-1 inline leading-relaxed">{children}</span>,
                        strong: ({ children }) => <strong className="ml-1 inline font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="ml-1 inline italic">{children}</em>,
                        a: ({ href, children }) => (
                          <a href={href} className="ml-1 inline underline" onClick={(e) => e.stopPropagation()}>
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {option.text?.trim() ?? ""}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}