const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://shiftworker.ai';

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

export function welcomeEmail(name: string): string {
  return layout(`
    ${p(`Hey ${name} 👋`)}
    ${p(`Welcome to ShiftWorker! Your personal AI assistant awaits.`)}
    ${p(`We're setting things up for you right now. You'll get another email as soon as your assistant is ready to go.`)}
    ${button('Go to Dashboard', `${APP_URL}/dashboard`)}
  `);
}

export function assistantReadyEmail(name: string): string {
  return layout(`
    ${p(`Great news, ${name}! 🎉`)}
    ${p(`Your assistant is ready! Here's how to say hi.`)}
    ${p(`Head to your dashboard and start a conversation. Your assistant already knows the basics — just tell it what you need.`)}
    ${button('Talk to Your Assistant', `${APP_URL}/dashboard`)}
  `);
}

export function paymentFailedEmail(name: string): string {
  return layout(`
    ${p(`Hi ${name},`)}
    ${p(`We couldn't process your payment. Update your info to keep your assistant running.`)}
    ${p(`Don't worry — your assistant is still active for now, but please update your payment method soon to avoid any interruption.`)}
    ${button('Update Payment Info', `${APP_URL}/dashboard/billing`)}
  `);
}

export function subscriptionCancelledEmail(name: string): string {
  return layout(`
    ${p(`Hi ${name},`)}
    ${p(`Sorry to see you go. Your assistant will stay available for 30 more days.`)}
    ${p(`If you change your mind, you can resubscribe anytime and pick up right where you left off.`)}
    ${button('Resubscribe', `${APP_URL}/pricing`)}
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
