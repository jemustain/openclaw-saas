import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/env.ts',
        'src/lib/errors.ts',
        'src/lib/waitlist-token.ts',
        'src/lib/admin/**/*.ts',
        'src/lib/auth/session.ts',
        'src/lib/billing/**/*.ts',
        'src/lib/email/**/*.ts',
        'src/lib/emails/**/*.ts',
        'src/lib/stripe/**/*.ts',
        'src/lib/supabase/client.ts',
        'src/lib/supabase/server.ts',
        'src/lib/vm/free-plan-limits.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
      ],
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
