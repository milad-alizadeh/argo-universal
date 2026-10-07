import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    environment: 'node',
    include: ['**/*.test.mts'],
    testTimeout: 60_000,
  },
});
