import { defineConfig } from 'vitest/config';
import path from 'node:path';

const root = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      '@': root,
      'server-only': path.join(root, 'tests', 'server-only-stub.ts'),
    },
  },
  test: { include: ['tests/**/*.test.ts'] },
});
