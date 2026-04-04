import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | ShiftWorker',
  description: 'How ShiftWorker collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
          ← Back to home
        </Link>

        <div className="mt-8 prose prose-invert prose-slate max-w-none">
          <p className="text-sm text-slate-500">Last updated: April 2026</p>
          <h1>Privacy Policy</h1>

          <p>
            This Privacy Policy explains how ShiftWorker (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, and
            protects your information when you use our service at shiftworker.ai.
          </p>

          <h2>What We Collect</h2>
          <p>When you create an account, we collect:</p>
          <ul>
            <li><strong>Account information:</strong> Your name and email address (from Google or GitHub OAuth sign-in)</li>
            <li><strong>Preferences:</strong> Timezone, usage preferences, and settings you configure</li>
            <li><strong>Cloud provider tokens:</strong> OAuth tokens from your cloud provider (e.g., Azure, DigitalOcean) to manage VMs on your behalf. These are encrypted and stored only as long as needed.</li>
            <li><strong>Payment information:</strong> Processed by Stripe — we do not store your card details directly</li>
          </ul>

          <h2>What We Don&apos;t Collect</h2>
          <p>
            Your AI assistant runs on your own cloud infrastructure. <strong>We do not read, store, or have
            access to the content of your AI conversations.</strong> That data lives on your VM and is entirely
            under your control.
          </p>

          <h2>How We Use Your Information</h2>
          <ul>
            <li>To provide and maintain the ShiftWorker service</li>
            <li>To provision and manage VMs in your cloud account</li>
            <li>To process payments and manage your subscription</li>
            <li>To send you service-related communications (e.g., billing, downtime)</li>
            <li>To improve and develop our service</li>
          </ul>

          <h2>Cookies</h2>
          <p>
            We use session cookies to keep you signed in. We do not use tracking cookies, advertising cookies,
            or third-party analytics cookies.
          </p>

          <h2>Third-Party Services</h2>
          <p>We use the following third-party services to operate ShiftWorker:</p>
          <ul>
            <li><strong>Stripe</strong> — payment processing</li>
            <li><strong>Supabase</strong> — database and authentication</li>
            <li><strong>Vercel</strong> — web application hosting</li>
            <li><strong>Azure / DigitalOcean</strong> — cloud providers where your AI assistants are deployed (on your account)</li>
          </ul>
          <p>
            Each of these services has their own privacy policy. We recommend reviewing them if you have concerns.
          </p>

          <h2>Data Retention</h2>
          <p>
            We retain your account data for as long as your account is active. When you delete your account,
            we delete your data from our systems. Cloud provider tokens are revoked and deleted when no longer
            needed or upon account deletion.
          </p>
          <p>
            Note: Deleting your ShiftWorker account does not automatically delete VMs or data in your cloud
            provider account. You are responsible for managing your own cloud resources.
          </p>

          <h2>Your Rights (CCPA / GDPR)</h2>
          <p>
            Regardless of where you live, you have the right to:
          </p>
          <ul>
            <li>Request a copy of your personal data</li>
            <li>Request deletion of your personal data</li>
            <li>Request correction of inaccurate data</li>
            <li>Opt out of any marketing communications</li>
          </ul>
          <p>
            To exercise any of these rights, email us at{' '}
            <a href="mailto:hello@shiftworker.ai">hello@shiftworker.ai</a>.
            We will respond within 30 days.
          </p>

          <h2>Data Security</h2>
          <p>
            We use industry-standard security measures to protect your data, including encryption of sensitive
            information like cloud provider tokens. However, no method of transmission over the internet is
            100% secure, and we cannot guarantee absolute security.
          </p>

          <h2>Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We&apos;ll notify you of significant changes
            via email or through the service.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about this Privacy Policy? Email us at{' '}
            <a href="mailto:hello@shiftworker.ai">hello@shiftworker.ai</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
