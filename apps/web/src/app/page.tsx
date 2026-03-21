export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center gap-2 text-lg sm:text-xl font-bold shrink-0">
          <span>HandsOff</span>
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
        </div>
        <a
          href="#get-started"
          className="rounded-full bg-violet-600 px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-violet-500 transition shrink-0"
        >
          Get Started
        </a>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-16 text-center">
        <div className="inline-block rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 text-sm text-violet-300 mb-8">
          No setup. No installs. Just chat.
        </div>
        <h1 className="text-5xl font-bold leading-tight sm:text-6xl lg:text-7xl">
          Your own AI assistant
          <br />
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            in 60 seconds
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 leading-relaxed">
          An AI assistant that actually <em>does things</em> — reads your email,
          manages your calendar, browses the web, and runs 24/7.
          Connect WhatsApp or Telegram and start talking.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#get-started"
            className="rounded-full bg-violet-600 px-8 py-3 text-lg font-medium hover:bg-violet-500 transition"
          >
            Launch My Assistant →
          </a>
          <a
            href="#demo"
            className="rounded-full border border-slate-600 px-8 py-3 text-lg font-medium text-slate-300 hover:border-slate-400 hover:text-white transition"
          >
            Watch Demo
          </a>
        </div>
      </section>

      {/* Social proof */}
      <section className="mx-auto max-w-4xl px-6 py-8 text-center">
        <p className="text-sm text-slate-500 uppercase tracking-wider mb-4">Powered by</p>
        <div className="flex items-center justify-center gap-8 text-slate-400">
          <span className="text-lg font-semibold">Claude / GPT</span>
          <span className="text-slate-700">•</span>
          <span className="text-lg font-semibold">WhatsApp & Telegram</span>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold sm:text-4xl mb-4">
          Not a chatbot. An assistant that <em>acts</em>.
        </h2>
        <p className="text-center text-slate-400 max-w-2xl mx-auto mb-16">
          Most AI tools just answer questions. Your HandsOff assistant can use apps,
          browse the web, and take action on your behalf.
        </p>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              emoji: "📧",
              title: "Manages Your Email",
              desc: "Reads your inbox, flags what's important, drafts replies, and summarizes what you missed.",
            },
            {
              emoji: "📅",
              title: "Handles Your Calendar",
              desc: "Schedules meetings, sends reminders, resolves conflicts. Just tell it what you need.",
            },
            {
              emoji: "🌐",
              title: "Browses the Web",
              desc: "Researches topics, compares prices, books reservations — all from a chat message.",
            },
            {
              emoji: "💬",
              title: "Lives in Your Chat App",
              desc: "Talk to it on WhatsApp, Telegram, Signal, Slack, or Discord. Like texting a really smart friend.",
            },
            {
              emoji: "⚡",
              title: "Always On",
              desc: "Your assistant runs 24/7. It checks your email while you sleep and has answers when you wake up.",
            },
            {
              emoji: "🔒",
              title: "Private & Secure",
              desc: "Your assistant runs in its own isolated environment. Your data is never shared with other users.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-slate-700 transition"
            >
              <div className="text-3xl mb-3">{f.emoji}</div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="mx-auto max-w-4xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold sm:text-4xl mb-16">
          Three steps. One minute. Done.
        </h2>
        <div className="space-y-12">
          {[
            {
              step: "1",
              title: "Create your account",
              desc: "Sign up with email or Google. Free — no credit card required.",
            },
            {
              step: "2",
              title: "Connect your chat app",
              desc: "Scan a QR code to link WhatsApp, or connect Telegram with a few taps. Your assistant appears in your messages.",
            },
            {
              step: "3",
              title: "Start talking",
              desc: "\"Check my email.\" \"What's on my calendar tomorrow?\" \"Research flights to Phoenix.\" Just text like you would a friend.",
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
              Done! Accepted Sarah&apos;s invite for Thursday at 2pm — it&apos;s on your calendar. Sent the contractor
              a reply asking about Monday availability. I&apos;ll let you know when he responds. 👍
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold sm:text-4xl mb-4">
          Simple pricing. No surprises.
        </h2>
        <p className="text-center text-slate-400 mb-16">
          Start free. Upgrade when your assistant becomes indispensable.
        </p>
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            {
              name: "Free",
              price: "$0",
              period: "forever",
              desc: "Try it out, no commitment",
              features: [
                "Assistant available 8 hours/day",
                "100 messages per day",
                "Web search & general Q&A",
                "One chat platform",
                "Community support",
              ],
              cta: "Get Started Free",
              highlight: false,
            },
            {
              name: "Starter",
              price: "$12",
              period: "/month",
              desc: "Your full-time assistant",
              features: [
                "24/7 availability",
                "Unlimited messages",
                "Email + calendar integration",
                "Web browsing & research",
                "Multiple chat platforms",
                "Email support",
              ],
              cta: "Start Free Trial",
              highlight: true,
            },
            {
              name: "Pro",
              price: "$25",
              period: "/month",
              desc: "Maximum capability",
              features: [
                "Everything in Starter",
                "Smart home control",
                "Social media management",
                "Custom workflows",
                "Priority support (4h)",
                "API access",
              ],
              cta: "Start Free Trial",
              highlight: false,
            },
          ].map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl p-8 ${
                p.highlight
                  ? "border-2 border-violet-500 bg-violet-500/5"
                  : "border border-slate-800 bg-slate-900/50"
              }`}
            >
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{p.price}</span>
                <span className="text-slate-400">{p.period}</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">{p.desc}</p>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-violet-400 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`mt-8 w-full rounded-full py-2.5 text-sm font-medium transition ${
                  p.highlight
                    ? "bg-violet-600 hover:bg-violet-500 text-white"
                    : "border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="get-started" className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl mb-4">
          Ready to meet your assistant?
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto mb-8">
          Join the waitlist and be first in line when we launch.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <input
            type="email"
            placeholder="your@email.com"
            className="w-full rounded-full border border-slate-700 bg-slate-900 px-6 py-3 text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
          />
          <button className="w-full sm:w-auto rounded-full bg-violet-600 px-8 py-3 font-medium hover:bg-violet-500 transition whitespace-nowrap">
            Join Waitlist
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-3">No spam. We&apos;ll email you once when it&apos;s ready.</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold">HandsOff</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-400">
          </div>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} HandsOff
          </p>
        </div>
      </footer>
    </div>
  );
}
