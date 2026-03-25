"use client";

import { useState } from "react";

const faqs = [
  {
    q: "What exactly does my assistant do?",
    a: "It handles real tasks — checking your email, managing your calendar, researching topics, posting to social media, and more. It's not just a chatbot that answers questions, it actually does things for you.",
  },
  {
    q: "Do I need any technical skills?",
    a: "Absolutely not. If you can send a text message, you can use ShiftWorker. Just chat with your assistant like you'd chat with a friend.",
  },
  {
    q: "How do I talk to my assistant?",
    a: "Through the messaging app you already use — WhatsApp, Telegram, or others. No new app to download.",
  },
  {
    q: "Is my data safe?",
    a: "Your assistant runs on its own private Azure VM. Nobody else can access it, and we never sell your data.",
  },
  {
    q: "What happens on the free plan?",
    a: "You get 8 hours a day with your assistant and 100 messages. Your Azure VM hosting starts at ~$4/mo (billed by Azure). Perfect for trying it out. Upgrade anytime for 24/7 access and managed maintenance.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No contracts, no commitments. Cancel from your dashboard in one click.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
      <h2 className="text-center text-3xl font-bold sm:text-4xl mb-12">
        Frequently Asked Questions
      </h2>
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden"
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between px-6 py-4 text-left font-medium hover:text-violet-300 transition"
            >
              <span>{faq.q}</span>
              <span className="ml-4 text-slate-500 text-xl shrink-0">
                {open === i ? "−" : "+"}
              </span>
            </button>
            {open === i && (
              <div className="px-6 pb-4 text-slate-400 leading-relaxed">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
