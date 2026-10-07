import { nodeTest } from '@repo/vitest/node';
import { defineProject } from 'vitest/config';

// Plain Vitest runs non-UI code only; components are tested with play functions.
export default defineProject({
  test: {
    ...nodeTest,
    include: ['src/**/*.test.ts', 'mocks/**/*.test.ts'],
  },
});
