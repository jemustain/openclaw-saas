import { Resend } from 'resend';

// Lazy init to avoid build crashes when RESEND_API_KEY isn't set
const resend = new Proxy({} as Resend, {
  get(_, prop) {
    const instance = new Resend(process.env.RESEND_API_KEY);
    return (instance as Record<string | symbol, unknown>)[prop];
  },
});

const FROM_EMAIL = 'HandsOff <noreply@handsoff.app>';

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set, skipping email to', to);
    return null;
  }

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });

  if (error) {
    console.error('[email] Failed to send:', error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  return data;
}
