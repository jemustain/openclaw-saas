import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiError, handleApiError, ERR } from './errors';

describe('ERR constants', () => {
  it('has all expected keys', () => {
    expect(ERR.UNAUTHORIZED).toBe('Unauthorized');
    expect(ERR.FORBIDDEN).toBe('You do not have permission to access this resource.');
    expect(ERR.NOT_FOUND).toBe('The requested resource was not found.');
    expect(ERR.BAD_REQUEST).toBe('Invalid request. Please check your input and try again.');
    expect(ERR.INTERNAL).toBe('Something went wrong. Please try again later.');
    expect(ERR.SERVICE_UNAVAILABLE).toBe('Service temporarily unavailable. Please try again shortly.');
    expect(ERR.NO_ACTIVE_ASSISTANT).toBe('No active assistant found.');
    expect(ERR.ASSISTANT_UNREACHABLE).toBe('Could not reach your assistant. It may be starting up or offline.');
  });
  it('has at least 8 constants', () => {
    expect(Object.keys(ERR).length).toBeGreaterThanOrEqual(8);
  });
});

describe('apiError', () => {
  it('returns a Response with the correct status', () => {
    expect(apiError('Not found', 404).status).toBe(404);
  });
  it('returns JSON with { error: message } shape', async () => {
    const body = await apiError('Bad request', 400).json();
    expect(body).toEqual({ error: 'Bad request' });
  });
  it('works with status 401', async () => {
    const res = apiError(ERR.UNAUTHORIZED, 401);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });
  it('works with status 500', async () => {
    const res = apiError(ERR.INTERNAL, 500);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe(ERR.INTERNAL);
  });
  it('works with status 503', async () => {
    expect(apiError(ERR.SERVICE_UNAVAILABLE, 503).status).toBe(503);
  });
  it('handles empty string message', async () => {
    const res = apiError('', 400);
    expect(await res.json()).toEqual({ error: '' });
    expect(res.status).toBe(400);
  });
  it('handles very long message', async () => {
    const longMsg = 'x'.repeat(10_000);
    const body = await apiError(longMsg, 422).json();
    expect(body.error).toHaveLength(10_000);
  });
  it('returns proper content-type header', () => {
    expect(apiError('test', 400).headers.get('content-type')).toContain('application/json');
  });
});

describe('handleApiError', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { consoleSpy.mockRestore(); });

  it('returns a 500 response with generic message', async () => {
    const res = handleApiError(new Error('db connection failed'), 'test/route');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: ERR.INTERNAL });
    expect(body.error).not.toContain('db connection');
  });
  it('logs the error with context prefix', () => {
    handleApiError(new Error('secret info'), 'my/context');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0][0]).toBe('[my/context]');
    expect(consoleSpy.mock.calls[0][1]).toBeInstanceOf(Error);
  });
  it('handles string errors', async () => {
    const body = await handleApiError('raw string error', 'ctx').json();
    expect(body.error).toBe(ERR.INTERNAL);
    expect(consoleSpy).toHaveBeenCalledWith('[ctx]', 'raw string error');
  });
  it('handles null/undefined errors', async () => {
    expect(handleApiError(null, 'c1').status).toBe(500);
    expect(handleApiError(undefined, 'c2').status).toBe(500);
  });
  it('handles object errors without message property', async () => {
    const body = await handleApiError({ code: 'ECONNREFUSED' }, 'ctx').json();
    expect(body.error).toBe(ERR.INTERNAL);
  });
  it('handles numeric errors', () => {
    handleApiError(42, 'ctx');
    expect(consoleSpy).toHaveBeenCalledWith('[ctx]', 42);
  });
  it('never leaks Error.stack to client', async () => {
    const err = new Error('sensitive stack');
    err.stack = 'Error: sensitive stack\n    at /app/secret/path.ts:42:7';
    const body = await handleApiError(err, 'ctx').json();
    expect(JSON.stringify(body)).not.toContain('secret/path');
    expect(JSON.stringify(body)).not.toContain('sensitive stack');
  });
});
