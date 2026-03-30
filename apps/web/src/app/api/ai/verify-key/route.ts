import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { apiError, ERR } from '@/lib/errors';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return apiError(ERR.UNAUTHORIZED, 401);
  }

  const { provider, apiKey } = await request.json();

  if (!provider || !apiKey) {
    return NextResponse.json({ valid: false, error: 'Provider and API key are required.' });
  }

  try {
    if (provider === 'gemini') {
      // Use gemini-2.5-flash - available on free tier (2.0-flash may not be)
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
        const status = res.status;
        if (status === 429) {
          return NextResponse.json({ valid: false, error: 'API key is valid but rate limited. Try again in a moment.' });
        }
        return NextResponse.json({ valid: false, error: 'Invalid API key.' });
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
        return NextResponse.json({ valid: false, error: 'Invalid API key.' });
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
        return NextResponse.json({ valid: false, error: 'Invalid API key.' });
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
        return NextResponse.json({ valid: false, error: 'Invalid token.' });
      }
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json({ valid: false, error: 'Unknown provider.' });
  } catch {
    return NextResponse.json({ valid: false, error: 'Verification failed. Please try again.' });
  }
}
