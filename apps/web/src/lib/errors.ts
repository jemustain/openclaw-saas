import { NextResponse } from 'next/server';

export const ERR = {
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'You do not have permission to access this resource.',
  NOT_FOUND: 'The requested resource was not found.',
  BAD_REQUEST: 'Invalid request. Please check your input and try again.',
  INTERNAL: 'Something went wrong. Please try again later.',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again shortly.',
  NO_ACTIVE_ASSISTANT: 'No active assistant found.',
  ASSISTANT_UNREACHABLE:
    'Could not reach your assistant. It may be starting up or offline.',
} as const;

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(err: unknown, context: string) {
  console.error(`[${context}]`, err);
  return apiError(ERR.INTERNAL, 500);
}
