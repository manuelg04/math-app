"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import Image from "next/image";

type ExamQuestionProps = {
  questionNumber: number;
  totalQuestions: number;
  prompt: string;
};

function sanitizePrompt(input: string): string {
  if (!input) return input;
  // Elimina líneas o segmentos tipo [Imagen: ...] o [Image: ...]
  // - case-insensitive
  // - en cualquier parte (líneas completas o al final del texto)
  const removeImageMeta = input.replace(/\[(imagen|image):[^\]]*\]/gi, "");
  // Limpia espacios en exceso que puedan quedar
  return removeImageMeta.trim();
}

export function ExamQuestion({ questionNumber, totalQuestions, prompt }: ExamQuestionProps) {
  const cleanedPrompt = React.useMemo(() => sanitizePrompt(prompt), [prompt]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Pregunta {questionNumber} de {totalQuestions}
        </h2>
      </div>

      <div className="prose prose-sm max-w-none rounded-lg border border-border bg-white p-6 text-foreground">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            img: ({ src, alt }) => {
              if (!src || typeof src !== "string") return null;
              return (
                <Image
                  src={src}
                  alt={alt || "Imagen de la pregunta"}
                  className="my-4 mx-auto block max-w-full rounded-lg"
                  width={1024}
                  height={768}
                />
              );
            },
            table: ({ children }) => (
              <div className="my-4 overflow-x-auto">
                <table className="min-w-full border border-gray-300">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
            tbody: ({ children }) => <tbody>{children}</tbody>,
            th: ({ children }) => (
              <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-gray-300 px-4 py-2 text-sm align-top">{children}</td>
            ),
            p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          }}
        >
          {cleanedPrompt}
        </ReactMarkdown>
      </div>
    </div>
  );
}
