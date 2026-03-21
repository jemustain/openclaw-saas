export async function generateToken(email: string): Promise<string> {
  const secret = process.env.WAITLIST_UNSUBSCRIBE_SECRET || 'handsoff-waitlist-default-secret';
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(email));
  const base64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return base64.slice(0, 16).replace(/[+/=]/g, 'x');
}
