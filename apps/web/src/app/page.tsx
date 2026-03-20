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
          <a href="#what-it-does" className="hover:text-white transition">
            Features
          </a>
          <a href="#pricing" className="hover:text-white transition">
            Pricing
          </a>
          <a
            href="#get-started"
            className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition"
          >
            Get Started Free
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-16 text-center">
        <div className="inline-block rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 text-sm text-violet-300 mb-8">
          Your own AI assistant — set up in 10 minutes
        </div>
        <h1 className="text-5xl font-bold leading-tight sm:text-6xl lg:text-7xl">
          Like having a personal
          <br />
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            employee for $4/month
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 leading-relaxed">
          An AI assistant that actually <em>does things</em> — reads your email,
          manages your calendar, browses the web, researches for you, and runs
          24/7. Text it on WhatsApp. It handles the rest.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#get-started"
            className="rounded-full bg-violet-600 px-8 py-3 text-lg font-medium hover:bg-violet-500 transition"
          >
            Get Your Assistant Free →
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
          <span className="text-lg font-semibold">OpenClaw</span>
          <span className="text-slate-700">•</span>
          <span className="text-lg font-semibold">Claude / GPT</span>
          <span className="text-slate-700">•</span>
          <span className="text-lg font-semibold">Your Computer</span>
        </div>
      </section>

      {/* What It Does */}
      <section id="what-it-does" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold sm:text-4xl mb-4">
          Not a chatbot. An assistant that <em>acts</em>.
        </h2>
        <p className="text-center text-slate-400 max-w-2xl mx-auto mb-16">
          Most AI tools just answer questions. Your Claw4All assistant can see your
          screen, use your apps, and take action on your behalf.
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
              desc: "Researches topics, fills out forms, compares prices, books reservations — all from a chat message.",
            },
            {
              emoji: "💬",
              title: "Lives in Your Chat",
              desc: "Talk to it on WhatsApp, Telegram, Signal, Slack, or Discord. Like texting a really smart friend.",
            },
            {
              emoji: "🏠",
              title: "Controls Smart Home",
              desc: "Turn off the lights, check cameras, adjust the thermostat — all through your assistant.",
            },
            {
              emoji: "🔒",
              title: "Your Data Stays Yours",
              desc: "Everything runs on YOUR computer. We never see your data, your messages, or your files. Ever.",
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
          Set up in 10 minutes. No coding required.
        </h2>
        <div className="space-y-12">
          {[
            {
              step: "1",
              title: "Run the installer",
              desc: "Download and run our one-click installer for Mac, Windows, or Linux. It handles everything automatically.",
              detail: "Or use a $4/month cloud server if you want it running 24/7 even when your computer sleeps.",
            },
            {
              step: "2",
              title: "Connect your AI brain",
              desc: "Paste an API key from Anthropic or OpenAI. We walk you through getting one — takes 2 minutes.",
              detail: "This is what powers the intelligence. Costs about $5-20/month depending on how much you use it.",
            },
            {
              step: "3",
              title: "Connect your messaging",
              desc: "Scan a QR code to link WhatsApp, or set up Telegram with a few clicks. Your assistant is now in your pocket.",
              detail: "You can also connect Slack, Discord, Signal, or email.",
            },
            {
              step: "4",
              title: "Start talking",
              desc: 'Text your assistant like a person. "Check my email." "What\'s on my calendar tomorrow?" "Research flights to Phoenix."',
              detail: "It gets smarter over time as it learns your preferences and routines.",
            },
          ].map((s) => (
            <div key={s.step} className="flex gap-6">
              <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-violet-600 text-xl font-bold">
                {s.step}
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">{s.title}</h3>
                <p className="text-slate-300 leading-relaxed">{s.desc}</p>
                <p className="text-sm text-slate-500 mt-1">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What You Need */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 sm:p-12">
          <h2 className="text-2xl font-bold mb-8 text-center">The honest breakdown</h2>
          <div className="grid sm:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-4">✅ What you need</h3>
              <ul className="space-y-3 text-slate-300">
                <li>• A computer that stays on — or a $4/mo cloud server</li>
                <li>• An AI API key (~$5-20/mo for usage)</li>
                <li>• 10 minutes to follow our setup guide</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-violet-400 mb-4">🚫 What you DON&apos;T need</h3>
              <ul className="space-y-3 text-slate-300">
                <li>• Any coding knowledge</li>
                <li>• IT experience</li>
                <li>• To ever open a terminal</li>
                <li>• To trust us with your data</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-800 text-center">
            <p className="text-slate-400">
              <strong className="text-white">Total cost:</strong>{" "}
              ~$9-24/month (cloud server + AI usage). Less than a Netflix subscription
              for a personal assistant that actually works.
            </p>
          </div>
        </div>
      </section>

      {/* Self-Managing */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl mb-4">
          &ldquo;But what if something breaks?&rdquo;
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto mb-12">
          Your assistant manages itself. It monitors its own health, restarts if it
          crashes, and tells you in plain English if something needs your attention.
        </p>
        <div className="max-w-md mx-auto text-left space-y-4">
          <div className="rounded-xl bg-slate-800 p-4">
            <p className="text-sm text-slate-400 mb-1">You</p>
            <p className="text-white">Are you working?</p>
          </div>
          <div className="rounded-xl bg-violet-900/30 border border-violet-800/50 p-4">
            <p className="text-sm text-violet-400 mb-1">Your Assistant</p>
            <p className="text-white">
              Yep! I&apos;ve been up for 3 days. Checked your email 20 minutes ago —
              nothing urgent. Your next meeting is at 2pm.
            </p>
          </div>
          <div className="rounded-xl bg-slate-800 p-4">
            <p className="text-sm text-slate-400 mb-1">You</p>
            <p className="text-white">Something seems off with my WhatsApp</p>
          </div>
          <div className="rounded-xl bg-violet-900/30 border border-violet-800/50 p-4">
            <p className="text-sm text-violet-400 mb-1">Your Assistant</p>
            <p className="text-white">
              I noticed my WhatsApp connection dropped an hour ago. Can you open
              WhatsApp on your phone and scan this QR code to reconnect me? 📱
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold sm:text-4xl mb-4">
          Free to start. Upgrade when you want.
        </h2>
        <p className="text-center text-slate-400 mb-16">
          The setup wizard and core features are free forever. Premium is for people who
          want white-glove support.
        </p>
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            {
              name: "Free",
              price: "$0",
              period: "forever",
              desc: "Everything you need to get started",
              features: [
                "Guided setup wizard",
                "Self-healing agent",
                "WhatsApp/Telegram/Signal",
                "Community forum support",
                "Basic skill library",
                "Server health dashboard",
              ],
              cta: "Get Started",
              highlight: false,
            },
            {
              name: "Supported",
              price: "$10",
              period: "/month",
              desc: "For when you want backup",
              features: [
                "Everything in Free",
                "Email support (24h response)",
                "Premium skill packs",
                "Automatic updates",
                "Advanced monitoring",
                "Backup & restore",
              ],
              cta: "Coming Soon",
              highlight: true,
            },
            {
              name: "VIP",
              price: "$25",
              period: "/month",
              desc: "White-glove treatment",
              features: [
                "Everything in Supported",
                "Priority support (4h response)",
                "Custom integrations",
                "1-on-1 setup call",
                "Custom skills built for you",
                "We fix it if it breaks",
              ],
              cta: "Coming Soon",
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
        <p className="text-center text-sm text-slate-500 mt-8">
          * You&apos;ll also pay for your own hosting (~$4/mo) and AI API usage (~$5-20/mo) separately.
          We never touch that money — it goes directly to the providers.
        </p>
      </section>

      {/* CTA */}
      <section id="get-started" className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl mb-4">
          Ready to meet your assistant?
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto mb-8">
          Join the waitlist and be first to set up your own AI assistant when we launch.
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
            <span className="text-2xl">🐾</span>
            <span className="font-bold">Claw4All</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-400">
            <a href="/spec" className="hover:text-white transition">Spec</a>
            <a href="https://github.com/jemustain/openclaw-saas" className="hover:text-white transition">GitHub</a>
            <a href="https://discord.com/invite/clawd" className="hover:text-white transition">Community</a>
          </div>
          <p className="text-sm text-slate-500">
            Built with ❤️ on OpenClaw
          </p>
        </div>
      </footer>
    </div>
  );
}
