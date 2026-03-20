"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-3xl font-bold mt-8 mb-4 text-white">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-2xl font-bold mt-6 mb-3 text-white border-b border-slate-700 pb-2">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xl font-semibold mt-5 mb-2 text-slate-200">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-lg font-semibold mt-4 mb-2 text-slate-300">{children}</h4>
        ),
        p: ({ children }) => (
          <p className="mb-3 text-slate-300 leading-relaxed">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-4 space-y-1 text-slate-300">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-4 space-y-1 text-slate-300">{children}</ol>
        ),
        li: ({ children }) => <li className="ml-2">{children}</li>,
        code: ({ className, children }) => {
          const isBlock = className?.includes("language-");
          return isBlock ? (
            <code className="block bg-slate-800 rounded-lg p-4 text-sm overflow-x-auto mb-4 text-green-300">
              {children}
            </code>
          ) : (
            <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-violet-300">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <pre className="mb-4">{children}</pre>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-violet-500 pl-4 italic text-slate-400 mb-4">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse border border-slate-700 text-sm">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-slate-700 bg-slate-800 px-3 py-2 text-left font-semibold text-slate-200">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border border-slate-700 px-3 py-2 text-slate-300">{children}</td>
        ),
        a: ({ href, children }) => (
          <a href={href} className="text-violet-400 hover:text-violet-300 underline">{children}</a>
        ),
        hr: () => <hr className="border-slate-700 my-6" />,
        strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
