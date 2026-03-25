import { FAQ } from "@/components/faq";
import { WaitlistForm } from "@/components/waitlist-form";

function FeatureIcon({ d }: { d: string }) {
  return (
    <svg
      className="w-6 h-6 text-violet-400 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const capabilities = [
  {
    title: "Email triage",
    desc: "Reads your inbox, surfaces what matters, drafts replies.",
    icon: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75",
  },
  {
    title: "Calendar management",
    desc: "Books meetings, resolves conflicts, sends reminders.",
    icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
  },
  {
    title: "Web research",
    desc: "Searches, reads pages, and summarizes findings.",
    icon: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418",
  },
  {
    title: "Social media",
    desc: "Drafts posts, schedules content, monitors mentions.",
    icon: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z",
  },
  {
    title: "Reminders and tasks",
    desc: "Tracks to-dos and follows up until things are done.",
    icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    title: "Documents and writing",
    desc: "Writes, edits, and organizes files on your behalf.",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center gap-2 text-lg sm:text-xl font-bold shrink-0">
          <span>ShiftWorker</span>
        </div>
        <div className="hidden sm:flex items-center gap-6 text-sm text-slate-300">
          <a href="#how-it-works" className="hover:text-white transition">
            How it Works
          </a>
          <a href="#features" className="hover:text-white transition">
            Features
          </a>
          <a href="#pricing" className="hover:text-white transition">
            Pricing
          </a>
          <a href="#faq" className="hover:text-white transition">
            FAQ
          </a>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/auth/signin"
            className="text-xs sm:text-sm text-slate-300 hover:text-white transition"
          >
            Sign In
          </a>
          <a
            href="#get-started"
            className="rounded-full bg-violet-600 px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-violet-500 transition"
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-16 text-center">
        <div className="inline-block rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 text-sm text-violet-300 mb-8">
          Your own private AI server. We handle everything.
        </div>
        <h1 className="text-5xl font-bold leading-tight sm:text-6xl lg:text-7xl">
          A personal AI assistant
          <br />
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            that runs on your own machine
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 leading-relaxed">
          ShiftWorker connects to your cloud account, spins up a private VM,
          installs everything, and hands you a fully configured AI assistant.
          No Docker, no SSH, no config files. You own the server — we just set it up.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#get-started"
            className="rounded-full bg-violet-600 px-8 py-3 text-lg font-medium hover:bg-violet-500 transition"
          >
            Launch My Assistant
          </a>
          <a
            href="#how-it-works"
            className="rounded-full border border-slate-600 px-8 py-3 text-lg font-medium text-slate-300 hover:border-slate-400 hover:text-white transition"
          >
            See How it Works
          </a>
        </div>
      </section>

      {/* Value prop — why this exists */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            {
              title: "You own everything",
              desc: "Your server, your AI keys, your data. We configure it — you control it.",
            },
            {
              title: "We handle the hard part",
              desc: "VM provisioning, OpenClaw install, messaging setup — done in minutes, not hours.",
            },
            {
              title: "Talk through your apps",
              desc: "Connect WhatsApp or Telegram. Your assistant lives where you already chat.",
            },
          ].map((v) => (
            <div key={v.title} className="text-center">
              <h3 className="text-lg font-semibold mb-2">{v.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section id="features" className="mx-auto max-w-5xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold sm:text-4xl mb-4">
          What your assistant can do
        </h2>
        <p className="text-center text-slate-400 max-w-2xl mx-auto mb-16">
          Not a chatbot. An agent that takes real action on your behalf.
        </p>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((c) => (
            <div
              key={c.title}
              className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-slate-700 transition"
            >
              <FeatureIcon d={c.icon} />
              <div>
                <h3 className="font-medium mb-1">{c.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="mx-auto max-w-4xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold sm:text-4xl mb-16">
          Three steps. A few minutes. Done.
        </h2>
        <div className="space-y-12">
          {[
            {
              step: "1",
              title: "Create your account",
              desc: "Sign up with email or Google. Pick a plan and you're in.",
            },
            {
              step: "2",
              title: "We spin up your VM",
              desc: "ShiftWorker provisions a private server, installs OpenClaw, and configures everything automatically. You don't touch a terminal.",
            },
            {
              step: "3",
              title: "Connect and start talking",
              desc: "Link WhatsApp or Telegram with a QR code. Your assistant is ready — just text it like you would a friend.",
            },
          ].map((s) => (
            <div key={s.step} className="flex gap-6">
              <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-violet-600 text-xl font-bold">
                {s.step}
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">{s.title}</h3>
                <p className="text-slate-300 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Chat Demo */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl mb-4">
          It just works.
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto mb-12">
          Your assistant handles the details so you don&apos;t have to.
        </p>
        <div className="max-w-md mx-auto text-left space-y-4">
          <div className="rounded-xl bg-slate-800 p-4">
            <p className="text-sm text-slate-400 mb-1">You</p>
            <p className="text-white">Did I get any important emails today?</p>
          </div>
          <div className="rounded-xl bg-violet-900/30 border border-violet-800/50 p-4">
            <p className="text-sm text-violet-400 mb-1">Your Assistant</p>
            <p className="text-white">
              You got 12 emails today. Three worth your attention: a meeting request from Sarah for Thursday,
              an invoice from Adobe that&apos;s due next week, and a reply from the contractor about the kitchen quote.
              Want me to draft replies for any of them?
            </p>
          </div>
          <div className="rounded-xl bg-slate-800 p-4">
            <p className="text-sm text-slate-400 mb-1">You</p>
            <p className="text-white">Accept Sarah&apos;s meeting and ask the contractor if he can start Monday</p>
          </div>
          <div className="rounded-xl bg-violet-900/30 border border-violet-800/50 p-4">
            <p className="text-sm text-violet-400 mb-1">Your Assistant</p>
            <p className="text-white">
              Done. Accepted Sarah&apos;s invite for Thursday at 2pm — it&apos;s on your calendar. Sent the contractor
              a reply asking about Monday availability. I&apos;ll let you know when he responds.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold sm:text-4xl mb-4">
          Free to configure. Seriously.
        </h2>
        <p className="text-center text-slate-400 max-w-2xl mx-auto mb-16">
          ShiftWorker sets up your AI assistant at no cost. You get $200 in
          hosting credit to start — that covers up to 4 years of server time.
          AI is free too, powered by Google Gemini.
        </p>
        <div className="grid gap-8 sm:grid-cols-2 max-w-3xl mx-auto">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
            <h3 className="text-lg font-semibold">Free</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-slate-400">to configure</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              We handle everything. You just need a Google account.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Full setup and configuration",
                "Your own private server",
                "$200 hosting credit (~4 years free)",
                "AI included via Google Gemini",
                "WhatsApp + Telegram integration",
                "All skills unlocked",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-violet-400 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="#get-started"
              className="mt-8 block w-full rounded-full py-2.5 text-sm font-medium text-center border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white transition"
            >
              Get Started Free
            </a>
          </div>
          <div className="rounded-2xl border-2 border-violet-500 bg-violet-500/5 p-8">
            <h3 className="text-lg font-semibold">Pro</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold">$12</span>
              <span className="text-slate-400">/month</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">Managed hosting and priority support.</p>
            <ul className="mt-6 space-y-3">
              {[
                "Everything in Free",
                "Managed updates and maintenance",
                "Automated backups",
                "Priority support",
                "Advanced monitoring",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-violet-400 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="#get-started"
              className="mt-8 block w-full rounded-full py-2.5 text-sm font-medium text-center bg-violet-600 hover:bg-violet-500 text-white transition"
            >
              Go Pro
            </a>
          </div>
        </div>
        <p className="mt-8 text-center text-sm text-slate-500 max-w-2xl mx-auto">
          Free tier runs on Oracle Cloud&apos;s Always Free ARM servers — no hosting cost,
          no credit card required. Pro tier runs on DigitalOcean for managed hosting.
          AI is powered by Google Gemini Flash — free with your Google account.
          {' '}
          <a
            href="https://cloud.digitalocean.com/account-referrals?i=091ab6c0-097d-4111-baab-ee4872bd796d"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:text-violet-300 underline underline-offset-2"
          >
            Pro users: sign up for DigitalOcean and get $200 in free credits
          </a>.
        </p>
      </section>

      {/* FAQ */}
      <FAQ />

      {/* CTA */}
      <section id="get-started" className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl mb-4">
          Ready to meet your assistant?
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto mb-8">
          Join the waitlist and be first in line when we launch.
        </p>
        <WaitlistForm />
        <p className="text-xs text-slate-600 mt-3">No spam. We&apos;ll email you once when it&apos;s ready.</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold">ShiftWorker</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-400">
          </div>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} ShiftWorker
          </p>
        </div>
      </footer>
    </div>
  );
}
