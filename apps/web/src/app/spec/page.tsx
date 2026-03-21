import { Markdown } from "./markdown";

import constitutionRaw from "../../data/constitution.md";
import specRaw from "../../data/spec.md";
import planRaw from "../../data/plan.md";
import tasksRaw from "../../data/tasks.md";

function MarkdownSection({ title, content }: { title: string; content: string }) {
  return (
    <details className="group border border-slate-700 rounded-2xl bg-slate-900/50 overflow-hidden" open>
      <summary className="cursor-pointer px-8 py-5 text-xl font-bold hover:bg-slate-800/50 transition flex items-center justify-between">
        {title}
        <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div className="px-8 pb-8 pt-2">
        <Markdown content={content} />
      </div>
    </details>
  );
}

export default function SpecPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <a href="/" className="flex items-center gap-2 text-xl font-bold">
          <span className="text-3xl"></span>
          <span>HandsOff</span>
        </a>
        <div className="flex items-center gap-6 text-sm text-slate-300">
          <a href="/" className="hover:text-white transition">Home</a>
          <a href="/spec" className="text-white font-medium">Spec</a>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-6 pt-16 pb-12 text-center">
        <h1 className="text-4xl font-bold sm:text-5xl">Project Spec &amp; Plan</h1>
        <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
          The full specification for HandsOff — constitution, requirements, architecture, and task breakdown.
          Built with{" "}
          <a href="https://github.com/github/spec-kit" className="text-violet-400 hover:text-violet-300 underline">
            GitHub Spec Kit
          </a>.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24 space-y-6">
        <MarkdownSection title="📜 Constitution" content={constitutionRaw} />
        <MarkdownSection title="📋 Specification" content={specRaw} />
        <MarkdownSection title="🏗️ Implementation Plan" content={planRaw} />
        <MarkdownSection title="✅ Tasks" content={tasksRaw} />
      </section>

      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        <p>HandsOff — OpenClaw for Everyone</p>
      </footer>
    </div>
  );
}
