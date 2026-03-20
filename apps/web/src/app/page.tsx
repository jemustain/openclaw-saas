export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-xl font-bold">
          <span className="text-3xl">🐾</span>
          <span>Claw4All</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-300">
          <a href="#how-it-works" className="hover:text-white transition">
            How it Works
          </a>
          <a href="/spec" className="hover:text-white transition">
            Spec
          </a>
          <a href="#features" className="hover:text-white transition">
            Features
          </a>
          <a href="#pricing" className="hover:text-white transition">
            Pricing
          </a>
          <a
            href="/signup"
            className="rounded-full bg-violet-600 px-5 py-2 font-medium text-white hover:bg-violet-500 transition"
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-32 text-center">
        <div className="mb-6 inline-block rounded-full bg-violet-500/10 px-4 py-1.5 text-sm text-violet-400 ring-1 ring-violet-500/20">
          ✨ Now in early access
        </div>
        <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-7xl">
          Your personal AI assistant,{" "}
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            set up in minutes
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 leading-relaxed">
          OpenClaw gives you a private AI assistant that manages your email,
          calendar, and messages — running on your own server. No coding, no
          config files, no terminal. Just sign up and start chatting.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <a
            href="/signup"
            className="rounded-full bg-violet-600 px-8 py-3.5 text-lg font-semibold hover:bg-violet-500 transition shadow-lg shadow-violet-500/25"
          >
            Start Free Trial →
          </a>
          <a
            href="#how-it-works"
            className="rounded-full border border-slate-700 px-8 py-3.5 text-lg font-semibold text-slate-300 hover:border-slate-500 hover:text-white transition"
          >
            See How It Works
          </a>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          7-day free trial · No credit card required
        </p>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">
          Three steps. Five minutes. Done.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-slate-400">
          No technical skills needed. We handle the servers, security, and
          updates.
        </p>
        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {[
            {
              step: "1",
              emoji: "👤",
              title: "Create your account",
              desc: "Sign up with Google or email. Takes 30 seconds.",
            },
            {
              step: "2",
              emoji: "🔗",
              title: "Connect your apps",
              desc: "Follow our guided wizards to link Telegram, Gmail, Calendar, and more.",
            },
            {
              step: "3",
              emoji: "💬",
              title: "Start chatting",
              desc: "Your AI assistant is live. Message it on Telegram anytime, anywhere.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 text-2xl">
                {item.emoji}
              </div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-400">
                Step {item.step}
              </div>
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="mt-2 text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">
          Everything you need, nothing you don&apos;t
        </h2>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              emoji: "🤖",
              title: "Personal AI Assistant",
              desc: "Powered by the best AI models. Remembers your preferences, learns your patterns.",
            },
            {
              emoji: "📧",
              title: "Email Management",
              desc: "Inbox summaries, draft replies, flag important messages. Ask it anything about your email.",
            },
            {
              emoji: "📅",
              title: "Calendar Integration",
              desc: "Check your schedule, create events, get daily briefs. Never miss a meeting.",
            },
            {
              emoji: "🔒",
              title: "Your Own Server",
              desc: "Dedicated VM, not shared. Your data stays private. Daily encrypted backups.",
            },
            {
              emoji: "🎛️",
              title: "Simple Dashboard",
              desc: "Manage integrations, check status, view logs — all from a clean web portal.",
            },
            {
              emoji: "🆘",
              title: "Managed Support",
              desc: "Stuck? Our team can take over your instance and fix things for you.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6"
            >
              <div className="mb-3 text-3xl">{feature.emoji}</div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">
          Simple, transparent pricing
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-slate-400">
          Start free. Upgrade when you&apos;re ready. Cancel anytime.
        </p>
        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {[
            {
              name: "Starter",
              price: "$15",
              desc: "For personal use",
              features: [
                "Telegram bot",
                "Gmail integration",
                "Google Calendar",
                "Dedicated server",
                "Daily backups",
                "Community support",
              ],
              cta: "Start Free Trial",
              highlight: false,
            },
            {
              name: "Pro",
              price: "$35",
              desc: "For power users",
              features: [
                "Everything in Starter",
                "WhatsApp + Discord",
                "Priority support",
                "Custom personality",
                "Advanced automations",
                "API access",
              ],
              cta: "Start Free Trial",
              highlight: true,
            },
            {
              name: "Managed",
              price: "$99",
              desc: "We handle everything",
              features: [
                "Everything in Pro",
                "Dedicated support agent",
                "Instance management",
                "Custom integrations",
                "SLA guarantee",
                "Onboarding call",
              ],
              cta: "Contact Us",
              highlight: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-8 ${
                plan.highlight
                  ? "border-violet-500 bg-violet-500/5 ring-1 ring-violet-500/20"
                  : "border-slate-800 bg-slate-900/50"
              }`}
            >
              {plan.highlight && (
                <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-violet-400">
                  Most Popular
                </div>
              )}
              <h3 className="text-2xl font-bold">{plan.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{plan.desc}</p>
              <div className="mt-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-slate-400">/mo</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-violet-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a
                href="/signup"
                className={`mt-8 block rounded-full py-3 text-center font-semibold transition ${
                  plan.highlight
                    ? "bg-violet-600 text-white hover:bg-violet-500"
                    : "border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Ready to meet your AI assistant?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-slate-400">
          Join the early access. Set up in minutes, no technical skills needed.
        </p>
        <a
          href="/signup"
          className="mt-8 inline-block rounded-full bg-violet-600 px-8 py-3.5 text-lg font-semibold hover:bg-violet-500 transition shadow-lg shadow-violet-500/25"
        >
          Start Free Trial →
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 text-center text-sm text-slate-500">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center justify-center gap-2 text-lg font-bold text-slate-300">
            <span className="text-2xl">🐾</span> Claw4All
          </div>
          <p className="mt-2">
            Your personal AI assistant, running on your own server.
          </p>
          <div className="mt-6 flex justify-center gap-6">
            <a href="#" className="hover:text-slate-300 transition">
              Privacy
            </a>
            <a href="#" className="hover:text-slate-300 transition">
              Terms
            </a>
            <a
              href="https://github.com/openclaw/openclaw"
              className="hover:text-slate-300 transition"
            >
              GitHub
            </a>
            <a
              href="https://discord.com/invite/clawd"
              className="hover:text-slate-300 transition"
            >
              Discord
            </a>
          </div>
          <p className="mt-6">© 2026 OpenClaw. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
