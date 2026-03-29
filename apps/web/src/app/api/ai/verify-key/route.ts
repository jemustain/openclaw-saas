import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { provider, apiKey } = await request.json();

  if (!provider || !apiKey) {
    return NextResponse.json({ valid: false, error: 'Provider and API key are required' });
  }

  try {
    if (provider === 'gemini') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hi' }] }],
            generationConfig: { maxOutputTokens: 1 },
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return NextResponse.json({ valid: false, error: data.error?.message || 'Invalid API key' });
      }
      return NextResponse.json({ valid: true });
    }

    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return NextResponse.json({ valid: false, error: data.error?.message || 'Invalid API key' });
      }
      return NextResponse.json({ valid: true });
    }

    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return NextResponse.json({ valid: false, error: data.error?.message || 'Invalid API key' });
      }
      return NextResponse.json({ valid: true });
    }

    if (provider === 'github-copilot') {
      const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return NextResponse.json({ valid: false, error: data.error?.message || 'Invalid token' });
      }
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json({ valid: false, error: 'Unknown provider' });
  } catch (err: any) {
    return NextResponse.json({ valid: false, error: err.message || 'Verification failed' });
  }
}
