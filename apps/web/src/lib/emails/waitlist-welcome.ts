interface WaitlistEmailProps {
  unsubscribeUrl: string;
}

export function waitlistWelcomeEmail({ unsubscribeUrl }: WaitlistEmailProps) {
  return {
    subject: "You're on the list",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to HandsOff</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #18181b; padding: 32px 40px;">
              <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">HandsOff</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 20px; font-size: 22px; font-weight: 600; color: #18181b; line-height: 1.3;">
                You're on the list.
              </h1>
              <p style="margin: 0 0 16px; font-size: 15px; color: #3f3f46; line-height: 1.65;">
                Thanks for your interest in HandsOff. We're building an AI assistant that handles the day-to-day stuff you shouldn't have to think about — email, scheduling, research, follow-ups.
              </p>
              <p style="margin: 0 0 16px; font-size: 15px; color: #3f3f46; line-height: 1.65;">
                It connects to the tools you already use and works through the messaging apps already on your phone. No new apps to install, no dashboards to learn.
              </p>
              <p style="margin: 0 0 0; font-size: 15px; color: #3f3f46; line-height: 1.65;">
                We'll reach out when spots open up. In the meantime, that's it — nothing else to do on your end.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top: 1px solid #e4e4e7; padding-top: 24px;">
                    <p style="margin: 0; font-size: 13px; color: #a1a1aa; line-height: 1.5;">
                      You received this because you signed up at claw4all-app.vercel.app.<br>
                      <a href="${unsubscribeUrl}" style="color: #a1a1aa; text-decoration: underline;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}
