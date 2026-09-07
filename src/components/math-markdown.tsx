"use client";
import Image from "next/image";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
export default function MathMarkdown({ children }: { children: string }) {
  return (
    <div className="math-content">
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false, trust: false }]]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <Image
              src={typeof src === "string" ? src : ""}
              alt={alt || "Figura del ejercicio"}
              width={900}
              height={600}
              unoptimized
            />
          ),
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
