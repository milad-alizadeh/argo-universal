import { defineProject } from 'vitest/config';

// Plain Vitest runs non-UI code only; screens are tested with play functions in @repo/client.
export default defineProject({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
