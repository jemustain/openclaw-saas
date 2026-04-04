import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | ShiftWorker',
  description: 'ShiftWorker terms of service and conditions of use.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
          ← Back to home
        </Link>

        <div className="mt-8 prose prose-invert prose-slate max-w-none">
          <p className="text-sm text-slate-500">Last updated: April 2026</p>
          <h1>Terms of Service</h1>

          <p>
            These Terms of Service (&quot;Terms&quot;) govern your use of ShiftWorker (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;),
            operated at shiftworker.ai. By using our service, you agree to these Terms.
          </p>

          <h2>What ShiftWorker Does</h2>
          <p>
            ShiftWorker deploys personal AI assistants on your own cloud infrastructure. We connect to your
            cloud provider account (e.g., Azure), provision and manage virtual machines on your behalf, and
            configure AI assistant software on those VMs. The AI assistant runs entirely on your infrastructure —
            not ours.
          </p>

          <h2>Your Cloud Provider Account</h2>
          <p>
            To use ShiftWorker, you grant us permission to create, manage, and delete virtual machines in your
            cloud provider subscription (e.g., Azure). You are solely responsible for all costs incurred through
            your cloud provider, including compute, storage, networking, and any other charges. ShiftWorker does
            not pay for or subsidize your cloud infrastructure costs.
          </p>
          <p>
            You should monitor your cloud provider billing and set up spending alerts as appropriate. We are not
            liable for unexpected cloud costs.
          </p>

          <h2>Your Account</h2>
          <p>
            You must provide accurate information when creating an account. You are responsible for maintaining
            the security of your account credentials. You must be at least 18 years old to use ShiftWorker.
          </p>

          <h2>How We Handle Your Data</h2>
          <p>
            We store your account information (email, name, preferences) in our database to provide the service.
            Your cloud provider OAuth tokens are encrypted and stored only as long as needed to manage your VMs.
          </p>
          <p>
            Your AI assistant runs on your own infrastructure. We do not read, store, or have access to the
            content of your AI conversations. That data stays on your VM and is under your control.
          </p>

          <h2>Acceptable Use</h2>
          <p>
            You agree not to use ShiftWorker to violate any laws, infringe on intellectual property rights,
            distribute malware, or engage in any activity that could harm ShiftWorker or other users. We
            reserve the right to suspend or terminate accounts that violate these terms.
          </p>

          <h2>Termination</h2>
          <p>
            We may suspend or terminate your account at any time, with or without cause, with or without notice.
            Upon termination, we will stop managing your cloud resources, but any VMs or resources already
            provisioned in your cloud account will remain until you delete them. You are responsible for cleaning
            up your own cloud resources after termination.
          </p>

          <h2>Disclaimer of Warranties</h2>
          <p>
            ShiftWorker is provided <strong>&quot;as is&quot;</strong> and <strong>&quot;as available&quot;</strong> without
            warranties of any kind, whether express or implied, including but not limited to implied warranties of
            merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee that the
            service will be uninterrupted, error-free, or secure.
          </p>

          <h2>Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, ShiftWorker and its officers, employees, and affiliates shall
            not be liable for any indirect, incidental, special, consequential, or punitive damages, including
            loss of profits, data, or goodwill, arising out of or related to your use of the service. Our total
            liability shall not exceed the amount you paid us in the 12 months preceding the claim.
          </p>

          <h2>Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. We&apos;ll notify you of significant changes via email or
            through the service. Continued use after changes constitutes acceptance.
          </p>

          <h2>Governing Law</h2>
          <p>
            These Terms are governed by the laws of the State of Arizona, USA, without regard to conflict of law
            principles. Any disputes shall be resolved in the courts of Arizona.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about these Terms? Email us at{' '}
            <a href="mailto:hello@shiftworker.ai">hello@shiftworker.ai</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
