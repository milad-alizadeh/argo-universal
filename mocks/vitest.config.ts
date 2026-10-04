import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    environment: 'node',
    include: ['agent/**/*.test.ts', 'cli/**/*.test.ts'],
  },
});
