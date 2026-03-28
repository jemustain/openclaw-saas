const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://shiftworker.ai';
const STRIPE_PORTAL_URL = `${APP_URL}/dashboard/billing`;

function layout(content: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0a1a;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#1a1128;border-radius:12px;overflow:hidden;">
<tr><td style="padding:32px 40px 24px;text-align:center;">
  <h1 style="margin:0;font-size:24px;color:#c084fc;font-weight:700;">ShiftWorker</h1>
</td></tr>
<tr><td style="padding:0 40px 40px;">
  ${content}
</td></tr>
<tr><td style="padding:24px 40px;border-top:1px solid #2d2040;text-align:center;">
  <p style="margin:0;font-size:13px;color:#6b5a7e;">© ShiftWorker — Your personal AI assistant</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function button(text: string, href: string) {
  return `<table cellpadding="0" cellspacing="0" style="margin:28px auto 0;"><tr><td style="background:#9333ea;border-radius:8px;padding:14px 32px;text-align:center;">
<a href="${href}" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;">${text}</a>
</td></tr></table>`;
}

function p(text: string) {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#d4c5e8;">${text}</p>`;
}

function tip(emoji: string, text: string) {
  return `<tr><td style="padding:8px 0;">
<span style="font-size:18px;vertical-align:middle;">${emoji}</span>
<span style="font-size:14px;color:#d4c5e8;vertical-align:middle;margin-left:8px;">${text}</span>
</td></tr>`;
}

export function welcomeEmail(name: string): string {
  return layout(`
    ${p(`Hey ${name},`)}
    ${p(`Welcome to ShiftWorker! Your personal AI assistant awaits.`)}
    ${p(`We're setting things up for you right now. You'll get another email as soon as your assistant is ready to go.`)}
    ${button('Go to Dashboard', `${APP_URL}/dashboard`)}
  `);
}

export function assistantReadyEmail(name: string, messengerLinks?: { whatsapp?: string; telegram?: string; slack?: string }): string {
  const links = messengerLinks || {};
  let connectSection = '';
  const channels: string[] = [];
  if (links.whatsapp) channels.push(`<a href="${links.whatsapp}" style="color:#c084fc;text-decoration:underline;">WhatsApp</a>`);
  if (links.telegram) channels.push(`<a href="${links.telegram}" style="color:#c084fc;text-decoration:underline;">Telegram</a>`);
  if (links.slack) channels.push(`<a href="${links.slack}" style="color:#c084fc;text-decoration:underline;">Slack</a>`);

  if (channels.length > 0) {
    connectSection = p(`<strong style="color:#e9d5ff;">Connect via:</strong> ${channels.join(' · ')}`);
  }

  return layout(`
    ${p(`Great news, ${name}!`)}
    ${p(`<strong style="color:#e9d5ff;">Your AI assistant is live and ready to go!</strong>`)}
    ${connectSection}
    ${p(`Or head straight to your dashboard to start chatting.`)}
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#251840;border-radius:8px;padding:16px 20px;margin:20px 0;">
    <tr><td colspan="2" style="padding-bottom:12px;"><strong style="color:#c084fc;font-size:14px;">Quick tips</strong></td></tr>
    ${tip('•', 'Just talk naturally — your assistant understands context')}
    ${tip('📅', 'Try "What\'s on my calendar today?" to get started')}
    ${tip('•', 'Ask it to draft emails, summarize threads, or set reminders')}
    ${tip('🔗', 'Connect more tools from your dashboard settings')}
    </table>
    ${button('Open Dashboard', `${APP_URL}/dashboard`)}
  `);
}

export function paymentFailedEmail(name: string): string {
  return layout(`
    ${p(`Hi ${name},`)}
    ${p(`⚠️ <strong style="color:#e9d5ff;">We had trouble processing your latest payment.</strong>`)}
    ${p(`Your assistant is still running for now, but please update your payment method to avoid any interruption to your service.`)}
    ${p(`You can update your card or payment details in the billing portal below.`)}
    ${button('Update Payment Method', STRIPE_PORTAL_URL)}
    ${p(`<span style="font-size:14px;color:#8b7a9e;">If you believe this is an error, check with your bank or reply to this email for help.</span>`)}
  `);
}

export function subscriptionConfirmedEmail(name: string): string {
  return layout(`
    ${p(`Welcome to Pro, ${name}!`)}
    ${p(`<strong style="color:#e9d5ff;">Your upgrade is confirmed.</strong> Here's what you've unlocked:`)}
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#251840;border-radius:8px;padding:16px 20px;margin:20px 0;">
    ${tip('♾️', '<strong style="color:#e9d5ff;">Unlimited messages</strong> — no daily caps')}
    ${tip('•', '<strong style="color:#e9d5ff;">24/7 assistant</strong> — always on, always available')}
    ${tip('•', '<strong style="color:#e9d5ff;">Priority processing</strong> — faster responses')}
    ${tip('🔌', '<strong style="color:#e9d5ff;">All integrations</strong> — connect every tool you use')}
    </table>
    ${p(`Your assistant is ready and running. Go say hi!`)}
    ${button('Go to Dashboard', `${APP_URL}/dashboard`)}
  `);
}

export function subscriptionCancelledEmail(name: string, gracePeriodDate?: string): string {
  const dateStr = gracePeriodDate
    ? new Date(gracePeriodDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '30 days from now';

  return layout(`
    ${p(`Hi ${name},`)}
    ${p(`We're sorry to see you go. Your subscription has been cancelled.`)}
    ${p(`<strong style="color:#e9d5ff;">Your assistant will remain available until ${dateStr}.</strong> After that, it will be shut down and your data archived.`)}
    ${p(`Changed your mind? You can resubscribe anytime and pick up right where you left off — your assistant and settings will be restored instantly.`)}
    ${button('Resubscribe', `${APP_URL}/pricing`)}
    ${p(`<span style="font-size:14px;color:#8b7a9e;">Thanks for giving ShiftWorker a try. We'd love to have you back.</span>`)}
  `);
}

export function usageLimitEmail(name: string): string {
  return layout(`
    ${p(`Hi ${name},`)}
    ${p(`You've hit your daily message limit. Upgrade for unlimited messages.`)}
    ${p(`Your limit resets tomorrow, but if you need more right now, upgrading takes just a few seconds.`)}
    ${button('Upgrade Now', `${APP_URL}/pricing`)}
  `);
}
