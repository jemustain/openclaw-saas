/**
 * VM scheduler helpers for managing DigitalOcean droplet power state
 * based on free-tier users' daily 8-hour windows.
 */

const WINDOW_HOURS = 8;

/**
 * Check if the current time falls within a user's active window.
 * Window runs from windowStart to windowStart + 8 hours (wraps past midnight).
 */
export function isInWindow(windowStart: number, timezone: string): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  });
  const currentHour = parseInt(formatter.format(now), 10);

  const windowEnd = (windowStart + WINDOW_HOURS) % 24;

  if (windowEnd > windowStart) {
    // Window doesn't wrap midnight: e.g. 9-17
    return currentHour >= windowStart && currentHour < windowEnd;
  } else {
    // Window wraps midnight: e.g. 20-04
    return currentHour >= windowStart || currentHour < windowEnd;
  }
}

/**
 * Power on a DigitalOcean droplet.
 */
export async function powerOnDroplet(dropletId: string, token: string): Promise<void> {
  const res = await fetch(
    `https://api.digitalocean.com/v2/droplets/${dropletId}/actions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type: 'power_on' }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to power on droplet ${dropletId}: ${res.status} ${body}`);
  }
}

/**
 * Power off a DigitalOcean droplet.
 */
export async function powerOffDroplet(dropletId: string, token: string): Promise<void> {
  const res = await fetch(
    `https://api.digitalocean.com/v2/droplets/${dropletId}/actions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type: 'power_off' }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to power off droplet ${dropletId}: ${res.status} ${body}`);
  }
}
