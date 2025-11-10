"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Button } from "@/components/ui/button";

type AidKey = "AID1" | "AID2" | "AI_ASSIST";

type AiAidProps = {
  available: boolean;
  disabledReason: string | null;
  loading: boolean;
  hint: string | null;
  error: string | null;
};

type Props = {
  questionId: string;
  help1Md?: string | null;
  help2Md?: string | null;
  onToggleAid: (key: AidKey) => void;
  isAidVisible: (qId: string, key: AidKey) => boolean;
  aiAid?: AiAidProps;
};

/**
 * Normaliza delimitadores LaTeX:
 *  - \[ ... \]  -> $$ ... $$
 *  - \( ... \)  -> $ ... $
 * Soporta bloques multilínea.
 */
function normalizeMathDelimiters(md: string): string {
  if (!md) return md;

  // Bloques: \[ ... \]  (multilínea)
  const blocksNormalized = md.replace(/\\\[((?:.|\n)*?)\\\]/g, (_m, inner) => {
    return `\n\n$$\n${inner}\n$$\n\n`;
  });

  // Inline: \( ... \)
  const inlineNormalized = blocksNormalized.replace(/\\\((.+?)\\\)/g, (_m, inner) => {
    return `$${inner}$`;
  });

  return inlineNormalized;
}

function RenderHelp({ text }: { text: string }) {
  const content = React.useMemo(() => normalizeMathDelimiters(text), [text]);

  return (
    <div className="prose prose-sm max-w-none rounded-md border border-border p-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h2: ({ children }) => (
            <h2 className="mt-4 border-b border-border pb-1 text-base font-semibold text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 text-sm font-semibold text-foreground">{children}</h3>
          ),
          ul: ({ children }) => <ul className="list-disc pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="min-w-full border border-gray-300">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
          th: ({ children }) => (
            <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 px-3 py-2 text-xs align-top">{children}</td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/40 bg-primary/5 px-3 py-2 italic">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function ExamHelps({ questionId, help1Md, help2Md, onToggleAid, isAidVisible, aiAid }: Props) {
  const show1 = !!help1Md && isAidVisible(questionId, "AID1");
  const show2 = !!help2Md && isAidVisible(questionId, "AID2");
  const aiVisible = !!aiAid?.hint && isAidVisible(questionId, "AI_ASSIST");

  return (
    <div className="space-y-3 rounded-lg border border-border bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Ayudas (opcionales)</h3>
      </div>

      {help1Md && (
        <div className="space-y-2">
          <Button variant="secondary" onClick={() => onToggleAid("AID1")}>
            {show1 ? "Ocultar Ayuda 1" : "Ver Ayuda 1"}
          </Button>
          {show1 && <RenderHelp text={help1Md} />}
        </div>
      )}

      {help2Md && (
        <div className="space-y-2">
          <Button variant="secondary" onClick={() => onToggleAid("AID2")}>
            {show2 ? "Ocultar Ayuda 2" : "Ver Ayuda 2"}
          </Button>
          {show2 && <RenderHelp text={help2Md} />}
        </div>
      )}

      {aiAid && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Ayuda IA</p>
            {!aiAid.available && aiAid.disabledReason && (
              <span className="text-xs text-muted-foreground">{aiAid.disabledReason}</span>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => onToggleAid("AI_ASSIST")}
            disabled={!aiAid.available || aiAid.loading}
            title={!aiAid.available ? aiAid.disabledReason ?? undefined : undefined}
          >
            {aiAid.loading
              ? "Generando ayuda..."
              : aiVisible
                ? "Ocultar Ayuda IA"
                : "Pedir Ayuda IA"}
          </Button>
          {aiAid.error && !aiAid.loading && (
            <p className="text-xs text-destructive">{aiAid.error}</p>
          )}
          {aiVisible && aiAid.hint && <RenderHelp text={aiAid.hint} />}
        </div>
      )}
    </div>
  );
}
