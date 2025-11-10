"use client";
/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import Image from "next/image";

type ExamQuestionProps = {
  questionNumber: number;
  totalQuestions: number;
  prompt: string;
};

function sanitizePrompt(input: string): string {
  if (!input) return input;
  // Solo elimina placeholders tipo [image: ...] o [imagen: ...] si llegaran a existir.
  const removeImageMeta = input.replace(/\[(imagen|image):[^\]]*\]/gi, "");
  return removeImageMeta.trim();
}

function resolvePublicSrc(src: string): string {
  const s = src.trim();
  if (/^https?:\/\//i.test(s)) return s;
  return s.startsWith("/") ? s : `/${s}`;
}

function MarkdownImage(props: { src?: string; alt?: string }) {
  const { src, alt } = props;
  const [useFallback, setUseFallback] = React.useState(false);
  const imageStyle: React.CSSProperties = {
    width: "auto",
    height: "auto",
    maxWidth: "min(100%, 640px)",
    maxHeight: "70vh",
  };

  if (!src || typeof src !== "string") return null;

  const resolved = resolvePublicSrc(src);

  if (useFallback) {
    return (
      <img
        src={resolved}
        alt={alt || "Imagen de la pregunta"}
        className="my-4 mx-auto block rounded-lg"
        style={imageStyle}
        loading="lazy"
      />
    );
  }

  return (
    <Image
      src={resolved}
      alt={alt || "Imagen de la pregunta"}
      className="my-4 mx-auto block rounded-lg"
      width={800}
      height={600}
      sizes="(min-width: 1024px) 600px, (min-width: 640px) 80vw, 95vw"
      // Clave: evitar el optimizer para rutas que pueden colisionar con /exams/[slug]
      unoptimized
      style={imageStyle}
      onError={() => setUseFallback(true)}
      priority={false}
    />
  );
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
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeRaw, rehypeKatex]}
          components={{
            img: ({ src, alt }) => <MarkdownImage src={typeof src === "string" ? src : ""} alt={alt} />,
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
